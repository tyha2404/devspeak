import { describe, expect, it } from "vitest";
import { ttsKey } from "./ttsKey";

describe("ttsKey", () => {
  it("is stable, voice-specific and trims whitespace", () => {
    expect(ttsKey("en-US", "Hello")).toBe(ttsKey("en-US", " Hello "));
    expect(ttsKey("en-US", "Hello")).not.toBe(ttsKey("en-GB", "Hello"));
    expect(ttsKey("en-US", "Hello")).toMatch(/^[0-9a-f]{16}$/);
  });
});
