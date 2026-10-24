import { describe, expect, it } from "vitest";
import { newWordCount, selectWords, type Candidate } from "./selectWords";

const pool: Candidate[] = Array.from({ length: 40 }, (_, i) => ({
  senseId: i + 1,
  topic: ["git", "agile", "testing", "small-talk", "hr"][i % 5]!,
  cefr: ["A2", "B1", "B2"][i % 3]!,
  isIt: i % 2 === 0,
  rank: 100 + i * 50,
}));

describe("selectWords", () => {
  it("is deterministic per seed and returns the requested count", () => {
    const a = selectWords({ candidates: pool, userLevel: "A2", seed: "u1:2026-10-24", count: 5 });
    const b = selectWords({ candidates: pool, userLevel: "A2", seed: "u1:2026-10-24", count: 5 });
    expect(a).toEqual(b);
    expect(a).toHaveLength(5);
    expect(new Set(a).size).toBe(5);
  });

  it("mixes IT terms, caps topics at 2 and allows one stretch word", () => {
    const ids = selectWords({ candidates: pool, userLevel: "A2", seed: "x", count: 5 });
    const chosen = pool.filter((c) => ids.includes(c.senseId));
    expect(chosen.filter((c) => c.isIt).length).toBeGreaterThanOrEqual(3);
    const perTopic = new Map<string, number>();
    chosen.forEach((c) => perTopic.set(c.topic, (perTopic.get(c.topic) ?? 0) + 1));
    expect(Math.max(...perTopic.values())).toBeLessThanOrEqual(2);
    expect(chosen.filter((c) => c.cefr === "B2").length).toBe(0); // B2 is two above A2
    expect(chosen.filter((c) => c.cefr === "B1").length).toBeLessThanOrEqual(1);
  });

  it("backs off new words when reviews pile up", () => {
    expect([10, 70, 200].map(newWordCount)).toEqual([5, 3, 0]);
  });
});
