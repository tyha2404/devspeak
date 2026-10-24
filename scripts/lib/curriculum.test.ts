import { describe, expect, it } from "vitest";
import { loadCurated } from "./curated";
import { expandTrackLessons, loadCurriculum, validateCurriculum } from "./curriculum";

describe("curriculum content", () => {
  it("parses and cross-references cleanly", () => {
    const c = loadCurriculum();
    expect(validateCurriculum(c, loadCurated())).toEqual([]);
    expect(c.stages.map((s) => s.track).sort()).toEqual(["grammar", "vocab"]);
  });

  it("gives every published lesson a 16-question test", () => {
    const c = loadCurriculum();
    expandTrackLessons(c, loadCurated());
    const published = c.units.filter((u) => u.status === "published");
    expect(published.length).toBeGreaterThan(0);
    for (const u of published) for (const l of u.lessons) expect(l.questions).toHaveLength(16);
  });
});
