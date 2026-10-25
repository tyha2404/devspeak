import { describe, expect, it } from "vitest";
import { QuestionSpec, type SenseSpec } from "@/features/content/curated";
import {
  blankTerm,
  grammarTestOrder,
  mutations,
  vocabTest,
  vocabQuestionSelection,
} from "./autoquiz";

const sense = (lemma: string, vi: string, example: string): SenseSpec => ({
  slug: lemma.replace(/\s+/g, "-"),
  lemma,
  pos: "phrase",
  kind: "phrase",
  cefr: "B1",
  topic: "workplace",
  it: false,
  def: lemma,
  vi,
  keep_en: false,
  forms: [],
  examples: [{ en: example }],
});

describe("vocabulary coverage across attempts", () => {
  it.each([10, 12, 14, 16, 18, 20, 22, 24, 28, 36])(
    "covers all %i words without increasing the 16-question test",
    (wordCount) => {
      const words = Array.from({ length: wordCount }, (_, i) =>
        sense(`term ${i}`, `nghĩa ${i}`, `Please check term ${i} before release.`),
      );
      const bank = vocabTest("coverage", words, Math.max(16, wordCount));
      const covered = new Set<string>();
      for (let attempt = 0; attempt < Math.ceil(bank.length / 16); attempt++) {
        const selected = vocabQuestionSelection(bank, attempt);
        expect(selected).toHaveLength(16);
        expect(new Set(selected.map((q) => q.slug)).size).toBe(16);
        selected.forEach((q) => q.senses.forEach((slug) => covered.add(slug)));
      }
      expect(covered).toEqual(new Set(words.map((word) => word.slug)));
    },
  );

  it("retains a stable selection on resume and rotates after completion", () => {
    const bank = Array.from({ length: 36 }, (_, i) => `q${i}`);
    expect(vocabQuestionSelection(bank, 0)).toEqual(vocabQuestionSelection(bank, 0));
    expect(vocabQuestionSelection(bank, 1)).toEqual(bank.slice(16, 32));
    expect(vocabQuestionSelection(bank, 2)).toEqual([...bank.slice(32), ...bank.slice(0, 12)]);
    expect(new Set(vocabQuestionSelection(bank, 36)).size).toBe(16);
  });
});

const WORDS = [
  sense("meet a deadline", "kịp hạn chót", "We worked late to meet the deadline."),
  sense("commute", "đi lại đến chỗ làm", "My commute takes an hour."),
  sense("workload", "khối lượng công việc", "Her workload doubled this month."),
  sense("overtime", "làm thêm giờ", "Nobody wants to work overtime."),
  sense("take on", "đảm nhận", "Can you take on this ticket?"),
];

describe("vocabTest", () => {
  const qs = vocabTest("t01-l1", WORDS);

  it("builds 16 valid questions cycling the four kinds", () => {
    expect(qs).toHaveLength(16);
    for (const q of qs) expect(QuestionSpec.safeParse(q).success).toBe(true);
    expect(qs.slice(0, 4).map((q) => q.type)).toEqual([
      "mcq_meaning",
      "mcq_meaning",
      "fill_blank",
      "fill_blank",
    ]);
  });

  it("never repeats a question when the set is smaller than the test", () => {
    const keys = qs.map((q) => JSON.stringify({ ...q, slug: "" }));
    expect(new Set(keys).size).toBe(qs.length);
  });

  it("keeps the right answer among alphabetised options", () => {
    const q = qs[0]!;
    if (q.type !== "mcq_meaning") throw new Error("expected a choice");
    expect(q.options[q.answer]).toBe("kịp hạn chót");
    expect([...q.options].sort((a, b) => a.localeCompare(b, "vi"))).toEqual(q.options);
  });

  it("types the term for its meaning and blanks it in an example", () => {
    const typed = qs[2]!;
    if (typed.type !== "fill_blank") throw new Error("expected a fill");
    expect(typed.accepted).toContain("workload");
    const blank = qs[3]!;
    if (blank.type !== "fill_blank") throw new Error("expected a fill");
    expect(blank.sentence).toBe("Nobody wants to work ___.");
  });
});

describe("grammar helpers", () => {
  it("blanks phrases with a word inside", () => {
    expect(blankTerm("We worked late to meet the deadline.", ["meet a deadline"])).toBe(
      "We worked late to ___.",
    );
    expect(blankTerm("Nothing here.", ["deadline"])).toBeNull();
  });

  it("uses the full authored mistake only for its matching correction", () => {
    const m = mutations("She is a student.", [
      { wrong: "She are a student.", right: "She is a student.", why: "" },
    ]);
    expect(m).toEqual(["She are a student."]);
  });

  it("does not manufacture potentially valid some/any or preposition alternatives", () => {
    expect(mutations("Do you have any questions before the demo?")).toEqual([]);
    expect(mutations("We work in the office.")).toEqual([]);
    expect(
      mutations("Call me when I leave.", [
        { wrong: "Me work remotely.", right: "I work remotely.", why: "Subject pronoun" },
      ]),
    ).toEqual([]);
  });

  it("orders a grammar test like ForumFlash and caps it at 16", () => {
    const a = Array.from({ length: 12 }, (_, i) => `a${i}`);
    const t = Array.from({ length: 8 }, (_, i) => `t${i}`);
    const order = grammarTestOrder(a, t);
    expect(order).toHaveLength(16);
    expect(order.slice(0, 10)).toEqual(a.slice(0, 10));
    expect(order.slice(10)).toEqual(t.slice(0, 6));
  });
});
