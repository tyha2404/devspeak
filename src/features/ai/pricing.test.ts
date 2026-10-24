import { describe, expect, it } from "vitest";
import { costMicros } from "./pricing";

describe("costMicros", () => {
  it("prices tokens per model with the batch discount", () => {
    // 1M in + 1M out on Sonnet 5.5 = $12 → $6 batched
    expect(costMicros("claude-sonnet-5-5", { input_tokens: 1e6, output_tokens: 1e6 })).toBe(
      12_000_000,
    );
    expect(
      costMicros("claude-sonnet-5-5", { input_tokens: 1e6, output_tokens: 1e6 }, { batch: true }),
    ).toBe(6_000_000);
    expect(
      costMicros("claude-haiku-5-5", {
        input_tokens: 2000,
        output_tokens: 300,
        cache_read_input_tokens: 1000,
      }),
    ).toBe(360);
  });
});
