import { describe, expect, it } from "vitest";
import { cefrFromRank, containsAnyForm, parseCsv, splitHeadword } from "./parse";

describe("dataset parsing", () => {
  it("parses quoted CSV and strips BOMs", () => {
    expect(parseCsv('﻿a,b\n1,"x, ""y"""\r\n2,z\n')).toEqual([
      { a: "1", b: 'x, "y"' },
      { a: "2", b: "z" },
    ]);
  });

  it("splits CEFR-J headword variants", () => {
    expect(splitHeadword("a.m./A.M./am/AM")).toEqual({
      display: "a.m.",
      normalized: "a.m.",
      forms: ["a.m.", "am"],
    });
  });

  it("maps frequency bands to CEFR", () => {
    expect([1, 700, 1500, 2500, 5000, null].map((r) => cefrFromRank(r))).toEqual([
      "A1",
      "A2",
      "B1",
      "B2",
      "C1",
      "C1",
    ]);
  });

  it("matches whole words only", () => {
    expect(containsAnyForm("I pushed my branch.", ["pushed"])).toBe(true);
    expect(containsAnyForm("Bushes are green.", ["push"])).toBe(false);
  });
});
