// Stable tile indices inside the generated `office` tileset, shared by the asset build and the
// game runtime. Append only.
export const OFFICE_TILE_ORDER = [
  "monitor",
  "laptop",
  "rackTop",
  "rackBottom",
  "whiteboardL",
  "whiteboardR",
  "boardL",
  "boardR",
  "coffee",
  "coolerTop",
  "coolerBottom",
  "chair",
  "printer",
  "screenL",
  "screenR",
  "elevatorL",
  "elevatorR",
  "mat",
  "lock",
  "duck",
  "cat",
  "cactus",
  "keyboard",
] as const;

export type OfficeTileName = (typeof OFFICE_TILE_ORDER)[number];

export const OFFICE_TILE = Object.fromEntries(
  OFFICE_TILE_ORDER.map((name, i) => [name, i]),
) as Record<OfficeTileName, number>;
