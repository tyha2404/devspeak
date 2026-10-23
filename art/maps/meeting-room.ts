import { carve, rectRoom, toRows } from "./grid";
import * as P from "./prefabs";
import type { MapSpec } from "./types";

const g = rectRoom(20, 14, ".");
carve(g, 0, 7, 1, 2, ".");

const spec: MapSpec = {
  key: "meeting-room",
  grid: toRows(g),
  place: [
    { prefab: P.projectorScreen, x: 9, y: 2 },
    { prefab: P.whiteboard, x: 15, y: 2 },
    { prefab: P.rug(10, 6, "orange"), x: 5, y: 4 },
    { prefab: P.longTable(6), x: 7, y: 6 },
    ...[7, 8, 9, 10, 11, 12].map((x) => ({ prefab: P.chairFacingDown, x, y: 5 })),
    ...[7, 8, 9, 10, 11, 12].map((x) => ({ prefab: P.chairFacingUp, x, y: 8 })),
    { prefab: P.chairSideRight, x: 6, y: 6 },
    { prefab: P.chairSideLeft, x: 13, y: 6 },
    { prefab: P.plant, x: 1, y: 3 },
    { prefab: P.plant, x: 18, y: 3 },
    { prefab: P.plant, x: 18, y: 12 },
    { prefab: P.doorMat, x: 1, y: 7 },
    { prefab: P.doorMat, x: 1, y: 8 },
  ],
  spawns: { "from-office": [2, 7] },
  npcs: [{ npcId: "sarah", x: 8, y: 3, facing: "down", behavior: "idle" }],
  doors: [{ x: 0, y: 7, w: 1, h: 2, targetMap: "office-floor", targetSpawn: "from-meeting" }],
  interactables: [
    { x: 9, y: 2, w: 2, h: 1, objectId: "meeting-screen", kind: "demoScreen", label: "Projector" },
  ],
};

export default spec;
