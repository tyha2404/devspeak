import { describe, expect, it } from "vitest";
import { parseMarkup, senseSlugs, stripMarkup } from "./markup";

describe("markup", () => {
  it("parses surface|slug and bare forms", () => {
    expect(parseMarkup("Any [[blockers|blocker-n]] or a [[merge conflict]]?")).toEqual([
      { text: "Any " },
      { text: "blockers", sense: "blocker-n" },
      { text: " or a " },
      { text: "merge conflict", sense: "merge-conflict" },
      { text: "?" },
    ]);
    expect(senseSlugs("[[a|x-n]] [[b|y-v]]")).toEqual(["x-n", "y-v"]);
    expect(stripMarkup("Any [[blockers|blocker-n]]?")).toBe("Any blockers?");
  });
});
