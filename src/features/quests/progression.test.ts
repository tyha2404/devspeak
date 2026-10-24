import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, dailyQuestsFor, weekKey, type Stats } from "./progression";

describe("quests", () => {
  it('computes ISO week keys exactly like Postgres to_char(IYYY-"W"IW)', () => {
    expect(weekKey("2026-10-24")).toBe("2026-W43");
    expect(weekKey("2027-01-01")).toBe("2026-W53");
    expect(weekKey("2026-12-28")).toBe("2026-W53");
    expect(weekKey("2025-12-29")).toBe("2026-W01");
  });

  it("gives three deterministic tickets: vocab, an NPC talk, a skill", () => {
    const a = dailyQuestsFor("u1", "2026-10-24", false);
    expect(a).toEqual(dailyQuestsFor("u1", "2026-10-24", false));
    expect(a).toHaveLength(3);
    expect(a[0]!.key).toBe("learn_words"); // no cards yet → never "review"
    expect(a[1]!.key).toMatch(/^talk_to:/);
    expect(["answer_correct", "listen_correct"]).toContain(a[2]!.key);
  });
});

describe("achievements", () => {
  const base: Stats = {
    dialogues: 0,
    correct: 0,
    correctFix: 0,
    correctTuan: 0,
    hints: 0,
    cards: 0,
    streak: 0,
    rank: "intern",
    questsClaimed: 0,
    perfectBoss: false,
    hourIct: 12,
  };
  const unlocked = (s: Partial<Stats>) =>
    ACHIEVEMENTS.filter((a) => a.test({ ...base, ...s })).map((a) => a.id);
  it("unlock on thresholds", () => {
    expect(unlocked({})).toEqual([]);
    expect(unlocked({ dialogues: 1, streak: 7 })).toEqual([
      "hello-world",
      "first-commit",
      "on-call-hero",
    ]);
    expect(unlocked({ rank: "junior" })).toContain("promoted-junior");
  });
});
