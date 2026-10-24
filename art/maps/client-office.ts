import { rectRoom, toRows } from "./grid";
import * as P from "./prefabs";
import type { MapSpec } from "./types";

const g = rectRoom(30, 20, "_");

const spec: MapSpec = {
  key: "client-office",
  grid: toRows(g),
  place: [
    { prefab: P.elevator, x: 3, y: 1 },
    { prefab: P.projectorScreen, x: 14, y: 2 },
    { prefab: P.rug(12, 7, "orange"), x: 9, y: 5 },
    { prefab: P.longTable(6), x: 12, y: 7 },
    ...[12, 13, 14, 15, 16, 17].map((x) => ({ prefab: P.chairFacingDown, x, y: 6 })),
    ...[12, 13, 14, 15, 16, 17].map((x) => ({ prefab: P.chairFacingUp, x, y: 9 })),
    { prefab: P.sofa, x: 23, y: 14 },
    { prefab: P.sofa, x: 25, y: 14 },
    { prefab: P.waterCooler, x: 27, y: 3 },
    { prefab: P.plant, x: 1, y: 18 },
    { prefab: P.plant, x: 28, y: 18 },
    { prefab: P.bookshelf, x: 22, y: 3 },
    { prefab: P.bookshelf, x: 23, y: 3 },
  ],
  spawns: { default: [4, 4], "from-elevator": [4, 4] },
  npcs: [{ npcId: "mike", x: 18, y: 11, facing: "left", behavior: "idle" }],
  doors: [],
  interactables: [
    { x: 3, y: 2, w: 2, h: 1, objectId: "elevator", kind: "elevator", label: "Elevator" },
    {
      x: 14,
      y: 2,
      w: 2,
      h: 1,
      objectId: "client-screen",
      kind: "demoScreen",
      label: "Demo screen",
    },
  ],
};

export default spec;
