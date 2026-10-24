import { ok, withUser } from "@/lib/api/handler";
import { ensureQuests, questTitle } from "@/features/quests/progression";
import { createAdminClient } from "@/lib/supabase/admin";

export const GET = withUser({}, async ({ userId }) => {
  const db = createAdminClient();
  const { data: p } = await db.from("profiles").select("timezone").eq("id", userId).single();
  const { day, week } = await ensureQuests(db, userId, p?.timezone ?? "Asia/Ho_Chi_Minh");
  const { data } = await db
    .from("user_quests")
    .select(
      "quest_key, period_key, kind, goal, progress, reward_xp, reward_coins, completed_at, claimed_at",
    )
    .eq("user_id", userId)
    .in("period_key", [day, week]);
  return ok({
    day,
    week,
    quests: (data ?? []).map((q, i) => ({
      ...q,
      id: `DQ-${100 + i}`,
      title: questTitle(q.quest_key),
    })),
  });
});
