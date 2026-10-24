/**
 * Builds the character sheet into public/assets (the avatars of the colleagues who guide units):
 *   sprites/characters.png + .json — 16x16 frames, one row per character
 *
 * Usage: pnpm assets
 */
import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import {
  CHARACTERS,
  DIRS,
  FIXED_COLORS,
  FRAMES_PER_DIR,
  OUTLINE,
  characterFrame,
} from "../art/pixel/characters";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "public/assets");
const TILE = 16;

type RGBA = [number, number, number, number];

function hex(c: string): RGBA {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
}

function blank(w: number, h: number) {
  const png = new PNG({ width: w, height: h });
  png.data.fill(0);
  return png;
}

function getPx(png: PNG, x: number, y: number): RGBA {
  const i = (y * png.width + x) * 4;
  return [png.data[i]!, png.data[i + 1]!, png.data[i + 2]!, png.data[i + 3]!];
}

function setPx(png: PNG, x: number, y: number, c: RGBA) {
  const i = (y * png.width + x) * 4;
  png.data[i] = c[0];
  png.data[i + 1] = c[1];
  png.data[i + 2] = c[2];
  png.data[i + 3] = c[3];
}

/** Paint a 16x16 pixel-art tile described by strings. */
function paint(png: PNG, ox: number, oy: number, rows: string[], palette: Record<string, string>) {
  if (rows.length !== TILE) throw new Error(`tile has ${rows.length} rows, expected ${TILE}`);
  rows.forEach((row, y) => {
    if (row.length !== TILE)
      throw new Error(`row ${y} "${row}" has ${row.length} px, expected ${TILE}`);
    [...row].forEach((ch, x) => {
      if (ch === ".") return;
      const color = palette[ch];
      if (!color) throw new Error(`unknown palette key "${ch}"`);
      setPx(png, ox + x, oy + y, hex(color));
    });
  });
}

/** Re-pack a tile grid with each tile surrounded by a 1px copy of its own edge pixels. */
function write(rel: string, png: PNG) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, PNG.sync.write(png));
  console.log(`wrote ${path.relative(ROOT, file)} (${png.width}x${png.height})`);
}

// ----- characters -----
{
  const cols = DIRS.length * FRAMES_PER_DIR;
  const sheet = blank(cols * TILE, CHARACTERS.length * TILE);
  CHARACTERS.forEach((def, row) => {
    const palette = { ...FIXED_COLORS, ...def.colors };
    DIRS.forEach((dir, d) => {
      for (let f = 0; f < FRAMES_PER_DIR; f++) {
        const frame = blank(TILE, TILE);
        paint(frame, 0, 0, characterFrame(def, dir, f), palette);
        // 1px dark outline around the silhouette, the classic readable pixel-art look.
        const outline = hex(OUTLINE);
        const filled = (x: number, y: number) =>
          x >= 0 && y >= 0 && x < TILE && y < TILE && getPx(frame, x, y)[3] > 0;
        const edges: [number, number][] = [];
        for (let y = 0; y < TILE; y++) {
          for (let x = 0; x < TILE; x++) {
            if (
              !filled(x, y) &&
              (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1))
            ) {
              edges.push([x, y]);
            }
          }
        }
        for (const [x, y] of edges) setPx(frame, x, y, outline);
        PNG.bitblt(frame, sheet, 0, 0, TILE, TILE, (d * FRAMES_PER_DIR + f) * TILE, row * TILE);
      }
    });
  });
  write("sprites/characters.png", sheet);
  const meta = {
    frameWidth: TILE,
    frameHeight: TILE,
    columns: cols,
    dirs: DIRS,
    framesPerDir: FRAMES_PER_DIR,
    characters: CHARACTERS.map((c) => c.id),
  };
  fs.writeFileSync(path.join(OUT, "sprites/characters.json"), JSON.stringify(meta, null, 2) + "\n");
}
