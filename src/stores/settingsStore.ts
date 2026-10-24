import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type Theme = "system" | "light" | "dark";

interface Settings {
  theme: Theme;
  ttsRate: number;
  fontScale: "s" | "m" | "l" | "xl";
  reducedMotion: boolean;
  sfxVolume: number;
  set: (patch: Partial<Omit<Settings, "set">>) => void;
}

const safeStorage = () => {
  try {
    window.localStorage.setItem("dq:probe", "1");
    window.localStorage.removeItem("dq:probe");
    return window.localStorage;
  } catch {
    const mem = new Map<string, string>();
    return {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    };
  }
};

export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      theme: "system",
      ttsRate: 0.9,
      fontScale: "m",
      reducedMotion: false,
      sfxVolume: 0.7,
      set: (patch) => set(patch),
    }),
    { name: "dq:settings", storage: createJSONStorage(safeStorage) },
  ),
);
