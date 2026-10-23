import { create } from "zustand";
import type { InteractableKind } from "@/game/events";

export type Overlay =
  | { kind: "dialogue"; npcId: string }
  | { kind: "object"; objectId: string; objectKind: InteractableKind; label: string }
  | null;

export interface Toast {
  id: number;
  text: string;
}

interface UiState {
  overlay: Overlay;
  actionLabel: string | null;
  mapName: string | null;
  toasts: Toast[];
  openOverlay: (overlay: NonNullable<Overlay>) => void;
  closeOverlay: () => void;
  setActionLabel: (label: string | null) => void;
  setMapName: (name: string) => void;
  toast: (text: string) => void;
}

let toastId = 0;

export const useUiStore = create<UiState>()((set) => ({
  overlay: null,
  actionLabel: null,
  mapName: null,
  toasts: [],
  openOverlay: (overlay) => set({ overlay }),
  closeOverlay: () => set({ overlay: null }),
  setActionLabel: (actionLabel) => set({ actionLabel }),
  setMapName: (mapName) => set({ mapName }),
  toast: (text) => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 2500);
  },
}));
