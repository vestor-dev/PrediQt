import 'server-only';
import { Contract } from 'ethers';
import { ABIS } from '@prediqt/shared';
import {
  AGENT_NAMES,
  getAgentWallet,
  getDeployerWallet,
  getServerProvider,
  readContract,
} from './server-contracts';
import { decideBet, resolveOutcome, type MarketContext } from './agent-llm';
import { appendRecords, type ActivityRecord } from './agent-activity';

export interface TickReport {
  resolved: { market: string; question: string; outcome: 'yes' | 'no' }[];
  resolveSkipped: { market: string; question: string; reason: string }[];
  bets: {
    agent: string;
    market: string;
    question: string;
    side: 'yes' | 'no';
    amount: number;
    reason: string;
    txHash?: string;
    error?: string;
  }[];
  skipped: { agent: string; market: string; question: string; reason: string }[];
  ms: number;
}

/**
 * Run one full agent tick — see /api/agent-tick for the public-facing
 * version with bearer auth.
 */
export async function runAgentTick(): Promise<TickReport> {
  const t0 = Date.now();
  const activityRecords: ActivityRecord[] = [];

  const factory = readContract('MarketFactory');
  const oracle = readContract('ResolutionOracle');
  const registry = readContract('AgentRegistry');

  // Clone the Result returned by ethers — it's frozen, and getMarketsBatch
  // mutates its args internally during ABI encoding, which throws otherwise.
  const ids: bigint[] = Array.from(await factory.getAllMarketIds()).map((x: any) => BigInt(x));
  const metas: any[] = ids.length > 0 ? Array.from(await factory.getMarketsBatch(ids)) : [];

  const provider = getServerProvider();
  const now = Math.floor(Date.now() / 1000);

  // Parallelize all info() calls — sequential reads time out on large rosters.
  const allMarkets = await Promise.all(
    metas
      .filter((m: any) => m.exists)
      .map(async (meta: any) => {
        const market = new Contract(meta.market, ABIS.ForecastMarket as any, provider);
        const info = await market.info();
        return { meta, info };
      }),
  );

  const expired: { meta: any; info: any }[] = [];
  const open: { meta: any; info: any }[] = [];
  for (const m of allMarkets) {
    if (Number(m.info._status) !== 0) continue;
    if (Number(m.info._resolveAt) <= now) expired.push(m);
    else open.push(m);
  }

  const report: TickReport = {
    resolved: [],
    resolveSkipped: [],
    bets: [],
    skipped: [],
    ms: 0,
  };

  // ────────── RESOLUTION ──────────
  if (expired.length > 0) {
    const oracleOwner = (await oracle.owner()) as string;
    const deployer = getDeployerWallet();
    if (oracleOwner.toLowerCase() !== deployer.address.toLowerCase()) {
      for (const e of expired) {
        report.resolveSkipped.push({
          market: e.meta.market,
          question: e.meta.question,
          reason: 'oracle owner is not the agent operator',
        });
      }
    } else {
      const markets: string[] = [];
      const outcomes: boolean[] = [];
      for (const e of expired) {
        const verdict = await resolveOutcome(e.meta.question);
        if (verdict === 'unclear') {
          report.resolveSkipped.push({
            market: e.meta.market,
            question: e.meta.question,
            reason: 'AI verdict: unclear',
          });
          continue;
        }
        markets.push(e.meta.market);
        outcomes.push(verdict === 'yes');
        report.resolved.push({
          market: e.meta.market,
          question: e.meta.question,
          outcome: verdict,
        });
        activityRecords.push({
          kind: 'resolve',
          marketAddress: e.meta.market,
          question: e.meta.question,
          outcome: verdict,
          reason: 'AI verdict',
          timestamp: Date.now(),
        });
      }
      if (markets.length > 0) {
        const oracleSigned = oracle.connect(deployer) as any;
        const tx = await oracleSigned.resolveBatch(markets, outcomes, {
          gasLimit: 250_000n + 200_000n * BigInt(markets.length),
        });
        await tx.wait();
      }
    }
  }

  // ────────── BETTING ──────────
  if (open.length > 0) {
    const activeAgents: { id: bigint; name: string; persona: string; wallet: string }[] =
      await registry.getActiveAgents();
    const usable = activeAgents.filter((a) =>
      AGENT_NAMES.includes(a.name as any) && process.env[`AGENT_KEY_${a.name.toUpperCase()}`],
    );

    // Pre-fetch every (agent, market) position in one parallel pass so we
    // can skip already-bet markets without N×M sequential RPC roundtrips.
    const positions = await Promise.all(
      usable.flatMap((agent) => {
        const agentWallet = getAgentWallet(agent.name as any);
        return open.map(async (m) => {
          const market = new Contract(m.meta.market, ABIS.ForecastMarket as any, provider);
          const [yes, no] = await Promise.all([
            market.yesShares(agentWallet.address),
            market.noShares(agentWallet.address),
          ]);
          return { agent, m, yes: BigInt(yes), no: BigInt(no), agentWallet };
        });
      }),
    );

    // Sequential through (agent, market) pairs so we don't fire 9 LLM calls
    // and 9 txs at once — that hits OpenAI rate limits and nonce conflicts.
    for (const p of positions) {
      const { agent, m, yes, no, agentWallet } = p;
      if (yes > 0n || no > 0n) {
        report.skipped.push({
          agent: agent.name,
          market: m.meta.market,
          question: m.meta.question,
          reason: 'already has a position',
        });
        continue;
      }

      const ctx: MarketContext = {
        question: m.meta.question,
        yesPrice: Number(m.info._yesPrice),
        totalDeposited: BigInt(m.info._totalDeposited),
        totalBettors: Number(m.info._totalBettors),
        minutesUntilDeadline: Math.max(
          0,
          Math.floor((Number(m.info._resolveAt) - now) / 60),
        ),
      };

      const decision = await decideBet(agent.name, agent.persona, ctx);
      if (!decision) {
        report.skipped.push({
          agent: agent.name,
          market: m.meta.market,
          question: m.meta.question,
          reason: 'agent skipped',
        });
        continue;
      }

      try {
        const market = new Contract(m.meta.market, ABIS.ForecastMarket as any, provider);
        const marketSigned = market.connect(agentWallet) as any;
        const tx = await marketSigned.bet(
          decision.side === 'yes',
          BigInt(decision.amount * 1_000_000),
          { gasLimit: 1_500_000 },
        );
        const receipt = await tx.wait();
        report.bets.push({
          agent: agent.name,
          market: m.meta.market,
          question: m.meta.question,
          side: decision.side,
          amount: decision.amount,
          reason: decision.reason,
          txHash: receipt?.hash,
        });
      } catch (e: any) {
        report.bets.push({
          agent: agent.name,
          market: m.meta.market,
          question: m.meta.question,
          side: decision.side,
          amount: decision.amount,
          reason: decision.reason,
          error: e?.shortMessage ?? e?.message ?? String(e),
        });
      }
    }
  }

  if (activityRecords.length > 0) {
    appendRecords(activityRecords);
  }

  report.ms = Date.now() - t0;
  return report;
}
