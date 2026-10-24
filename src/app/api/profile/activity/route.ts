import { ok, withUser } from "@/lib/api/handler";

/** Last 12 weeks of daily XP for the GitHub-style commit graph. */
export const GET = withUser({}, async ({ userId, supabase }) => {
  const since = new Date(Date.now() - 84 * 86_400_000).toISOString().slice(0, 10);
  const { data } = await supabase
    .from("daily_activity")
    .select("local_date, xp")
    .eq("user_id", userId)
    .gte("local_date", since);
  return ok({ since, days: data ?? [] });
});
