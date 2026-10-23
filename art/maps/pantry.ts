import { carve, rectRoom, toRows } from "./grid";
import * as P from "./prefabs";
import type { MapSpec } from "./types";

const g = rectRoom(20, 14, ":");
carve(g, 0, 7, 1, 2, ":");

const spec: MapSpec = {
  key: "pantry",
  grid: toRows(g),
  place: [
    { prefab: P.counter(5), x: 3, y: 3 },
    { prefab: P.sink, x: 8, y: 3 },
    { prefab: P.coffeeMachine, x: 10, y: 3 },
    { prefab: P.waterCooler, x: 12, y: 3 },
    ...[5, 9, 13].flatMap((x) => [
      { prefab: P.roundTable, x, y: 8 },
      { prefab: P.chairSideRight, x: x - 1, y: 8 },
      { prefab: P.chairSideLeft, x: x + 1, y: 8 },
    ]),
    { prefab: P.rug(5, 3), x: 13, y: 10 },
    { prefab: P.sofa, x: 14, y: 11 },
    { prefab: P.sofa, x: 16, y: 11 },
    { prefab: P.plant, x: 18, y: 3 },
    { prefab: P.plantSmall, x: 1, y: 12 },
    { prefab: P.doorMat, x: 1, y: 7 },
    { prefab: P.doorMat, x: 1, y: 8 },
  ],
  spawns: { "from-office": [2, 7] },
  npcs: [{ npcId: "dave", x: 10, y: 6, facing: "down", behavior: "wander", wanderRadius: 3 }],
  doors: [{ x: 0, y: 7, w: 1, h: 2, targetMap: "office-floor", targetSpawn: "from-pantry" }],
  interactables: [
    {
      x: 10,
      y: 3,
      w: 1,
      h: 1,
      objectId: "coffee-machine",
      kind: "coffeeMachine",
      label: "Coffee machine",
    },
  ],
};

export default spec;
