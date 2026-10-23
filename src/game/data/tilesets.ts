// Tilesets shared by the asset build, the map build and the runtime loader.
// Output images are extruded: margin 1, spacing 2 (see scripts/build-assets.ts).

export interface TilesetDef {
  key: "rpg" | "indoor" | "office";
  /** Tiled tileset name; must match `addTilesetImage` at runtime. */
  name: string;
  columns: number;
  tileCount: number;
  /** Source sheet (Kenney, 1px spacing). Absent for tilesets we draw ourselves. */
  source?: string;
  license: string;
}

export const TILE_SIZE = 16;
export const TILESET_MARGIN = 1;
export const TILESET_SPACING = 2;

export const TILESETS: TilesetDef[] = [
  {
    key: "rpg",
    name: "rpg",
    columns: 57,
    tileCount: 57 * 31,
    source: "art/vendor/kenney-roguelike-rpg/roguelikeSheet_transparent.png",
    license: "Kenney Roguelike RPG Pack, CC0 1.0",
  },
  {
    key: "indoor",
    name: "indoor",
    columns: 27,
    tileCount: 27 * 18,
    source: "art/vendor/kenney-roguelike-indoors/roguelikeIndoor_transparent.png",
    license: "Kenney Roguelike Indoors, CC0 1.0",
  },
  {
    key: "office",
    name: "office",
    columns: 8,
    tileCount: 24,
    license: "DevQuest original, CC0 1.0",
  },
];

export function tilesetImageSize(ts: TilesetDef) {
  const rows = Math.ceil(ts.tileCount / ts.columns);
  return { width: ts.columns * (TILE_SIZE + 2), height: rows * (TILE_SIZE + 2) };
}

/** First GID of each tileset in every generated map (Tiled GIDs start at 1). */
export const FIRST_GID: Record<TilesetDef["key"], number> = (() => {
  let gid = 1;
  const out = {} as Record<TilesetDef["key"], number>;
  for (const ts of TILESETS) {
    out[ts.key] = gid;
    gid += ts.tileCount;
  }
  return out;
})();
