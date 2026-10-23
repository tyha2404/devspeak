/**
 * Builds game textures into public/assets:
 *   tilesets/{rpg,indoor,office}.png  — 16px tiles re-packed with 1px extrusion (margin 1, spacing 2)
 *   sprites/characters.png + .json    — 16x16 frames, one row per character
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
import { OFFICE_PALETTE, OFFICE_TILE_ORDER, officeTilePixels } from "../art/pixel/officeTiles";
import { TILESETS } from "../src/game/data/tilesets";

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
function extrude(tiles: PNG[], columns: number) {
  const rows = Math.ceil(tiles.length / columns);
  const out = blank(columns * (TILE + 2) + 0, rows * (TILE + 2));
  tiles.forEach((tile, i) => {
    const bx = (i % columns) * (TILE + 2) + 1;
    const by = Math.floor(i / columns) * (TILE + 2) + 1;
    for (let y = -1; y <= TILE; y++) {
      for (let x = -1; x <= TILE; x++) {
        const sx = Math.min(TILE - 1, Math.max(0, x));
        const sy = Math.min(TILE - 1, Math.max(0, y));
        setPx(out, bx + x, by + y, getPx(tile, sx, sy));
      }
    }
  });
  return out;
}

function sliceSheet(file: string, margin: number, spacing: number) {
  const src = PNG.sync.read(fs.readFileSync(file));
  const columns = Math.floor((src.width - 2 * margin + spacing) / (TILE + spacing));
  const rows = Math.floor((src.height - 2 * margin + spacing) / (TILE + spacing));
  const tiles: PNG[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      const t = blank(TILE, TILE);
      PNG.bitblt(
        src,
        t,
        margin + c * (TILE + spacing),
        margin + r * (TILE + spacing),
        TILE,
        TILE,
        0,
        0,
      );
      tiles.push(t);
    }
  }
  return { tiles, columns };
}

function write(rel: string, png: PNG) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, PNG.sync.write(png));
  console.log(`wrote ${path.relative(ROOT, file)} (${png.width}x${png.height})`);
}

// ----- Kenney tilesets -----
for (const ts of TILESETS.filter((t) => t.source)) {
  const { tiles, columns } = sliceSheet(path.join(ROOT, ts.source!), 0, 1);
  if (columns !== ts.columns || tiles.length !== ts.tileCount) {
    throw new Error(
      `${ts.key}: expected ${ts.columns} cols / ${ts.tileCount} tiles, got ${columns} / ${tiles.length}`,
    );
  }
  write(`tilesets/${ts.key}.png`, extrude(tiles, columns));
}

// ----- office tileset (our own art) -----
{
  const ts = TILESETS.find((t) => t.key === "office")!;
  const tiles = OFFICE_TILE_ORDER.map((name) => {
    const t = blank(TILE, TILE);
    paint(t, 0, 0, officeTilePixels(name), OFFICE_PALETTE);
    return t;
  });
  if (tiles.length > ts.tileCount)
    throw new Error("office tileset grew: bump tileCount in tilesets.ts");
  while (tiles.length < ts.tileCount) tiles.push(blank(TILE, TILE));
  write("tilesets/office.png", extrude(tiles, ts.columns));
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
