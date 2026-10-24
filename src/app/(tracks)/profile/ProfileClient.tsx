"use client";

import { Award } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SettingsForm } from "@/components/app/SettingsForm";
import { btn } from "@/components/app/ui";
import { api } from "@/lib/client/api";
import { createClient } from "@/lib/supabase/browser";
import { useMe } from "@/stores/meStore";
import { growthStage } from "@/components/app/GrowthTree";
import { toast } from "@/stores/toastStore";

const GOALS = [
  { xp: 10, label: "Nhẹ nhàng", minutes: 5 },
  { xp: 20, label: "Đều đặn", minutes: 10 },
  { xp: 30, label: "Nghiêm túc", minutes: 15 },
  { xp: 50, label: "Tăng tốc", minutes: 25 },
] as const;

/** Twelve weeks of study, one cell per day; violet when the daily goal was met. */
function ActivityGraph({
  days,
  goal,
}: {
  days: { local_date: string; xp: number }[];
  goal: number;
}) {
  const byDate = new Map(days.map((d) => [d.local_date, d.xp]));
  const today = new Date(Date.now() + 7 * 3600_000);
  const cells = Array.from({ length: 84 }, (_, i) => {
    const d = new Date(today.getTime() - (83 - i) * 86_400_000).toISOString().slice(0, 10);
    return { d, xp: byDate.get(d) ?? 0 };
  });
  const shade = (xp: number) =>
    xp === 0
      ? "bg-line/60"
      : xp < goal
        ? "bg-merged/35"
        : xp < goal * 2
          ? "bg-merged/70"
          : "bg-merged";
  const active = cells.filter((c) => c.xp >= goal).length;
  return (
    <div>
      <div
        className="grid w-max grid-flow-col grid-rows-7 gap-1"
        role="img"
        aria-label={`${active} ngày đạt mục tiêu trong 12 tuần`}
      >
        {cells.map((c) => (
          <span
            key={c.d}
            title={`${c.d}: ${c.xp} XP`}
            className={`h-3 w-3 rounded-[3px] ${shade(c.xp)}`}
          />
        ))}
      </div>
      <p className="text-muted mt-2 text-sm">{active} ngày đạt mục tiêu trong 12 tuần qua</p>
    </div>
  );
}

interface Cert {
  id: string;
  score_pct: number;
  issued_at: string;
  stages: { title_vi: string; cefr: string };
}

export function ProfileClient() {
  const home = useMe((s) => s.home);
  const [days, setDays] = useState<{ local_date: string; xp: number }[]>([]);
  const [certs, setCerts] = useState<Cert[]>([]);
  const [extra, setExtra] = useState<{
    longest: number;
    words: number;
    accuracy: number | null;
  } | null>(null);
  const [name, setName] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    const db = createClient();
    void (async () => {
      setDays(
        (await api.get<{ days: { local_date: string; xp: number }[] }>("/api/profile/activity"))
          .days,
      );
      const { data: p } = await db.from("profiles").select("display_name, streak_longest").single();
      const { count } = await db
        .from("user_cards")
        .select("sense_id", { count: "exact", head: true });
      // Accuracy over every graded answer (RLS limits both counts to the learner's own rows).
      const [{ count: answered }, { count: right }] = await Promise.all([
        db.from("user_answers").select("id", { count: "exact", head: true }),
        db.from("user_answers").select("id", { count: "exact", head: true }).eq("is_correct", true),
      ]);
      const { data: c } = await db
        .from("certificates")
        .select("id, score_pct, issued_at, stages(title_vi, cefr)")
        .order("issued_at");
      setName(p?.display_name ?? "");
      setExtra({
        longest: p?.streak_longest ?? 0,
        words: count ?? 0,
        accuracy: answered ? Math.round((100 * (right ?? 0)) / answered) : null,
      });
      setCerts((c ?? []) as unknown as Cert[]);
    })();
  }, []);

  if (!home) return null;
  const me = home.me;

  const setGoal = async (xp: number) => {
    const db = createClient();
    const { data } = await db.auth.getUser();
    const { error } = await db
      .from("profiles")
      .update({ daily_goal_xp: xp })
      .eq("id", data.user!.id);
    if (error) return toast("Không lưu được mục tiêu");
    await useMe.getState().load();
    toast("Đã đổi mục tiêu hằng ngày");
  };
  const saveName = async () => {
    const db = createClient();
    const { data } = await db.auth.getUser();
    await db
      .from("profiles")
      .update({ display_name: name.trim().slice(0, 32) || null })
      .eq("id", data.user!.id);
    toast("Đã lưu tên hiển thị");
  };

  const stats = [
    { label: "Tổng XP", value: me.xpTotal.toLocaleString("vi-VN") },
    { label: "Streak hiện tại", value: `${me.streak} ngày` },
    { label: "Streak dài nhất", value: `${extra?.longest ?? "–"} ngày` },
    { label: "Từ trong sổ tay", value: extra?.words ?? "–" },
    { label: "Unit đã xong", value: `${home.overall.done}/${home.overall.total}` },
    { label: "Độ chính xác", value: extra?.accuracy == null ? "–" : `${extra.accuracy}%` },
  ];
  const tree = growthStage(home.growth.xp, home.growth.max);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-[1.75rem] font-bold">
          {me.displayName ?? (me.isGuest ? "Khách" : "Hồ sơ")}
        </h1>
        {me.isGuest && (
          <p className="text-muted mt-1">
            Bạn đang học với tư cách khách. Liên kết tài khoản để không mất tiến trình.
          </p>
        )}
      </header>

      <section aria-label="Thống kê" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="border-line bg-surface rounded-xl border p-3">
            <p className="text-lg font-bold">{s.value}</p>
            <p className="text-muted text-sm">{s.label}</p>
          </div>
        ))}
      </section>

      {home.tracks.length > 0 && (
        <section aria-labelledby="journey">
          <h2 id="journey" className="text-xl font-bold">
            Hành trình của bạn
          </h2>
          <p className="text-muted">Kết quả đã lưu trên các lộ trình ngữ pháp và từ vựng.</p>
          <ul className="mt-3 space-y-3">
            {home.tracks.map((t) => {
              const pct = Math.round((100 * t.lessons.done) / Math.max(1, t.lessons.total));
              return (
                <li key={t.track}>
                  <p className="flex justify-between text-sm">
                    <span>
                      {t.track === "grammar" ? "Ngữ pháp" : "Từ vựng"} {t.lessons.done}/
                      {t.lessons.total} bài
                    </span>
                    <strong>{pct}%</strong>
                  </p>
                  <div className="bg-line mt-1 h-1.5 overflow-hidden rounded-full">
                    <div className="bg-merged h-full rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-sm">
            Giai đoạn cây hiện tại: <strong>{tree.label}</strong> · {tree.pct}% toàn khoá học
          </p>
        </section>
      )}

      <section aria-labelledby="activity">
        <h2 id="activity" className="mb-3 text-xl font-bold">
          Hoạt động
        </h2>
        <div className="overflow-x-auto">
          <ActivityGraph days={days} goal={me.dailyGoal} />
        </div>
      </section>

      <section aria-labelledby="goal">
        <h2 id="goal" className="text-xl font-bold">
          Mục tiêu hằng ngày
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {GOALS.map((g) => (
            <button
              key={g.xp}
              onClick={() => setGoal(g.xp)}
              aria-pressed={me.dailyGoal === g.xp}
              className={`rounded-xl border-2 p-3 text-left ${
                me.dailyGoal === g.xp
                  ? "border-amber bg-amber-soft"
                  : "border-line bg-surface hover:bg-paper"
              }`}
            >
              <p className="font-semibold">{g.label}</p>
              <p className="text-muted text-sm">
                {g.xp} XP · ~{g.minutes} phút
              </p>
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="certs">
        <h2 id="certs" className="text-xl font-bold">
          Chứng nhận
        </h2>
        {certs.length ? (
          <ul className="mt-3 space-y-2">
            {certs.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/certificate/${c.id}`}
                  className="border-line bg-surface hover:border-merged flex items-center gap-3 rounded-xl border p-3"
                >
                  <Award className="text-merged" aria-hidden />
                  <span className="font-semibold">
                    {c.stages.title_vi} · {c.stages.cefr}
                  </span>
                  <span className="text-muted ml-auto text-sm">{c.score_pct}%</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted mt-2">
            Hoàn thành bài checkpoint cuối mỗi chặng để nhận chứng nhận.
          </p>
        )}
      </section>

      <section aria-labelledby="settings">
        <h2 id="settings" className="mb-3 text-xl font-bold">
          Cài đặt
        </h2>
        <SettingsForm />
      </section>

      <section aria-labelledby="account" className="space-y-4">
        <h2 id="account" className="text-xl font-bold">
          Tài khoản
        </h2>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tên hiển thị trên chứng nhận"
            aria-label="Tên hiển thị"
            maxLength={32}
            className="border-line bg-surface min-w-0 flex-1 rounded-lg border px-3 py-2"
          />
          <button onClick={saveName} className={btn.secondary}>
            Lưu tên
          </button>
        </div>
        {me.isGuest ? (
          <Link href="/login?next=/profile" className={btn.primary}>
            Liên kết email hoặc Google
          </Link>
        ) : (
          <button
            onClick={async () => {
              await createClient().auth.signOut();
              location.href = "/";
            }}
            className={btn.secondary}
          >
            Đăng xuất
          </button>
        )}
        <p>
          <a href="/api/account/export" className="text-muted text-sm underline">
            Tải toàn bộ dữ liệu của tôi (JSON)
          </a>
        </p>
        <details className="border-line rounded-xl border p-4 text-sm">
          <summary className="text-bad cursor-pointer font-medium">Xóa tài khoản vĩnh viễn</summary>
          <p className="mt-2">
            Gõ <b>XOA TAI KHOAN</b> để xác nhận. Toàn bộ tiến trình sẽ bị xóa và không thể khôi
            phục.
          </p>
          <div className="mt-2 flex gap-2">
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              aria-label="Xác nhận xóa"
              className="border-line bg-surface rounded-lg border px-3 py-1.5"
            />
            <button
              disabled={confirm !== "XOA TAI KHOAN"}
              onClick={async () => {
                await api.del("/api/account", { confirm });
                location.href = "/";
              }}
              className="bg-bad rounded-lg px-3 py-1.5 font-semibold text-white disabled:opacity-40"
            >
              Xóa tài khoản
            </button>
          </div>
        </details>
      </section>
    </div>
  );
}
