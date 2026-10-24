import { ok, withUser } from "@/lib/api/handler";

export const GET = withUser({}, async ({ supabase }, req) => {
  const period = new URL(req.url).searchParams.get("period") === "all" ? "all" : "week";
  const { data } = await supabase.rpc("get_leaderboard", { p_period: period, p_limit: 50 });
  return ok({ period, rows: data ?? [] });
});
