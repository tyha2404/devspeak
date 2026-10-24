import { describe, expect, it } from "vitest";
import { loadCurated } from "./curated";
import { expandTrackLessons, loadCurriculum, validateCurriculum } from "./curriculum";

describe("curriculum content", () => {
  it("parses and cross-references cleanly", () => {
    const c = loadCurriculum();
    expect(validateCurriculum(c, loadCurated())).toEqual([]);
    const career = c.stages.filter((s) => s.track === "career").map((s) => s.slug);
    expect(career).toHaveLength(4);
    expect(c.units.filter((u) => career.includes(u.stage))).toHaveLength(36);
  });

  it("has one stage per study track with a playable first unit", () => {
    const c = loadCurriculum();
    const curated = loadCurated();
    expandTrackLessons(c, curated);
    for (const track of ["grammar", "vocab"] as const) {
      const stages = c.stages.filter((s) => s.track === track);
      expect(stages).toHaveLength(1);
      const first = c.units.find((u) => u.stage === stages[0]!.slug && u.sort === 1);
      expect(first?.status).toBe("published");
      // Every track lesson tests like ForumFlash: 16 questions.
      for (const l of first!.lessons) expect(l.questions).toHaveLength(16);
    }
  });

  it("has a playable first stage", () => {
    const c = loadCurriculum();
    const published = c.units.filter(
      (u) => u.stage === "a2-foundation" && u.status === "published",
    );
    expect(published.length).toBeGreaterThanOrEqual(5);
    for (const u of published) expect(u.lessons.some((l) => l.kind === "task")).toBe(true);
  });
});
