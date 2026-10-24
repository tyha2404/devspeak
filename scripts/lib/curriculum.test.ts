import { describe, expect, it } from "vitest";
import { loadCurated } from "./curated";
import { loadCurriculum, validateCurriculum } from "./curriculum";

describe("curriculum content", () => {
  it("parses and cross-references cleanly", () => {
    const c = loadCurriculum();
    expect(validateCurriculum(c, loadCurated())).toEqual([]);
    expect(c.stages).toHaveLength(4);
    expect(c.units).toHaveLength(36);
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
