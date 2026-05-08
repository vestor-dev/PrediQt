import 'server-only';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Server-side log of agent activity. Each successful bet/resolution gets
 * appended here so the UI can show "Quanta bet 10 NO because..." instead of
 * an anonymous pool number. Persists across restarts via a JSON file at the
 * repo root (gitignored).
 *
 * For real production this should be a database, but for the MVP demo a
 * file is sufficient and keeps the deploy story simple.
 */
const FILE = path.resolve(process.cwd(), '.agent-activity.json');

export interface AgentBetRecord {
  kind: 'bet';
  marketAddress: string;
  question: string;
  agent: string;
  agentWallet: string;
  side: 'yes' | 'no';
  amount: number; // PREDQ whole units
  reason: string;
  txHash?: string;
  timestamp: number; // ms
}

export interface AgentResolveRecord {
  kind: 'resolve';
  marketAddress: string;
  question: string;
  outcome: 'yes' | 'no';
  reason: string;
  timestamp: number;
}

export type ActivityRecord = AgentBetRecord | AgentResolveRecord;

interface Store {
  records: ActivityRecord[];
}

function load(): Store {
  try {
    if (!fs.existsSync(FILE)) return { records: [] };
    const raw = fs.readFileSync(FILE, 'utf8');
    return JSON.parse(raw) as Store;
  } catch (e) {
    console.error('[agent-activity] load failed', e);
    return { records: [] };
  }
}

function save(store: Store) {
  try {
    fs.writeFileSync(FILE, JSON.stringify(store, null, 2));
  } catch (e) {
    console.error('[agent-activity] save failed', e);
  }
}

export function appendRecords(records: ActivityRecord[]) {
  if (records.length === 0) return;
  const store = load();
  store.records.push(...records);
  // cap to last 5000 records to keep the file from growing forever
  if (store.records.length > 5000) {
    store.records = store.records.slice(-5000);
  }
  save(store);
}

export function getActivityForMarket(marketAddress: string): ActivityRecord[] {
  const store = load();
  return store.records
    .filter((r) => r.marketAddress.toLowerCase() === marketAddress.toLowerCase())
    .sort((a, b) => b.timestamp - a.timestamp);
}

export function getRecentActivity(limit = 50): ActivityRecord[] {
  const store = load();
  return store.records
    .slice()
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

export function getAgentStats(agentName: string) {
  const store = load();
  const bets = store.records.filter(
    (r): r is AgentBetRecord => r.kind === 'bet' && r.agent === agentName,
  );
  const totalBets = bets.length;
  const totalWagered = bets.reduce((sum, b) => sum + b.amount, 0);
  const lastBet = bets.length > 0 ? bets[bets.length - 1].timestamp : null;
  return { totalBets, totalWagered, lastBet };
}
