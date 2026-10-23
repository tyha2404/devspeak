import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Facing, MapKey } from "@/game/events";

export interface SavedPosition {
  mapKey: MapKey;
  x: number;
  y: number;
  facing: Facing;
  updatedAt: number;
}

interface WorldState {
  position: SavedPosition | null;
  setPosition: (p: Omit<SavedPosition, "updatedAt">) => void;
}

/** Last known player position, persisted locally so a reload resumes where you stood. */
export const useWorldStore = create<WorldState>()(
  persist(
    (set) => ({
      position: null,
      setPosition: (p) => set({ position: { ...p, updatedAt: Date.now() } }),
    }),
    {
      name: "dq:world",
      // localStorage can throw in private mode; fall back to memory.
      storage: createJSONStorage(() => {
        try {
          window.localStorage.setItem("dq:probe", "1");
          window.localStorage.removeItem("dq:probe");
          return window.localStorage;
        } catch {
          const mem = new Map<string, string>();
          return {
            getItem: (k) => mem.get(k) ?? null,
            setItem: (k, v) => void mem.set(k, v),
            removeItem: (k) => void mem.delete(k),
          };
        }
      }),
    },
  ),
);
