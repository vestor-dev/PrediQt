/**
 * OpenAI-backed decision functions for the agent tick.
 *
 * - decideBet:  given a market and an agent persona, return a bet plan or skip.
 * - resolveOutcome: given a question + brief context, return YES / NO / UNCLEAR.
 *
 * Models default to gpt-4o-mini (~$0.15/1M input, ~$0.60/1M output) — these
 * are tiny prompts so a full tick costs sub-cent.
 */
import 'server-only';
import OpenAI from 'openai';

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (_client) return _client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY');
  _client = new OpenAI({ apiKey });
  return _client;
}

export interface MarketContext {
  question: string;
  yesPrice: number;       // 0-100
  totalDeposited: bigint; // 6-decimal PREDQ
  totalBettors: number;
  minutesUntilDeadline: number;
}

export interface BetDecision {
  side: 'yes' | 'no';
  amount: number; // PREDQ (whole units, will be multiplied by 1e6)
  reason: string;
}

/** Returns null when the agent decides to skip this market. */
export async function decideBet(
  agentName: string,
  persona: string,
  market: MarketContext,
): Promise<BetDecision | null> {
  const client = getClient();

  const prompt = `You are ${agentName}, an AI prediction-market trader.

Persona: ${persona}

Current market:
  Question: "${market.question}"
  YES price: ${market.yesPrice.toFixed(1)}%
  NO price: ${(100 - market.yesPrice).toFixed(1)}%
  Pool size: ${(Number(market.totalDeposited) / 1_000_000).toFixed(0)} PREDQ
  Bettors: ${market.totalBettors}
  Minutes until deadline: ${market.minutesUntilDeadline}

Decide whether to bet on this market right now, true to your persona.
You have a limited PREDQ balance — bet small (1-100 PREDQ).
Respond with strict JSON only:
  { "action": "skip" }                                       — if you don't want to bet
  { "action": "bet", "side": "yes" | "no", "amount": <1-100>, "reason": "<one short sentence>" }`;

  const completion = await client.chat.completions.create({
    model: MODEL,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'You output only strict JSON.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? '';
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn(`[${agentName}] non-JSON response:`, raw);
    return null;
  }

  if (parsed.action !== 'bet') return null;
  if (parsed.side !== 'yes' && parsed.side !== 'no') return null;

  let amount = Math.floor(Number(parsed.amount));
  if (!Number.isFinite(amount) || amount < 1) return null;
  amount = Math.min(amount, 100);

  return { side: parsed.side, amount, reason: String(parsed.reason ?? '') };
}

export type ResolutionVerdict = 'yes' | 'no' | 'unclear';

export async function resolveOutcome(question: string): Promise<ResolutionVerdict> {
  const client = getClient();

  const prompt = `You are a prediction-market resolver. Given a binary YES/NO question that has reached its deadline, decide the outcome based on what is reasonably knowable.

Question: "${question}"

Respond with strict JSON only:
  { "outcome": "yes" | "no" | "unclear", "reason": "<one sentence>" }

Use "unclear" only when the question is ambiguous, hypothetical with no resolvable fact, or refers to events you cannot reasonably evaluate.`;

  const completion = await client.chat.completions.create({
    model: MODEL,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'You output only strict JSON.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.2,
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? '';
  try {
    const parsed = JSON.parse(raw);
    if (parsed.outcome === 'yes' || parsed.outcome === 'no') return parsed.outcome;
    return 'unclear';
  } catch {
    return 'unclear';
  }
}
