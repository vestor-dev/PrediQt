import { NextRequest, NextResponse } from 'next/server';
import { runAgentTick } from '@/lib/agent-tick';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function handler(req: NextRequest) {
  const secret = process.env.AGENT_TICK_SECRET;
  const auth = req.headers.get('authorization');
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const report = await runAgentTick();
    return NextResponse.json(report);
  } catch (e: any) {
    console.error('[agent-tick]', e);
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}

export const GET = handler;
export const POST = handler;
