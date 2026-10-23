import { describe, expect, it } from "vitest";
import {
  LEVEL_THRESHOLDS,
  MAX_LEVEL,
  eligibleRank,
  levelForXp,
  levelProgress,
} from "./progression";

describe("progression", () => {
  it("matches the rank boundaries in the plan", () => {
    expect(MAX_LEVEL).toBe(40);
    expect(LEVEL_THRESHOLDS[5]).toBe(1250); // Junior L6
    expect(LEVEL_THRESHOLDS[12]).toBe(5100); // Mid L13
    expect(LEVEL_THRESHOLDS[20]).toBe(11500); // Senior L21
    expect(LEVEL_THRESHOLDS[30]).toBe(21500); // Tech Lead L31
  });

  it("is strictly increasing", () => {
    for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
      expect(LEVEL_THRESHOLDS[i]!).toBeGreaterThan(LEVEL_THRESHOLDS[i - 1]!);
    }
  });

  it("computes level and progress", () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(149)).toBe(1);
    expect(levelForXp(160)).toBe(2);
    expect(levelProgress(160)).toEqual({ level: 2, current: 10, needed: 200 });
    expect(levelProgress(10_000_000).needed).toBeNull();
  });

  it("maps levels to eligible ranks", () => {
    expect(eligibleRank(5)).toBe("intern");
    expect(eligibleRank(6)).toBe("junior");
    expect(eligibleRank(31)).toBe("techlead");
  });
});
