import { describe, expect, it } from "vitest";
import { MAP_SPECS } from "../../art/maps";
import { carve, rectRoom, toRows } from "../../art/maps/grid";
import type { MapSpec } from "../../art/maps/types";
import { BUILT_MAPS } from "../../src/game/data/maps";
import { compileMap, type CompiledMap } from "./compileMap";
import { validateMaps } from "./validateMap";

const compileAll = (specs: MapSpec[]) =>
  Object.fromEntries(specs.map((s) => [s.key, compileMap(s)])) as Record<string, CompiledMap>;

const tileLayer = (map: CompiledMap, name: string) =>
  (map.layers.find((l) => l.name === name) as { data: number[] }).data;

describe("map specs", () => {
  it("cover every built map and validate cleanly", () => {
    expect(MAP_SPECS.map((s) => s.key).sort()).toEqual([...BUILT_MAPS].sort());
    expect(validateMaps(compileAll(MAP_SPECS))).toEqual([]);
  });

  it("autotiles room walls and marks them solid", () => {
    const g = rectRoom(5, 5, ".");
    carve(g, 0, 3, 1, 1, ".");
    const map = compileMap({
      key: "office-floor",
      grid: toRows(g),
      place: [],
      spawns: { default: [2, 3] },
      npcs: [],
      doors: [],
      interactables: [],
    });
    const walls = tileLayer(map, "Walls");
    const solid = tileLayer(map, "Collision");
    const at = (x: number, y: number) => walls[y * 5 + x]! - 1; // rpg firstgid is 1
    expect(at(0, 0)).toBe(700); // top-left corner
    expect(at(4, 0)).toBe(701); // top-right corner
    expect(at(2, 0)).toBe(698); // top edge
    expect(at(1, 1)).toBe(872); // upper wall face, left end
    expect(at(2, 2)).toBe(868); // lower wall face
    expect(solid[3 * 5 + 0]).toBe(0); // the carved doorway is walkable
    expect(solid[3 * 5 + 2]).toBe(0);
    expect(solid[0]).not.toBe(0);
  });

  it("reports doors to missing spawns and unlocked doors to unbuilt maps", () => {
    const [office, ...rest] = MAP_SPECS;
    const broken: MapSpec = {
      ...office!,
      doors: [
        { x: 0, y: 12, w: 1, h: 2, targetMap: "hr-room", targetSpawn: "nope" },
        { x: 19, y: 25, w: 2, h: 1, targetMap: "server-room", targetSpawn: "from-office" },
      ],
    };
    const errors = validateMaps(compileAll([broken, ...rest]));
    expect(errors).toContain('office-floor: door to hr-room uses missing spawn "nope"');
    expect(errors).toContain(
      "office-floor: door to unbuilt map server-room must be locked (requires)",
    );
  });

  it("rejects spawns inside walls", () => {
    const [office, ...rest] = MAP_SPECS;
    const broken: MapSpec = { ...office!, spawns: { ...office!.spawns, default: [0, 0] } };
    expect(validateMaps(compileAll([broken, ...rest]))).toContain(
      'office-floor: spawn "default" is inside collision',
    );
  });
});
