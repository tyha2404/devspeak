import "server-only";
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization") ?? "";
  if (!secret) return false;
  const want = Buffer.from(`Bearer ${secret}`);
  const got = Buffer.from(header);
  return got.length === want.length && timingSafeEqual(got, want);
}

/**
 * Cron route wrapper: checks `Authorization: Bearer $CRON_SECRET` (Vercel Cron sends it; pg_net
 * reads it from Vault), and claims (job, runKey) in `cron_runs` so duplicate triggers are no-ops.
 */
export function withCron(job: string, runKey: () => string, handler: () => Promise<unknown>) {
  return async (req: Request) => {
    if (!authorized(req))
      return NextResponse.json({ ok: false, error: { code: "UNAUTHENTICATED" } }, { status: 401 });
    const db = createAdminClient();
    const key = runKey();
    const force = new URL(req.url).searchParams.has("force");
    const { error: claimErr } = await db
      .from("cron_runs")
      .insert({ job, run_key: force ? `${key}:${Date.now()}` : key });
    if (claimErr)
      return NextResponse.json({
        ok: true,
        data: { skipped: true, reason: "already ran", runKey: key },
      });
    try {
      const detail = await handler();
      await db
        .from("cron_runs")
        .update({ finished_at: new Date().toISOString(), ok: true, detail })
        .eq("job", job)
        .like("run_key", `${key}%`);
      return NextResponse.json({ ok: true, data: detail });
    } catch (err) {
      await db
        .from("cron_runs")
        .update({
          finished_at: new Date().toISOString(),
          ok: false,
          detail: { error: String(err) },
        })
        .eq("job", job)
        .like("run_key", `${key}%`);
      console.error(JSON.stringify({ cron: job, error: String(err) }));
      return NextResponse.json(
        { ok: false, error: { code: "INTERNAL", message: String(err) } },
        { status: 500 },
      );
    }
  };
}

export const dayKey = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10); // ICT date
export const slotKey = (minutes: number) => {
  const d = new Date();
  d.setUTCMinutes(Math.floor(d.getUTCMinutes() / minutes) * minutes, 0, 0);
  return d.toISOString().slice(0, 16);
};
