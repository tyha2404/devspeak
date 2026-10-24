import { describe, expect, it } from "vitest";
import { safeAuthNext } from "./redirect";

describe("safeAuthNext", () => {
  it("preserves internal routes and their query strings", () => {
    expect(safeAuthNext("/profile?tab=progress#history")).toBe("/profile?tab=progress#history");
  });

  it.each([
    undefined,
    null,
    "",
    "https://example.com",
    "//example.com",
    "/\\example.com",
    "/\n/example.com",
  ])("rejects an unsafe redirect: %s", (next) => expect(safeAuthNext(next)).toBe("/"));

  it("uses the password page as the recovery fallback", () => {
    expect(safeAuthNext(null, "/account/password")).toBe("/account/password");
  });
});
