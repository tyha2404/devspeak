import { describe, expect, it } from "vitest";
import { decide } from "./pipeline";
import { validateGenerated } from "./validators";

const rubricOk = {
  solvable: true,
  single_correct: true,
  natural_english: true,
  level_ok: true,
  culturally_ok: true,
  distractor_quality: 4,
  vi_explanation_ok: true,
  issues: [],
};

describe("decide", () => {
  it("auto-checks only clean items, and only when auto-approval is on", () => {
    expect(decide(rubricOk, { answer: 1 }, 1, [], true)).toBe("auto_checked");
    expect(decide(rubricOk, { answer: 1 }, 1, [], false)).toBe("in_review");
    expect(decide(rubricOk, { answer: 2 }, 1, [], true)).toBe("in_review"); // blind solve disagreed
    expect(decide({ ...rubricOk, distractor_quality: 3 }, { answer: 1 }, 1, [], true)).toBe(
      "in_review",
    );
    expect(decide(rubricOk, "n/a", null, ["sentence too long for level"], true)).toBe("in_review");
    expect(decide(null, { answer: 1 }, 1, [], true)).toBe("in_review");
  });
});

const ctx = {
  senseSlug: "blocker-n",
  cefr: "B1",
  npcId: "sarah",
  topic: "agile",
  forms: ["blocker", "blockers"],
  commonWords: new Set<string>(),
};

describe("validateGenerated", () => {
  it("accepts a well-formed item", () => {
    const r = validateGenerated(
      {
        type: "fill_blank",
        skin: "slack",
        sentence: "I have one ___ today.",
        options: ["blocker", "weekend", "hobby", "coffee"],
        answer: 0,
        hint_vi: "h",
        explanation_vi: "e",
      },
      ctx,
    );
    expect(r.errors).toEqual([]);
  });

  it("rejects broken keys, missing targets and profanity", () => {
    expect(
      validateGenerated(
        {
          type: "fill_blank",
          skin: "slack",
          sentence: "I have ___ and ___.",
          options: ["a", "b", "c", "d"],
          answer: 5,
          hint_vi: "",
          explanation_vi: "",
        },
        ctx,
      ).errors,
    ).toEqual(
      expect.arrayContaining(["answer index out of range", "fill_blank needs exactly one ___"]),
    );
    expect(
      validateGenerated(
        {
          type: "mcq_meaning",
          stem: "Any problems today?",
          question: "q",
          options: ["a", "b", "c", "d"],
          answer: 0,
          hint_vi: "",
          explanation_vi: "",
        },
        ctx,
      ).errors,
    ).toContain("stem does not mark the target sense");
    expect(
      validateGenerated(
        {
          type: "sentence_order",
          sentence: "This fucking blocker is annoying",
          hint_vi: "",
          explanation_vi: "",
        },
        ctx,
      ).errors,
    ).toContain("profanity");
  });
});
