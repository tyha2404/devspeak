import { create } from "zustand";

export interface Toast {
  id: number;
  text: string;
}

let toastId = 0;

/** Short confirmations ("Đã thêm vào sổ tay") shown at the bottom of the screen. */
export const useToasts = create<{ toasts: Toast[]; toast: (text: string) => void }>()((set) => ({
  toasts: [],
  toast: (text) => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 2800);
  },
}));

export const toast = (text: string) => useToasts.getState().toast(text);
