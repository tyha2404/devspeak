// USD per million tokens. Check https://platform.claude.com/docs/en/about-claude/pricing before budgeting;
// values cached 2026-10-06. Cache writes (5 min TTL) cost 1.25x input.
const RATES: Record<string, { input: number; output: number; cacheRead: number }> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01 },
};

export interface UsageLike {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}

/** Cost in micro-dollars (1e-6 USD) so it can be summed exactly in Postgres. */
export function costMicros(model: string, usage: UsageLike, opts: { batch?: boolean } = {}) {
  const r = RATES[model] ?? RATES["claude-opus-5-5"]!;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  const usd =
    (usage.input_tokens * r.input +
      usage.output_tokens * r.output +
      cacheRead * r.cacheRead +
      cacheWrite * r.input * 1.25) /
    1_000_000;
  return Math.round(usd * (opts.batch ? 0.5 : 1) * 1_000_000);
}
