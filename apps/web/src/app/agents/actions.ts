'use server';

import { runAgentTick, type TickReport } from '@/lib/agent-tick';

export type TickActionResult =
  | { ok: true; report: TickReport }
  | { ok: false; error: string };

export async function tickAction(): Promise<TickActionResult> {
  try {
    const report = await runAgentTick();
    return { ok: true, report };
  } catch (e: any) {
    console.error('[tickAction]', e);
    return { ok: false, error: e?.shortMessage ?? e?.message ?? String(e) };
  }
}
