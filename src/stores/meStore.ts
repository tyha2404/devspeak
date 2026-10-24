import { create } from "zustand";
import { api } from "@/lib/client/api";
import { ensureSession } from "@/lib/client/session";
import type { Home, LessonResult } from "@/lib/contracts/learn";

interface MeState {
  home: Home | null;
  error: string | null;
  /** Ensure a (guest) session, then load the learner's home summary. */
  load: () => Promise<Home | null>;
  /** Reflect totals the server returned with a lesson result (the server stays authoritative). */
  applyTotals: (t: LessonResult["totals"]) => void;
}

export const useMe = create<MeState>()((set, get) => ({
  home: null,
  error: null,
  load: async () => {
    try {
      await ensureSession();
      const home = await api.get<Home>("/api/home");
      set({ home, error: null });
      return home;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Không tải được dữ liệu" });
      return null;
    }
  },
  applyTotals: (t) => {
    const home = get().home;
    if (!t || !home) return;
    set({
      home: {
        ...home,
        me: {
          ...home.me,
          xpTotal: t.xpTotal,
          streak: t.streak,
          todayXp: t.todayXp,
          dailyGoal: t.dailyGoal,
        },
      },
    });
  },
}));
