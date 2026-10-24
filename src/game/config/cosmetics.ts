// Coffee Beans shop catalogue. Cosmetic only (plus PTO days): never hints or XP.

export interface Cosmetic {
  id: string;
  kind: "hoodie" | "desk" | "pto";
  price: number;
  name: { en: string; vi: string };
  /** Player sprite row for hoodies (see art/pixel/characters.ts), office tile name for desk items. */
  sprite?: string;
}

export const COSMETICS: Cosmetic[] = [
  {
    id: "hoodie-blue",
    kind: "hoodie",
    price: 0,
    name: { en: "Blue hoodie", vi: "Áo hoodie xanh" },
    sprite: "player",
  },
  {
    id: "hoodie-red",
    kind: "hoodie",
    price: 80,
    name: { en: "Red hoodie", vi: "Áo hoodie đỏ" },
    sprite: "player-red",
  },
  {
    id: "hoodie-green",
    kind: "hoodie",
    price: 80,
    name: { en: "Green hoodie", vi: "Áo hoodie xanh lá" },
    sprite: "player-green",
  },
  {
    id: "hoodie-conf",
    kind: "hoodie",
    price: 150,
    name: { en: "Conference T-shirt", vi: "Áo hội thảo" },
    sprite: "player-conf",
  },
  {
    id: "desk-duck",
    kind: "desk",
    price: 30,
    name: { en: "Rubber duck", vi: "Vịt cao su" },
    sprite: "duck",
  },
  {
    id: "desk-cat",
    kind: "desk",
    price: 300,
    name: { en: "Desk cat", vi: "Mèo trên bàn" },
    sprite: "cat",
  },
  {
    id: "desk-plant",
    kind: "desk",
    price: 30,
    name: { en: "Tiny cactus", vi: "Xương rồng mini" },
    sprite: "cactus",
  },
  {
    id: "desk-keyboard",
    kind: "desk",
    price: 150,
    name: { en: "Mechanical keyboard", vi: "Bàn phím cơ" },
    sprite: "keyboard",
  },
  {
    id: "pto-day",
    kind: "pto",
    price: 60,
    name: { en: "PTO day (streak freeze)", vi: "Ngày nghỉ phép (giữ streak)" },
  },
];

export const COSMETIC = Object.fromEntries(COSMETICS.map((c) => [c.id, c])) as Record<
  string,
  Cosmetic
>;
