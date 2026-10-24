// Hand-authored 16x16 character templates (our own art, CC0). One template per direction and
// walk frame; every character is a palette swap plus optional hair/glasses overlays.
// Keys: S skin, H hair, T shirt, U shirt shade, P pants, B shoes, E eyes, G glasses.
// Right-facing frames are the left-facing ones flipped at runtime.

export type Dir = "down" | "up" | "left";
export const DIRS: Dir[] = ["down", "up", "left"];
export const FRAMES_PER_DIR = 3; // 0 idle, 1 stride A, 2 stride B

const HEAD_DOWN = [
  "................",
  "................",
  ".....HHHHHH.....",
  "....HHHHHHHH....",
  "....HSSSSSSH....",
  "....SSSSSSSS....",
  "....SESSSSES....",
  "....SSSSSSSS....",
  ".....SSSSSS.....",
];
const HEAD_UP = [
  "................",
  "................",
  ".....HHHHHH.....",
  "....HHHHHHHH....",
  "....HHHHHHHH....",
  "....HHHHHHHH....",
  "....HHHHHHHH....",
  "....SHHHHHHS....",
  ".....SSSSSS.....",
];
const HEAD_LEFT = [
  "................",
  "................",
  ".....HHHHHH.....",
  "....HHHHHHHH....",
  "....SSSSHHHH....",
  "...SSSSSSHHH....",
  "...SESSSSSHH....",
  "....SSSSSSS.....",
  ".....SSSSS......",
];

const BODY_FRONT = ["....TTTTTTTT....", "...STUTTTTUTS...", "...STTTTTTTTS..."];
const BODY_SIDE = [".....TTTTTT.....", ".....TTSUTT.....", ".....TTSTTT....."];

const LEGS_FRONT = [
  ["....PPPPPPPP....", "....PPP..PPP....", "....PPP..PPP....", "....BBB..BBB...."],
  ["....PPPPPPPP....", "....PPP..PPP....", "....PPP..BBB....", "....BBB........."],
  ["....PPPPPPPP....", "....PPP..PPP....", "....BBB..PPP....", ".........BBB...."],
];
const LEGS_SIDE = [
  [".....PPPPPP.....", ".....PP.PPP.....", ".....PP.PPP.....", "....BBB.BBB....."],
  [".....PPPPPP.....", "....PPP..PP.....", "...BBB...PP.....", ".........BB....."],
  [".....PPPPPP.....", ".....PP..PPP....", ".....BB...PPP...", "..........BBB..."],
];

export function baseFrame(dir: Dir, frame: number): string[] {
  const head = dir === "down" ? HEAD_DOWN : dir === "up" ? HEAD_UP : HEAD_LEFT;
  const body = dir === "left" ? BODY_SIDE : BODY_FRONT;
  const legs = (dir === "left" ? LEGS_SIDE : LEGS_FRONT)[frame]!;
  return [...head, ...body, ...legs];
}

/** Long hair: extra hair framing the face (down/left) or down the back (up). */
const LONG_HAIR: Record<Dir, [number, number][]> = {
  down: [
    [3, 4],
    [3, 5],
    [3, 6],
    [3, 7],
    [12, 4],
    [12, 5],
    [12, 6],
    [12, 7],
  ],
  up: [
    [3, 4],
    [3, 5],
    [3, 6],
    [3, 7],
    [12, 4],
    [12, 5],
    [12, 6],
    [12, 7],
    [5, 8],
    [6, 8],
    [7, 8],
    [8, 8],
    [9, 8],
    [10, 8],
  ],
  left: [
    [10, 7],
    [11, 7],
    [11, 8],
    [12, 4],
    [12, 5],
    [12, 6],
    [12, 7],
  ],
};
const GLASSES: Partial<Record<Dir, [number, number][]>> = {
  down: [
    [4, 6],
    [6, 6],
    [9, 6],
    [11, 6],
    [7, 6],
    [8, 6],
  ],
  left: [
    [3, 6],
    [5, 6],
  ],
};

type Px = [number, number, string];

/** Hair styles drawn on top of the base hair (per direction). */
const HAIR_STYLES: Record<string, Partial<Record<Dir, Px[]>>> = {
  spiky: {
    down: [
      [5, 1, "H"],
      [7, 1, "H"],
      [9, 1, "H"],
      [11, 2, "H"],
    ],
    up: [
      [5, 1, "H"],
      [7, 1, "H"],
      [9, 1, "H"],
      [11, 2, "H"],
    ],
    left: [
      [5, 1, "H"],
      [7, 1, "H"],
      [9, 1, "H"],
      [11, 2, "H"],
    ],
  },
  bun: {
    down: [
      [7, 0, "H"],
      [8, 0, "H"],
      [6, 1, "H"],
      [7, 1, "H"],
      [8, 1, "H"],
      [9, 1, "H"],
    ],
    up: [
      [7, 0, "H"],
      [8, 0, "H"],
      [6, 1, "H"],
      [7, 1, "H"],
      [8, 1, "H"],
      [9, 1, "H"],
    ],
    left: [
      [9, 0, "H"],
      [10, 0, "H"],
      [9, 1, "H"],
      [10, 1, "H"],
      [11, 1, "H"],
    ],
  },
  curly: {
    down: [
      [5, 1, "H"],
      [6, 1, "H"],
      [7, 1, "H"],
      [8, 1, "H"],
      [9, 1, "H"],
      [10, 1, "H"],
      [3, 3, "H"],
      [12, 3, "H"],
      [3, 4, "H"],
      [12, 4, "H"],
    ],
    up: [
      [5, 1, "H"],
      [6, 1, "H"],
      [7, 1, "H"],
      [8, 1, "H"],
      [9, 1, "H"],
      [10, 1, "H"],
      [3, 3, "H"],
      [12, 3, "H"],
      [3, 4, "H"],
      [12, 4, "H"],
    ],
    left: [
      [5, 1, "H"],
      [6, 1, "H"],
      [7, 1, "H"],
      [8, 1, "H"],
      [9, 1, "H"],
      [10, 1, "H"],
      [12, 3, "H"],
      [12, 4, "H"],
      [12, 5, "H"],
    ],
  },
  ponytail: {
    down: [
      [12, 5, "H"],
      [12, 6, "H"],
    ],
    up: [
      [7, 8, "H"],
      [8, 8, "H"],
      [7, 9, "H"],
      [8, 9, "H"],
      [7, 10, "H"],
    ],
    left: [
      [12, 4, "H"],
      [12, 5, "H"],
      [13, 5, "H"],
      [13, 6, "H"],
      [13, 7, "H"],
    ],
  },
  receding: {
    down: [
      [6, 3, "S"],
      [7, 3, "S"],
      [8, 3, "S"],
      [9, 3, "S"],
    ],
    left: [
      [5, 3, "S"],
      [6, 3, "S"],
      [7, 3, "S"],
    ],
  },
};

const ACCESSORIES: Record<string, Partial<Record<Dir, Px[]>>> = {
  headphones: {
    down: [
      [5, 1, "Q"],
      [6, 1, "Q"],
      [7, 1, "Q"],
      [8, 1, "Q"],
      [9, 1, "Q"],
      [10, 1, "Q"],
      [3, 4, "Q"],
      [3, 5, "Q"],
      [12, 4, "Q"],
      [12, 5, "Q"],
    ],
    up: [
      [5, 1, "Q"],
      [6, 1, "Q"],
      [7, 1, "Q"],
      [8, 1, "Q"],
      [9, 1, "Q"],
      [10, 1, "Q"],
      [3, 4, "Q"],
      [3, 5, "Q"],
      [12, 4, "Q"],
      [12, 5, "Q"],
    ],
    left: [
      [5, 1, "Q"],
      [6, 1, "Q"],
      [7, 1, "Q"],
      [8, 1, "Q"],
      [9, 1, "Q"],
      [10, 1, "Q"],
      [10, 4, "Q"],
      [10, 5, "Q"],
      [11, 4, "Q"],
      [11, 5, "Q"],
    ],
  },
  tie: {
    down: [
      [7, 9, "R"],
      [8, 9, "R"],
      [7, 10, "R"],
      [8, 10, "R"],
      [7, 11, "R"],
    ],
    left: [
      [6, 9, "R"],
      [6, 10, "R"],
    ],
  },
  lanyard: {
    down: [
      [5, 9, "Y"],
      [10, 9, "Y"],
      [6, 10, "Y"],
      [9, 10, "Y"],
      [7, 11, "Y"],
      [8, 11, "Y"],
    ],
  },
};

export interface CharacterDef {
  id: string;
  hair: "short" | "long";
  style?: keyof typeof HAIR_STYLES;
  accessory?: keyof typeof ACCESSORIES;
  glasses?: boolean;
  colors: { S: string; H: string; T: string; U: string; P: string; B: string };
}

export function characterFrame(def: CharacterDef, dir: Dir, frame: number): string[] {
  const rows = baseFrame(dir, frame).map((r) => r.split(""));
  const set = (x: number, y: number, c: string) => {
    if (rows[y]) rows[y]![x] = c;
  };
  if (def.hair === "long") for (const [x, y] of LONG_HAIR[dir]) set(x, y, "H");
  for (const [x, y, c] of (def.style && HAIR_STYLES[def.style]?.[dir]) || []) set(x, y, c);
  if (def.glasses) for (const [x, y] of GLASSES[dir] ?? []) set(x, y, "G");
  for (const [x, y, c] of (def.accessory && ACCESSORIES[def.accessory]?.[dir]) || []) set(x, y, c);
  return rows.map((r) => r.join(""));
}

const SKIN = { light: "#f5d0b0", mid: "#e0ac85", tan: "#c68a5e", deep: "#8d5a3b" };

// Order matters: it is the row index in the generated spritesheet.
export const CHARACTERS: CharacterDef[] = [
  {
    id: "player",
    hair: "short",
    style: "spiky",
    colors: { S: SKIN.mid, H: "#2b1d14", T: "#3a86ff", U: "#2667cc", P: "#2f3a4f", B: "#f4f1de" },
  },
  {
    id: "linh",
    hair: "long",
    style: "bun",
    colors: { S: SKIN.light, H: "#1c1210", T: "#e76f51", U: "#c4553a", P: "#3d405b", B: "#2b2b3a" },
  },
  {
    id: "tuan",
    hair: "short",
    glasses: true,
    colors: { S: SKIN.mid, H: "#15110e", T: "#6ab04c", U: "#4e8a36", P: "#2f3a4f", B: "#2b2b3a" },
  },
  {
    id: "sarah",
    hair: "long",
    style: "ponytail",
    colors: { S: SKIN.light, H: "#3b2a20", T: "#4a90d9", U: "#3170b3", P: "#22223b", B: "#2b2b3a" },
  },
  {
    id: "dave",
    hair: "short",
    style: "curly",
    colors: { S: SKIN.tan, H: "#d9a441", T: "#f2a65a", U: "#cf8540", P: "#5c4d3c", B: "#3a2a1a" },
  },
  {
    id: "emma",
    hair: "long",
    glasses: true,
    colors: { S: SKIN.light, H: "#b5533c", T: "#9b5de5", U: "#7a3fc2", P: "#2f3a4f", B: "#2b2b3a" },
  },
  {
    id: "raj",
    hair: "short",
    accessory: "tie",
    colors: { S: SKIN.tan, H: "#120c0a", T: "#e9edc9", U: "#c9cda6", P: "#3d405b", B: "#5c3a21" },
  },
  {
    id: "kenji",
    hair: "short",
    style: "spiky",
    accessory: "headphones",
    glasses: true,
    colors: { S: SKIN.light, H: "#0d0d12", T: "#2b2d42", U: "#1d1e2c", P: "#4a4e69", B: "#2b2b3a" },
  },
  {
    id: "mike",
    hair: "short",
    accessory: "tie",
    colors: { S: SKIN.mid, H: "#6b4f2a", T: "#ffffff", U: "#d6d9de", P: "#1d3557", B: "#3a2a1a" },
  },
  {
    id: "robert",
    hair: "short",
    style: "receding",
    accessory: "tie",
    glasses: true,
    colors: { S: SKIN.deep, H: "#c9c9c9", T: "#3d405b", U: "#2c2f45", P: "#22223b", B: "#1b1b28" },
  },
  // Player cosmetics (append only: row index is the sprite row).
  {
    id: "player-red",
    hair: "short",
    colors: { S: SKIN.mid, H: "#2b1d14", T: "#e63946", U: "#b52a35", P: "#2f3a4f", B: "#f4f1de" },
  },
  {
    id: "player-green",
    hair: "short",
    colors: { S: SKIN.mid, H: "#2b1d14", T: "#2a9d8f", U: "#1f776c", P: "#2f3a4f", B: "#f4f1de" },
  },
  {
    id: "player-conf",
    hair: "short",
    colors: { S: SKIN.mid, H: "#2b1d14", T: "#ffd166", U: "#e0b04a", P: "#1d3557", B: "#f4f1de" },
  },
  // Phase 3 characters.
  {
    id: "mentee",
    hair: "long",
    style: "ponytail",
    accessory: "lanyard",
    colors: { S: SKIN.mid, H: "#2b1d14", T: "#90be6d", U: "#6f9a52", P: "#3d405b", B: "#f4f1de" },
  },
  {
    id: "attendee-a",
    hair: "short",
    accessory: "lanyard",
    glasses: true,
    colors: { S: SKIN.light, H: "#6b4f2a", T: "#577590", U: "#43607a", P: "#22223b", B: "#2b2b3a" },
  },
  {
    id: "attendee-b",
    hair: "long",
    style: "bun",
    accessory: "lanyard",
    colors: { S: SKIN.tan, H: "#1c1210", T: "#f94144", U: "#c8343a", P: "#22223b", B: "#2b2b3a" },
  },
];

export const OUTLINE = "#1b1b28";
export const FIXED_COLORS: Record<string, string> = {
  E: "#1b1b28",
  G: "#8a8fa0",
  Q: "#4cc9f0", // headphones
  R: "#c1121f",
  Y: "#ffd166",
};
