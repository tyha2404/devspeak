import { describe, expect, it } from "vitest";
import { findPath, inWindow } from "./pathfind";

const grid = ["....", ".##.", "...."];
const solid = (x: number, y: number) => grid[y]![x] === "#";

describe("findPath", () => {
  it("routes around walls with the shortest path", () => {
    const p = findPath(solid, 4, 3, { x: 0, y: 1 }, { x: 3, y: 1 })!;
    expect(p.at(-1)).toEqual({ x: 3, y: 1 });
    expect(p).toHaveLength(5);
    expect(p.some((s) => solid(s.x, s.y))).toBe(false);
  });
  it("refuses solid or unreachable goals", () => {
    expect(findPath(solid, 4, 3, { x: 0, y: 0 }, { x: 1, y: 1 })).toBeNull();
    expect(findPath(() => false, 4, 3, { x: 0, y: 0 }, { x: 9, y: 9 })).toBeNull();
  });
});

describe("inWindow", () => {
  it("uses ICT", () => {
    expect(inWindow(new Date("2026-10-24T05:00:00Z"), "11:30", "13:00")).toBe(true); // 12:00 ICT
    expect(inWindow(new Date("2026-10-24T07:00:00Z"), "11:30", "13:00")).toBe(false); // 14:00 ICT
  });
});
