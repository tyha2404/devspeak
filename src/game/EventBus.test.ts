import { describe, expect, it, vi } from "vitest";
import { EventBus } from "./EventBus";

describe("EventBus", () => {
  it("delivers typed payloads and unsubscribes", () => {
    const fn = vi.fn();
    const off = EventBus.on("npc:interact", fn);
    EventBus.emit("npc:interact", { npcId: "sarah" });
    off();
    EventBus.emit("npc:interact", { npcId: "dave" });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith({ npcId: "sarah" });
  });

  it("tolerates a listener unsubscribing during emit", () => {
    const calls: string[] = [];
    const offA = EventBus.on("game:ready", () => {
      calls.push("a");
      offA();
    });
    const offB = EventBus.on("game:ready", () => calls.push("b"));
    EventBus.emit("game:ready");
    offB();
    expect(calls).toEqual(["a", "b"]);
  });
});
