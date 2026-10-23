import { MAPS } from "../../src/game/data/maps";
import { NPCS } from "../../src/game/data/npcs";
import type { MapKey } from "../../src/game/events";
import { OBJECT_LAYERS, TILE_LAYERS, type CompiledMap } from "./compileMap";

type Obj = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  properties?: { name: string; value: unknown }[];
};

const prop = (o: Obj, name: string) => o.properties?.find((p) => p.name === name)?.value;

/** Returns a list of problems; empty means the map set is consistent. */
export function validateMaps(maps: Record<string, CompiledMap>): string[] {
  const errors: string[] = [];
  const spawnsOf = (key: string) => {
    const layer = maps[key]?.layers.find((l) => l.name === "Spawns") as
      { objects: Obj[] } | undefined;
    return new Set(layer?.objects.map((o) => o.name) ?? []);
  };

  for (const [key, map] of Object.entries(maps)) {
    const fail = (msg: string) => errors.push(`${key}: ${msg}`);
    const names = map.layers.map((l) => l.name);
    for (const required of [...TILE_LAYERS, ...OBJECT_LAYERS]) {
      if (!names.includes(required)) fail(`missing layer ${required}`);
    }
    const objects = (name: string) =>
      ((map.layers.find((l) => l.name === name) as { objects?: Obj[] } | undefined)?.objects ??
        []) as Obj[];
    const collision = (map.layers.find((l) => l.name === "Collision") as { data: number[] }).data;
    const solidAt = (px: number, py: number) =>
      collision[Math.floor(py / map.tileheight) * map.width + Math.floor(px / map.tilewidth)] !== 0;

    for (const s of objects("Spawns"))
      if (solidAt(s.x, s.y)) fail(`spawn "${s.name}" is inside collision`);

    for (const n of objects("NPCs")) {
      const id = String(prop(n, "npcId"));
      if (!NPCS[id]) fail(`unknown npcId "${id}"`);
      if (solidAt(n.x, n.y)) fail(`npc "${id}" is inside collision`);
    }

    for (const d of objects("Doors")) {
      const target = String(prop(d, "targetMap")) as MapKey;
      const spawn = String(prop(d, "targetSpawn"));
      if (!MAPS[target]) {
        fail(`door targets unknown map "${target}"`);
        continue;
      }
      if (maps[target]) {
        if (!spawnsOf(target).has(spawn)) fail(`door to ${target} uses missing spawn "${spawn}"`);
      } else if (!prop(d, "requires")) {
        fail(`door to unbuilt map ${target} must be locked (requires)`);
      }
    }

    const ids = objects("Interactables").map((o) => o.name);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (dupes.length) fail(`duplicate interactable ids: ${dupes.join(", ")}`);
  }

  for (const key of Object.keys(maps))
    if (!spawnsOf(key).size) errors.push(`${key}: has no spawns`);
  return errors;
}
