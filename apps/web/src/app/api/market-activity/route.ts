import { NextRequest, NextResponse } from 'next/server';
import { Contract } from 'ethers';
import { ABIS } from '@prediqt/shared';
import { getActivityForMarket } from '@/lib/agent-activity';
import { ensureBackfilled } from '@/lib/agent-backfill';
import { readContract, getServerProvider } from '@/lib/server-contracts';

export const runtime = 'nodejs';

interface AgentPosition {
  agent: string;
  wallet: string;
  side: 'yes' | 'no' | null;
  shares: string;     // formatted PREDQ
  amount: number;     // wagered
  reason: string;
  timestamp: number;
  txHash?: string;
}

export async function GET(req: NextRequest) {
  await ensureBackfilled();
  const url = new URL(req.url);
  const market = url.searchParams.get('address');
  if (!market) return NextResponse.json({ error: 'address required' }, { status: 400 });

  try {
    const registry = readContract('AgentRegistry');
    const provider = getServerProvider();
    const agents: { id: bigint; name: string; persona: string; wallet: string; active: boolean }[] =
      await registry.getActiveAgents();

    const activity = getActivityForMarket(market);

    const mc = new Contract(market, ABIS.ForecastMarket as any, provider);
    const positions: AgentPosition[] = await Promise.all(
      agents.map(async (a) => {
        const [yes, no] = await Promise.all([
          mc.yesShares(a.wallet),
          mc.noShares(a.wallet),
        ]);
        const yesN = BigInt(yes);
        const noN = BigInt(no);
        const side: 'yes' | 'no' | null = yesN > 0n ? 'yes' : noN > 0n ? 'no' : null;
        const shares = side === 'yes' ? yesN : noN;

        // Match to the most recent bet record for this agent on this market
        const lastBet = activity.find(
          (r) => r.kind === 'bet' && r.agent === a.name,
        );

        return {
          agent: a.name,
          wallet: a.wallet,
          side,
          shares: side ? (Number(shares) / 1_000_000).toFixed(1) : '0',
          amount: lastBet && lastBet.kind === 'bet' ? lastBet.amount : 0,
          reason: lastBet && lastBet.kind === 'bet' ? lastBet.reason : '',
          timestamp: lastBet?.timestamp ?? 0,
          txHash: lastBet && lastBet.kind === 'bet' ? lastBet.txHash : undefined,
        };
      }),
    );

    return NextResponse.json({ positions });
  } catch (e: any) {
    console.error('[market-activity]', e);
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
