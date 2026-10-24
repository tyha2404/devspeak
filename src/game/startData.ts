import type { Facing, MapKey } from "./events";

/** What React hands the game at boot (stored in the Phaser registry). */
export interface GameStartData {
  position: { mapKey: MapKey; x?: number; y?: number; facing?: Facing; spawnId?: string };
  level: number;
  unlocks: string[];
  avatar: string;
  deskItems: string[];
  npcsWithNew: string[];
  debug: boolean;
  /** Exposes `window.__dq.test` hooks for Playwright (never in normal play). */
  e2e: boolean;
  /** Fixed ICT clock "HH:MM" for NPC schedules (tests). In e2e mode without it, schedules are off. */
  clock?: string;
}

export const REGISTRY_START = "dq:start";
