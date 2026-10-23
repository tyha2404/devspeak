/**
 * Renders each built map to a PNG (all visible tile layers) for quick visual review.
 * Usage: pnpm tsx scripts/preview-maps.ts <outDir>
 */
import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import {
  FIRST_GID,
  TILESETS,
  TILESET_MARGIN,
  TILESET_SPACING,
  TILE_SIZE,
} from "../src/game/data/tilesets";

const ROOT = path.resolve(import.meta.dirname, "..");
const outDir = path.resolve(process.argv[2] ?? "map-previews");
fs.mkdirSync(outDir, { recursive: true });

const sheets = Object.fromEntries(
  TILESETS.map((ts) => [
    ts.key,
    PNG.sync.read(fs.readFileSync(path.join(ROOT, `public/assets/tilesets/${ts.key}.png`))),
  ]),
);

function blit(dst: PNG, gid: number, dx: number, dy: number) {
  const ts = [...TILESETS].reverse().find((t) => gid >= FIRST_GID[t.key])!;
  const local = gid - FIRST_GID[ts.key];
  const src = sheets[ts.key]!;
  const sx = TILESET_MARGIN + (local % ts.columns) * (TILE_SIZE + TILESET_SPACING);
  const sy = TILESET_MARGIN + Math.floor(local / ts.columns) * (TILE_SIZE + TILESET_SPACING);
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      const si = ((sy + y) * src.width + sx + x) * 4;
      const a = src.data[si + 3]! / 255;
      if (a === 0) continue;
      const di = ((dy + y) * dst.width + dx + x) * 4;
      for (let k = 0; k < 3; k++)
        dst.data[di + k] = Math.round(src.data[si + k]! * a + dst.data[di + k]! * (1 - a));
      dst.data[di + 3] = 255;
    }
  }
}

for (const file of fs.readdirSync(path.join(ROOT, "public/assets/maps"))) {
  const map = JSON.parse(fs.readFileSync(path.join(ROOT, "public/assets/maps", file), "utf8"));
  const png = new PNG({ width: map.width * TILE_SIZE, height: map.height * TILE_SIZE });
  png.data.fill(0);
  for (let i = 0; i < png.data.length; i += 4) png.data[i + 3] = 255;
  for (const layer of map.layers) {
    if (layer.type !== "tilelayer" || !layer.visible) continue;
    layer.data.forEach((gid: number, i: number) => {
      if (gid) blit(png, gid, (i % map.width) * TILE_SIZE, Math.floor(i / map.width) * TILE_SIZE);
    });
  }
  const out = path.join(outDir, file.replace(".json", ".png"));
  fs.writeFileSync(out, PNG.sync.write(png));
  console.log(`wrote ${out}`);
}
