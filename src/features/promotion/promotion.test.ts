import { describe, expect, it } from "vitest";
import { placementLevel } from "./service";

describe("placementLevel", () => {
  it("places by band", () => {
    expect(placementLevel({ A2: 4, B1: 1 })).toMatchObject({ cefr: "A2", startLevel: 1 });
    expect(placementLevel({ A2: 4, B1: 3, B2: 1 })).toMatchObject({
      cefr: "B1",
      startLevel: 6,
      ranks: ["junior"],
    });
    expect(placementLevel({ B1: 4, B2: 3 })).toMatchObject({
      cefr: "B2",
      startLevel: 13,
      ranks: ["junior", "mid"],
    });
  });
});
