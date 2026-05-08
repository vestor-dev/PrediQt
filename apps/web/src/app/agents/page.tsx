import { Contract } from 'ethers';
import { ABIS } from '@prediqt/shared';
import { Nav } from '@/components/nav';
import { Footer } from '@/components/footer';
import { AgentsClient } from './agents-client';
import { getServerProvider, getAddress, getDeployerWallet } from '@/lib/server-contracts';
import { getAgentStats, getRecentActivity, type ActivityRecord } from '@/lib/agent-activity';
import { ensureBackfilled } from '@/lib/agent-backfill';

export const dynamic = 'force-dynamic';

export interface AgentRow {
  id: string;
  name: string;
  persona: string;
  wallet: string;
  active: boolean;
  hasKey: boolean;
  totalBets: number;
  totalWagered: number;
  lastBet: number | null;
}

export interface AgentsStatus {
  agents: AgentRow[];
  oracleOwner: string;
  agentOperator: string;
  operatorIsOracleOwner: boolean;
  openAiConfigured: boolean;
  recent: ActivityRecord[];
}

async function fetchStatus(): Promise<AgentsStatus> {
  // Reconcile on-chain BetPlaced events into the activity log on first load.
  await ensureBackfilled();

  const provider = getServerProvider();
  const registry = new Contract(getAddress('AgentRegistry'), ABIS.AgentRegistry as any, provider);
  const oracle = new Contract(getAddress('ResolutionOracle'), ABIS.ResolutionOracle as any, provider);

  const ids: bigint[] = await registry.getAllAgentIds();
  const agents: AgentRow[] = [];
  for (const id of ids) {
    const a = await registry.getAgent(id);
    const stats = getAgentStats(a.name);
    agents.push({
      id: a.id.toString(),
      name: a.name,
      persona: a.persona,
      wallet: a.wallet,
      active: a.active,
      hasKey: !!process.env[`AGENT_KEY_${a.name.toUpperCase()}`],
      totalBets: stats.totalBets,
      totalWagered: stats.totalWagered,
      lastBet: stats.lastBet,
    });
  }

  const oracleOwner: string = await oracle.owner();
  let operator = '';
  try { operator = getDeployerWallet().address; } catch { /* missing */ }

  return {
    agents,
    oracleOwner,
    agentOperator: operator,
    operatorIsOracleOwner: operator !== '' && oracleOwner.toLowerCase() === operator.toLowerCase(),
    openAiConfigured: !!process.env.OPENAI_API_KEY,
    recent: getRecentActivity(40),
  };
}

export default async function AgentsPage() {
  const status = await fetchStatus();
  return (
    <main className="relative min-h-screen flex flex-col">
      <Nav />
      <AgentsClient status={status} />
      <Footer />
    </main>
  );
}
