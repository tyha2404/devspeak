import { carve, rectRoom, toRows } from "./grid";
import * as P from "./prefabs";
import type { MapSpec } from "./types";

const g = rectRoom(16, 12, "_");
carve(g, 15, 5, 1, 2, "_");

const spec: MapSpec = {
  key: "hr-room",
  grid: toRows(g),
  place: [
    { prefab: P.sprintBoard, x: 9, y: 2 }, // notice board
    { prefab: P.bookshelf, x: 2, y: 3 },
    { prefab: P.bookshelf, x: 3, y: 3 },
    { prefab: P.bookshelf, x: 4, y: 3 },
    { prefab: P.rug(5, 4), x: 4, y: 5 },
    { prefab: P.desk({ monitors: 0, laptop: true, chair: false }), x: 5, y: 5 },
    { prefab: P.chairFacingUp, x: 6, y: 7 },
    { prefab: P.plant, x: 1, y: 3 },
    { prefab: P.plant, x: 14, y: 3 },
    { prefab: P.plantSmall, x: 1, y: 10 },
    { prefab: P.doorMat, x: 14, y: 5 },
    { prefab: P.doorMat, x: 14, y: 6 },
  ],
  spawns: { "from-office": [13, 5] },
  npcs: [{ npcId: "linh", x: 9, y: 6, facing: "left", behavior: "idle" }],
  doors: [{ x: 15, y: 5, w: 1, h: 2, targetMap: "office-floor", targetSpawn: "from-hr" }],
  interactables: [
    {
      x: 9,
      y: 2,
      w: 2,
      h: 1,
      objectId: "hr-notice-board",
      kind: "noticeBoard",
      label: "Notice board",
    },
  ],
};

export default spec;
