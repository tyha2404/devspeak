import { describe, expect, it } from "vitest";
import { loadCurated } from "./curated";
import { expandTrackLessons, loadCurriculum, validateCurriculum } from "./curriculum";
import { QuestionSpec } from "../../src/features/content/curated";

describe("curriculum content", () => {
  it("parses and cross-references cleanly", () => {
    const c = loadCurriculum();
    expect(validateCurriculum(c, loadCurated())).toEqual([]);
    expect(c.stages.map((s) => s.track).sort()).toEqual(["grammar", "vocab"]);
  });

  it("covers every vocabulary word while grammar tests stay at 16 questions", () => {
    const c = loadCurriculum();
    const content = loadCurated();
    expandTrackLessons(c, content);
    const questions = new Map(content.questions.map((q) => [q.slug, q]));
    const published = c.units.filter((u) => u.status === "published");
    expect(published.length).toBeGreaterThan(0);
    for (const u of published)
      for (const l of u.lessons) {
        expect(l.questions).toHaveLength(l.kind === "vocab" ? Math.max(16, l.senses.length) : 16);
        if (l.kind === "vocab") {
          const targets = new Set(l.questions.flatMap((slug) => questions.get(slug)!.senses));
          expect(targets).toEqual(new Set(l.senses));
        }
      }
    for (const q of content.questions) expect(QuestionSpec.safeParse(q).success, q.slug).toBe(true);
  });

  it("publishes all 25 developer topics with the reference word-set sizes", () => {
    const topics = loadCurriculum().units.filter((unit) => unit.stage === "vocab");
    expect(topics).toHaveLength(25);
    for (const topic of topics) {
      expect(topic.status).toBe("published");
      expect(topic.lessons.map((l) => (l.kind === "vocab" ? l.senses.length : 0))).toEqual([
        10, 12, 14, 16, 18, 20, 22, 24, 28, 36,
      ]);
      const words = topic.lessons.flatMap((l) => (l.kind === "vocab" ? l.senses : []));
      expect(new Set(words).size).toBe(200);
    }
  });

  it("does not mark a valid some/any alternative wrong in the demo question", () => {
    const c = loadCurriculum();
    const content = loadCurated();
    expandTrackLessons(c, content);
    const question = content.questions.find((q) => q.slug === "auto-g-a1-quantifiers-tr-3")!;
    if (question.type !== "mcq_meaning") throw new Error("Expected a translation question");
    expect(question.options[question.answer]).toBe("Do you have any questions before the demo?");
    expect(question.options).not.toContain("Do you have some questions before the demo?");
  });
});
