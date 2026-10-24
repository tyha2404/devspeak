import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type TranslationMode = "always" | "tap" | "never";

interface Settings {
  translation: TranslationMode;
  typewriterCps: 40 | 80 | 0; // 0 = instant
  ttsRate: number;
  fontScale: "s" | "m" | "l" | "xl";
  reducedMotion: boolean;
  readableFont: boolean;
  musicVolume: number;
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
      translation: "always",
      typewriterCps: 40,
      ttsRate: 0.9,
      fontScale: "m",
      reducedMotion: false,
      readableFont: true,
      musicVolume: 0.5,
      sfxVolume: 0.7,
      set: (patch) => set(patch),
    }),
    { name: "dq:settings", storage: createJSONStorage(safeStorage) },
  ),
);
