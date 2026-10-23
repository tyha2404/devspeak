import type { Facing, InteractableKind, MapKey } from "../../src/game/events";
import type { TilesetDef } from "../../src/game/data/tilesets";

/** A tile in one of our tilesets: [tileset key, local index]. `null` leaves the cell empty. */
export type TileRef = readonly [TilesetDef["key"], number] | null;

export type PlaceLayer = "GroundDecor" | "Furniture" | "Decor" | "Above";

export interface PrefabPart {
  layer: PlaceLayer;
  tiles: TileRef[][];
  /** Offset of this part relative to the placement origin, in tiles. */
  dx?: number;
  dy?: number;
  /** Mark the part's non-empty cells as solid in the Collision layer. */
  collide: boolean;
}

export type Prefab = PrefabPart[];

export interface Placement {
  prefab: Prefab;
  x: number;
  y: number;
}

export interface NpcPlacement {
  npcId: string;
  x: number;
  y: number;
  facing: Facing;
  behavior: "idle" | "wander";
  wanderRadius?: number;
}

export interface DoorPlacement {
  x: number;
  y: number;
  w: number;
  h: number;
  targetMap: MapKey;
  targetSpawn: string;
  /** Unlock id (e.g. "rank:junior"). Locked doors are solid and only show a hint. */
  requires?: string;
}

export interface InteractablePlacement {
  x: number;
  y: number;
  w: number;
  h: number;
  objectId: string;
  kind: InteractableKind;
  label: string;
  contentId?: string;
}

/**
 * Grid legend:
 *   ' ' void · '#' wall top/border (solid) · 'W' wall face (solid)
 *   '.' wood floor · ',' stone floor · ':' beige tile · '_' dark wood
 */
export interface MapSpec {
  key: MapKey;
  grid: string[];
  place: Placement[];
  spawns: Record<string, [number, number]>;
  npcs: NpcPlacement[];
  doors: DoorPlacement[];
  interactables: InteractablePlacement[];
}
