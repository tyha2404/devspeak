import { ok, withUser } from "@/lib/api/handler";
import { ACHIEVEMENTS } from "@/features/quests/progression";

export const GET = withUser({}, async ({ userId, supabase }) => {
  const { data } = await supabase
    .from("user_achievements")
    .select("achievement_id, unlocked_at")
    .eq("user_id", userId);
  const owned = new Map((data ?? []).map((a) => [a.achievement_id, a.unlocked_at]));
  return ok(
    ACHIEVEMENTS.map((a) => ({
      id: a.id,
      icon: a.icon,
      title: a.title.vi,
      desc: a.desc,
      unlockedAt: owned.get(a.id) ?? null,
    })),
  );
});
