import type { MapSpec, PlaceLayer, TileRef } from "../../art/maps/types";
import {
  FIRST_GID,
  TILESETS,
  TILESET_MARGIN,
  TILESET_SPACING,
  TILE_SIZE,
  tilesetImageSize,
} from "../../src/game/data/tilesets";

// Kenney RPG sheet tiles used for structure (57 columns).
const FLOOR: Record<string, number> = { ".": 119, ",": 120, ":": 121, _: 122 };
const WALL = {
  horizontal: 698,
  vertical: 756,
  endLeft: 697,
  endRight: 699,
  cornerTL: 700,
  cornerTR: 701,
  cornerBL: 757,
  cornerBR: 758,
  faceUpper: 873,
  faceUpperLeft: 872,
  faceUpperRight: 874,
  faceLower: 868,
  faceLowerLeft: 869,
  faceLowerRight: 871,
};

export const TILE_LAYERS = [
  "Ground",
  "GroundDecor",
  "Walls",
  "Furniture",
  "Decor",
  "Above",
  "Collision",
] as const;
export const OBJECT_LAYERS = ["Spawns", "NPCs", "Doors", "Interactables"] as const;

type TiledProperty = {
  name: string;
  type: "string" | "int" | "bool";
  value: string | number | boolean;
};
interface TiledObject {
  id: number;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: 0;
  visible: true;
  point?: true;
  properties?: TiledProperty[];
}

const gid = (ref: TileRef) => (ref ? FIRST_GID[ref[0]] + ref[1] : 0);

function props(obj: Record<string, string | number | boolean | undefined>): TiledProperty[] {
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined)
    .map(([name, value]) => ({
      name,
      type: typeof value === "number" ? "int" : typeof value === "boolean" ? "bool" : "string",
      value: value!,
    }));
}

function wallTile(grid: string[], x: number, y: number): number {
  const at = (xx: number, yy: number) => grid[yy]?.[xx] ?? " ";
  const c = at(x, y);
  if (c === "W") {
    const upper = at(x, y - 1) === "#";
    const left = at(x - 1, y) !== "W";
    const right = at(x + 1, y) !== "W";
    if (upper) return left ? WALL.faceUpperLeft : right ? WALL.faceUpperRight : WALL.faceUpper;
    return left ? WALL.faceLowerLeft : right ? WALL.faceLowerRight : WALL.faceLower;
  }
  const U = at(x, y - 1) === "#";
  const D = at(x, y + 1) === "#";
  const L = at(x - 1, y) === "#";
  const R = at(x + 1, y) === "#";
  if (R && D && !U && !L) return WALL.cornerTL;
  if (L && D && !U && !R) return WALL.cornerTR;
  if (U && R && !D && !L) return WALL.cornerBL;
  if (U && L && !D && !R) return WALL.cornerBR;
  if ((L || R) && !U && !D) return L && R ? WALL.horizontal : R ? WALL.endLeft : WALL.endRight;
  if ((U || D) && !L && !R) return WALL.vertical;
  return L && R ? WALL.horizontal : WALL.vertical;
}

/** Compile a map spec into Tiled JSON (orthogonal, embedded tilesets). */
export function compileMap(spec: MapSpec) {
  const height = spec.grid.length;
  const width = spec.grid[0]!.length;
  spec.grid.forEach((row, y) => {
    if (row.length !== width)
      throw new Error(`${spec.key}: row ${y} has width ${row.length}, expected ${width}`);
  });

  const layers = Object.fromEntries(
    TILE_LAYERS.map((name) => [name, new Array<number>(width * height).fill(0)]),
  ) as Record<(typeof TILE_LAYERS)[number], number[]>;
  const idx = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height)
      throw new Error(`${spec.key}: (${x},${y}) is outside the map`);
    return y * width + x;
  };
  const solid = gid(["office", 0]); // any valid gid; the layer is invisible

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const c = spec.grid[y]![x]!;
      if (c === " ") continue;
      if (c === "#" || c === "W") {
        layers.Walls[idx(x, y)] = gid(["rpg", wallTile(spec.grid, x, y)]);
        layers.Collision[idx(x, y)] = solid;
        continue;
      }
      const floor = FLOOR[c];
      if (floor === undefined)
        throw new Error(`${spec.key}: unknown grid char "${c}" at (${x},${y})`);
      layers.Ground[idx(x, y)] = gid(["rpg", floor]);
    }
  }

  for (const { prefab, x, y } of spec.place) {
    for (const part of prefab) {
      part.tiles.forEach((row, ry) =>
        row.forEach((ref, rx) => {
          if (!ref) return;
          const i = idx(x + (part.dx ?? 0) + rx, y + (part.dy ?? 0) + ry);
          layers[part.layer satisfies PlaceLayer][i] = gid(ref);
          if (part.collide) layers.Collision[i] = solid;
        }),
      );
    }
  }

  let nextObjectId = 1;
  const obj = (o: Omit<TiledObject, "id" | "rotation" | "visible">): TiledObject => ({
    id: nextObjectId++,
    rotation: 0,
    visible: true,
    ...o,
  });
  const T = TILE_SIZE;
  const rect = (r: { x: number; y: number; w: number; h: number }) => ({
    x: r.x * T,
    y: r.y * T,
    width: r.w * T,
    height: r.h * T,
  });
  const center = ([x, y]: [number, number]) => ({
    x: x * T + T / 2,
    y: y * T + T / 2,
    width: 0,
    height: 0,
  });

  const objectLayers: Record<(typeof OBJECT_LAYERS)[number], TiledObject[]> = {
    Spawns: Object.entries(spec.spawns).map(([name, at]) =>
      obj({ name, type: "spawn", point: true, ...center(at) }),
    ),
    NPCs: spec.npcs.map((n) =>
      obj({
        name: n.npcId,
        type: "npc",
        point: true,
        ...center([n.x, n.y]),
        properties: props({
          npcId: n.npcId,
          facing: n.facing,
          behavior: n.behavior,
          wanderRadius: n.wanderRadius,
        }),
      }),
    ),
    Doors: spec.doors.map((d) =>
      obj({
        name: `door-${d.targetMap}`,
        type: "door",
        ...rect(d),
        properties: props({
          targetMap: d.targetMap,
          targetSpawn: d.targetSpawn,
          requires: d.requires,
        }),
      }),
    ),
    Interactables: spec.interactables.map((it) =>
      obj({
        name: it.objectId,
        type: "interactable",
        ...rect(it),
        properties: props({
          objectId: it.objectId,
          kind: it.kind,
          label: it.label,
          contentId: it.contentId,
        }),
      }),
    ),
  };

  let layerId = 1;
  return {
    type: "map",
    version: "1.10",
    tiledversion: "1.10.2",
    orientation: "orthogonal",
    renderorder: "right-down",
    infinite: false,
    width,
    height,
    tilewidth: T,
    tileheight: T,
    compressionlevel: -1,
    properties: props({ mapKey: spec.key }),
    tilesets: TILESETS.map((ts) => {
      const size = tilesetImageSize(ts);
      return {
        firstgid: FIRST_GID[ts.key],
        name: ts.name,
        image: `../tilesets/${ts.key}.png`,
        imagewidth: size.width,
        imageheight: size.height,
        margin: TILESET_MARGIN,
        spacing: TILESET_SPACING,
        tilewidth: T,
        tileheight: T,
        tilecount: ts.tileCount,
        columns: ts.columns,
      };
    }),
    layers: [
      ...TILE_LAYERS.map((name) => ({
        id: layerId++,
        name,
        type: "tilelayer",
        x: 0,
        y: 0,
        width,
        height,
        opacity: 1,
        visible: name !== "Collision",
        data: layers[name],
      })),
      ...OBJECT_LAYERS.map((name) => ({
        id: layerId++,
        name,
        type: "objectgroup",
        draworder: "topdown",
        x: 0,
        y: 0,
        opacity: 1,
        visible: true,
        objects: objectLayers[name],
      })),
    ],
    nextlayerid: layerId,
    nextobjectid: nextObjectId,
  };
}

export type CompiledMap = ReturnType<typeof compileMap>;
