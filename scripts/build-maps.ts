/**
 * Compiles art/maps/*.ts specs into Tiled JSON at public/assets/maps/<key>.json and validates
 * the whole set (door targets, spawns, NPC ids, collision).
 *
 * Usage: pnpm maps
 */
import fs from "node:fs";
import path from "node:path";
import { MAP_SPECS } from "../art/maps";
import { BUILT_MAPS } from "../src/game/data/maps";
import { compileMap, type CompiledMap } from "./lib/compileMap";
import { validateMaps } from "./lib/validateMap";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "public/assets/maps");

const compiled: Record<string, CompiledMap> = {};
for (const spec of MAP_SPECS) compiled[spec.key] = compileMap(spec);

const missing = BUILT_MAPS.filter((k) => !compiled[k]);
const errors = [
  ...validateMaps(compiled),
  ...missing.map((k) => `${k}: marked built but has no spec`),
];
if (errors.length) {
  console.error(errors.map((e) => `  ✗ ${e}`).join("\n"));
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });
for (const [key, map] of Object.entries(compiled)) {
  fs.writeFileSync(path.join(OUT, `${key}.json`), JSON.stringify(map));
  console.log(`wrote public/assets/maps/${key}.json (${map.width}x${map.height})`);
}
