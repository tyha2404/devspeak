import { create } from "zustand";
import type { GlossEntry } from "@/lib/contracts/dialogue";

interface GlossaryState {
  entries: Record<string, GlossEntry>;
  open: GlossEntry | null;
  merge: (e: Record<string, GlossEntry>) => void;
  show: (slug: string) => void;
  close: () => void;
}

export const useGlossary = create<GlossaryState>()((set, get) => ({
  entries: {},
  open: null,
  merge: (e) => set((s) => ({ entries: { ...s.entries, ...e } })),
  show: (slug) => set({ open: get().entries[slug] ?? null }),
  close: () => set({ open: null }),
}));
