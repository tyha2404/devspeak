import { OFFICE_TILE } from "../pixel/officeTiles";
import type { Prefab, TileRef } from "./types";

// Kenney "Roguelike Indoors" local indices (27 columns), checked against the sheet preview.
const indoor = (i: number): TileRef => ["indoor", i];
const office = (name: keyof typeof OFFICE_TILE): TileRef => ["office", OFFICE_TILE[name]];
const rpg = (i: number): TileRef => ["rpg", i];

export const desk = (
  opts: { monitors?: 0 | 1 | 2; laptop?: boolean; chair?: boolean } = {},
): Prefab => {
  const { monitors = 2, laptop = false, chair = true } = opts;
  const decor: TileRef[] = [null, null, null];
  if (monitors >= 1) decor[0] = office("monitor");
  if (monitors >= 2) decor[2] = office("monitor");
  if (laptop) decor[1] = office("laptop");
  const parts: Prefab = [
    {
      layer: "Furniture",
      tiles: [
        [indoor(0), indoor(1), indoor(2)],
        [indoor(27), indoor(28), indoor(29)],
      ],
      collide: true,
    },
    { layer: "Decor", tiles: [decor], collide: false },
  ];
  if (chair)
    parts.push({ layer: "Decor", tiles: [[office("chair")]], dx: 1, dy: 2, collide: false });
  return parts;
};

/** Long table made of desk end pieces with repeated middles; `len` >= 2. */
export const longTable = (len: number): Prefab => {
  const mid = Array.from({ length: len - 2 });
  return [
    {
      layer: "Furniture",
      tiles: [
        [indoor(0), ...mid.map(() => indoor(1)), indoor(2)],
        [indoor(27), ...mid.map(() => indoor(28)), indoor(29)],
      ],
      collide: true,
    },
  ];
};

export const chairFacingDown: Prefab = [
  { layer: "Furniture", tiles: [[indoor(54)]], collide: false },
];
export const chairFacingUp: Prefab = [
  { layer: "Furniture", tiles: [[indoor(55)]], collide: false },
];
export const chairSideRight: Prefab = [
  { layer: "Furniture", tiles: [[indoor(56)]], collide: false },
];
export const chairSideLeft: Prefab = [
  { layer: "Furniture", tiles: [[indoor(57)]], collide: false },
];
export const officeChair: Prefab = [{ layer: "Decor", tiles: [[office("chair")]], collide: false }];

export const plant: Prefab = [{ layer: "Furniture", tiles: [[indoor(16)]], collide: true }];
export const plantSmall: Prefab = [{ layer: "Furniture", tiles: [[indoor(17)]], collide: true }];
export const bookshelf: Prefab = [{ layer: "Furniture", tiles: [[indoor(479)]], collide: true }];
export const sofa: Prefab = [
  { layer: "Furniture", tiles: [[indoor(257), indoor(258)]], collide: true },
];
export const roundTable: Prefab = [{ layer: "Furniture", tiles: [[indoor(7)]], collide: true }];
export const counter = (len: number): Prefab => [
  {
    layer: "Furniture",
    tiles: [Array.from({ length: len }, (_, i) => indoor(i % 2 === 0 ? 325 : 326))],
    collide: true,
  },
];
export const sink: Prefab = [{ layer: "Furniture", tiles: [[indoor(331)]], collide: true }];

export const printer: Prefab = [
  { layer: "Furniture", tiles: [[office("printer")]], collide: true },
];
export const coffeeMachine: Prefab = [
  { layer: "Furniture", tiles: [[office("coffee")]], collide: true },
];
export const waterCooler: Prefab = [
  { layer: "Above", tiles: [[office("coolerTop")]], collide: false },
  { layer: "Furniture", tiles: [[office("coolerBottom")]], dy: 1, collide: true },
];
export const serverRack: Prefab = [
  { layer: "Above", tiles: [[office("rackTop")]], collide: false },
  { layer: "Furniture", tiles: [[office("rackBottom")]], dy: 1, collide: true },
];

// Wall-mounted props go on wall-face rows, which are already solid.
export const whiteboard: Prefab = [
  { layer: "Decor", tiles: [[office("whiteboardL"), office("whiteboardR")]], collide: false },
];
export const sprintBoard: Prefab = [
  { layer: "Decor", tiles: [[office("boardL"), office("boardR")]], collide: false },
];
export const projectorScreen: Prefab = [
  { layer: "Decor", tiles: [[office("screenL"), office("screenR")]], collide: false },
];
export const elevator: Prefab = [
  {
    layer: "Decor",
    tiles: [
      [office("elevatorL"), office("elevatorR")],
      [office("elevatorL"), office("elevatorR")],
    ],
    collide: false,
  },
];

export const doorMat: Prefab = [{ layer: "GroundDecor", tiles: [[office("mat")]], collide: false }];
export const lockSign: Prefab = [{ layer: "Decor", tiles: [[office("lock")]], collide: false }];

/** 9-slice rug from the Kenney RPG sheet. `w`, `h` >= 2. */
export const rug = (w: number, h: number, color: "green" | "orange" = "green"): Prefab => {
  // Top-left index of each 3x3 rug block (57 columns per row).
  const base = color === "green" ? 922 : 751;
  const at = (r: number, c: number) => rpg(base + r * 57 + c);
  const row = (r: number) => [at(r, 0), ...Array.from({ length: w - 2 }, () => at(r, 1)), at(r, 2)];
  return [
    {
      layer: "GroundDecor",
      tiles: [row(0), ...Array.from({ length: h - 2 }, () => row(1)), row(2)],
      collide: false,
    },
  ];
};
