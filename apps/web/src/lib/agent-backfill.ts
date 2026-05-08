import 'server-only';
import { Contract, JsonRpcProvider, Network } from 'ethers';
import { ABIS } from '@prediqt/shared';
import { readContract, getServerProvider } from './server-contracts';
import { appendRecords, getRecentActivity, type ActivityRecord } from './agent-activity';

// Public Sepolia RPC that allows wide eth_getLogs ranges. Alchemy free tier
// caps at 10 blocks which is useless for backfill. We only use this for the
// one-shot scan; the rest of the app stays on the configured RPC.
const LOG_RPC = 'https://ethereum-sepolia-rpc.publicnode.com';
const SEPOLIA = new Network('sepolia', 11155111);

/**
 * One-shot reconciliation: scan every market's BetPlaced events for any
 * tx that originated from a known agent wallet, and seed the activity log
 * if not already present. Reasoning is empty for backfilled records (the
 * GPT explanation isn't on-chain).
 *
 * Memoized to one promise per server lifetime — concurrent callers share
 * the same scan.
 */
let _done = false;
let _inflight: Promise<void> | null = null;

export function ensureBackfilled(): Promise<void> {
  if (_done) return Promise.resolve();
  if (_inflight) return _inflight;
  _inflight = (async () => {
    try {
      // If the log already has any bet records, assume we're caught up.
      const existing = getRecentActivity(1);
      if (existing.length > 0) { _done = true; return; }

      const registry = readContract('AgentRegistry');
      const factory = readContract('MarketFactory');
      const primary = getServerProvider();

      const agents: any[] = await registry.getActiveAgents();
      const byWallet = new Map<string, string>();
      for (const a of agents) byWallet.set(String(a.wallet).toLowerCase(), a.name);
      if (byWallet.size === 0) { _done = true; return; }

      const ids: bigint[] = Array.from(await factory.getAllMarketIds()).map((x: any) => BigInt(x));
      const metas: any[] = ids.length > 0 ? Array.from(await factory.getMarketsBatch(ids)) : [];

      // Find a public RPC that accepts wide eth_getLogs ranges.
      const logProvider = await pickLogProvider();
      if (!logProvider) {
        console.warn('[agent-backfill] no log-capable RPC available, skipping');
        _done = true;
        return;
      }

      // publicnode caps eth_getLogs at 50000 blocks. Markets were deployed in
      // the last few days so a 50000-block window from `latest` covers them.
      const latestBlock = await logProvider.getBlockNumber();
      const fromBlock = Math.max(0, latestBlock - 49000);

      const records: ActivityRecord[] = [];
      for (const meta of metas) {
        if (!meta.exists) continue;
        const market = new Contract(meta.market, ABIS.ForecastMarket as any, logProvider);
        let events: any[] = [];
        try {
          events = await market.queryFilter(market.filters.BetPlaced(), fromBlock, latestBlock);
        } catch (e: any) {
          const inner = e?.error?.message ?? e?.info?.responseBody ?? e?.shortMessage ?? e?.message;
          console.warn(`[agent-backfill] queryFilter failed for ${meta.market}: ${inner}`);
          continue;
        }
        for (const ev of events) {
          if (!('args' in ev) || !ev.args) continue;
          const bettor = String(ev.args[0]).toLowerCase();
          const agentName = byWallet.get(bettor);
          if (!agentName) continue;
          let ts = 0;
          try { ts = (await logProvider.getBlock(ev.blockNumber))?.timestamp ?? 0; } catch {}
          records.push({
            kind: 'bet',
            marketAddress: meta.market,
            question: meta.question,
            agent: agentName,
            agentWallet: String(ev.args[0]),
            side: ev.args[1] ? 'yes' : 'no',
            amount: Math.round(Number(ev.args[2]) / 1_000_000),
            reason: '',
            txHash: ev.transactionHash,
            timestamp: ts * 1000,
          });
        }
      }

      records.sort((a, b) => a.timestamp - b.timestamp);
      if (records.length > 0) {
        appendRecords(records);
        console.log(`[agent-backfill] seeded ${records.length} historical records`);
        _done = true;
      } else {
        // No records yet — leave _done false so we'll retry on the next call
        // (e.g., once a log-capable RPC comes back online).
      }
    } catch (e) {
      console.error('[agent-backfill] failed', e);
      // Don't latch _done on error — let the next call retry.
    } finally {
      _inflight = null;
    }
  })();
  return _inflight;
}

async function pickLogProvider(): Promise<JsonRpcProvider | null> {
  try {
    // staticNetwork avoids the eternal "failed to detect network" retry loop
    // when the RPC is slow or returns an unexpected payload during chainId probe.
    const p = new JsonRpcProvider(LOG_RPC, SEPOLIA, { staticNetwork: true });
    await p.getBlockNumber();
    return p;
  } catch (e) {
    console.warn('[agent-backfill] log provider unreachable', e);
    return null;
  }
}
