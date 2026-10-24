import { carve, rectRoom, toRows } from "./grid";
import * as P from "./prefabs";
import type { MapSpec } from "./types";

const g = rectRoom(24, 16, ",");
carve(g, 0, 7, 1, 2, ",");

const rackRow = (y: number) =>
  [3, 4, 5, 7, 8, 9, 14, 15, 16, 18, 19, 20].map((x) => ({ prefab: P.serverRack, x, y }));

const spec: MapSpec = {
  key: "server-room",
  grid: toRows(g),
  place: [
    ...rackRow(3),
    ...rackRow(9),
    { prefab: P.desk({ monitors: 2 }), x: 10, y: 12 },
    { prefab: P.whiteboard, x: 11, y: 2 },
    { prefab: P.doorMat, x: 1, y: 7 },
    { prefab: P.doorMat, x: 1, y: 8 },
    { prefab: P.plantSmall, x: 22, y: 14 },
  ],
  spawns: { "from-office": [2, 7] },
  npcs: [{ npcId: "kenji", x: 12, y: 7, facing: "down", behavior: "wander", wanderRadius: 2 }],
  doors: [{ x: 0, y: 7, w: 1, h: 2, targetMap: "office-floor", targetSpawn: "from-server" }],
  interactables: [
    {
      x: 10,
      y: 12,
      w: 3,
      h: 2,
      objectId: "oncall-desk",
      kind: "terminal",
      label: "On-call dashboard",
    },
  ],
};

export default spec;
