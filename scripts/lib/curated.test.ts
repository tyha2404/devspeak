import { describe, expect, it } from "vitest";
import { loadCurated, validateCurated } from "./curated";

describe("curated content", () => {
  it("parses and cross-references cleanly", () => {
    const c = loadCurated();
    expect(validateCurated(c)).toEqual([]);
    expect(c.senses.length).toBeGreaterThanOrEqual(50);
    expect(c.questions.length).toBeGreaterThanOrEqual(100);
    expect(c.dialogues.length).toBeGreaterThanOrEqual(10);
  });
});
