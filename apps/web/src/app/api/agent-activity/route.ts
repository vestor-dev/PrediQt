import { NextRequest, NextResponse } from 'next/server';
import { getRecentActivity, getAgentStats } from '@/lib/agent-activity';
import { ensureBackfilled } from '@/lib/agent-backfill';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  await ensureBackfilled();
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get('limit') ?? '50');

  const recent = getRecentActivity(limit);
  const stats: Record<string, ReturnType<typeof getAgentStats>> = {};
  for (const r of recent) {
    if (r.kind === 'bet' && !stats[r.agent]) {
      stats[r.agent] = getAgentStats(r.agent);
    }
  }
  // Also pull stats for the canonical 3 even if they have no recent activity
  for (const name of ['Quanta', 'Hawk', 'Doubt']) {
    if (!stats[name]) stats[name] = getAgentStats(name);
  }

  return NextResponse.json({ recent, stats });
}
