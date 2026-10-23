import { describe, expect, it } from "vitest";
import { localDate } from "./time";

describe("localDate", () => {
  it("rolls over to the next ICT day at 17:00 UTC", () => {
    expect(localDate(new Date("2026-10-24T16:59:59Z"))).toBe("2026-10-24");
    expect(localDate(new Date("2026-10-24T17:00:00Z"))).toBe("2026-10-25");
  });

  it("respects other time zones", () => {
    expect(localDate(new Date("2026-10-24T17:00:00Z"), "UTC")).toBe("2026-10-24");
  });
});
