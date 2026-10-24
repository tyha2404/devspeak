import { useProfileStore } from "@/stores/profileStore";
import { useUiStore } from "@/stores/uiStore";

export interface ProgressUpdate {
  quests: { key: string; progress: number; goal: number; completed: boolean }[];
  achievements: { id: string; icon: string; title: string }[];
}

interface Award {
  xp_total?: number;
  level?: number;
  leveled_up?: boolean;
  coins?: number;
  streak?: number;
}

/** Reflect a server award in the HUD (the server stays authoritative). */
export function applyAward(a: Award | null | undefined) {
  if (!a || a.xp_total === undefined) return;
  const { profile, setProfile } = useProfileStore.getState();
  if (profile) {
    setProfile({
      ...profile,
      xpTotal: a.xp_total,
      level: a.level ?? profile.level,
      coins: a.coins ?? profile.coins,
      streak: a.streak ?? profile.streak,
    });
  }
  if (a.leveled_up) useUiStore.getState().toast(`🎉 Lên cấp! Level ${a.level}`);
}

/** Toast completed tickets and newly unlocked achievements. */
export function applyProgress(p: ProgressUpdate | null | undefined) {
  if (!p) return;
  const toast = useUiStore.getState().toast;
  for (const q of p.quests)
    if (q.completed && q.progress === q.goal)
      toast("🎫 Hoàn thành sprint ticket! Mở Sprint Board để nhận thưởng");
  for (const a of p.achievements) toast(`${a.icon} Thành tựu mới: ${a.title}`);
}
