"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SettingsForm } from "@/components/overlay/panels/SettingsPanel";
import { levelProgress } from "@/game/config/progression";
import { api, fetchBootstrap } from "@/lib/client/api";
import { ensureSession } from "@/lib/client/session";
import type { Bootstrap } from "@/lib/contracts/bootstrap";
import { createClient } from "@/lib/supabase/browser";

const RANK = {
  intern: "Intern",
  junior: "Junior",
  mid: "Mid",
  senior: "Senior",
  techlead: "Tech Lead",
};

/** GitHub-style contribution graph of daily XP over 12 weeks. */
function CommitGraph({ days }: { days: { local_date: string; xp: number }[] }) {
  const byDate = new Map(days.map((d) => [d.local_date, d.xp]));
  const today = new Date(Date.now() + 7 * 3600_000);
  const cells = Array.from({ length: 84 }, (_, i) => {
    const d = new Date(today.getTime() - (83 - i) * 86_400_000).toISOString().slice(0, 10);
    return { d, xp: byDate.get(d) ?? 0 };
  });
  const shade = (xp: number) =>
    xp === 0
      ? "bg-white/10"
      : xp < 50
        ? "bg-[#0e4429]"
        : xp < 150
          ? "bg-[#006d32]"
          : xp < 300
            ? "bg-[#26a641]"
            : "bg-[#39d353]";
  return (
    <div
      className="grid grid-flow-col grid-rows-7 gap-1"
      role="img"
      aria-label="Biểu đồ XP 12 tuần"
    >
      {cells.map((c) => (
        <span
          key={c.d}
          title={`${c.d}: ${c.xp} XP`}
          className={`h-3 w-3 rounded-sm ${shade(c.xp)}`}
        />
      ))}
    </div>
  );
}

export function ProfileClient() {
  const [boot, setBoot] = useState<Bootstrap | null>(null);
  const [days, setDays] = useState<{ local_date: string; xp: number }[]>([]);
  const [board, setBoard] = useState<
    { rank: number; display_name: string; xp: number; is_me: boolean }[]
  >([]);
  const [period, setPeriod] = useState<"week" | "all">("week");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    ensureSession().then(async () => {
      const b = await fetchBootstrap();
      setBoot(b);
      setName(b.profile.displayName ?? "");
      setDays(
        (await api.get<{ days: { local_date: string; xp: number }[] }>("/api/profile/activity"))
          .days,
      );
    });
  }, []);
  useEffect(() => {
    api
      .get<{ rows: typeof board }>(`/api/leaderboard?period=${period}`)
      .then((r) => setBoard(r.rows))
      .catch(() => {});
  }, [period]);

  if (!boot) return <p>Đang tải…</p>;
  const p = boot.profile;
  const prog = levelProgress(p.xpTotal);
  const saveName = async () => {
    await createClient()
      .from("profiles")
      .update({ display_name: name.trim().slice(0, 32) || null })
      .eq("id", (await createClient().auth.getUser()).data.user!.id);
  };

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Cấp bậc", `${RANK[p.rank]} · L${p.level}`],
          ["XP", `${p.xpTotal} (${prog.needed ? `${prog.current}/${prog.needed}` : "max"})`],
          ["Streak", `🔥 ${p.streak} · PTO ${p.ptoDays}/2`],
          ["Coffee Beans", `☕ ${p.coins}`],
        ].map(([k, v]) => (
          <div key={k} className="rounded bg-white/10 p-3">
            <p className="text-xs text-[#c9c6b5]">{k}</p>
            <p className="font-bold">{v}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Commit graph</h2>
        <CommitGraph days={days} />
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">🏁 Bảng xếp hạng</h2>
          <div className="flex gap-1 text-sm">
            {(["week", "all"] as const).map((x) => (
              <button
                key={x}
                onClick={() => setPeriod(x)}
                className={`rounded px-2 py-1 ${period === x ? "bg-[#f2a65a] text-[#1b1b28]" : "bg-white/10"}`}
              >
                {x === "week" ? "Tuần này" : "Mọi lúc"}
              </button>
            ))}
          </div>
        </div>
        {p.isGuest && (
          <p className="mb-2 text-sm text-[#c9c6b5]">
            Khách không xuất hiện trên bảng xếp hạng — hãy liên kết tài khoản.
          </p>
        )}
        <ol className="space-y-1">
          {board.map((r) => (
            <li
              key={r.rank}
              className={`flex justify-between rounded px-3 py-1 ${r.is_me ? "bg-[#f2a65a]/30" : "bg-white/5"}`}
            >
              <span>
                #{r.rank} {r.display_name}
              </span>
              <span>{r.xp} XP</span>
            </li>
          ))}
          {!board.length && <li className="text-sm text-[#c9c6b5]">Chưa có ai trên bảng.</li>}
        </ol>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">⚙️ Cài đặt</h2>
        <div className="text-[#1b1b28]">
          <SettingsForm />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">👤 Tài khoản</h2>
        <label className="flex gap-2 text-sm">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tên hiển thị"
            maxLength={32}
            className="flex-1 rounded px-2 py-1 text-[#1b1b28]"
          />
          <button onClick={saveName} className="rounded bg-white/10 px-3">
            Lưu tên
          </button>
        </label>
        {p.isGuest ? (
          <Link
            href="/login?next=/profile"
            className="inline-block rounded bg-[#f2a65a] px-4 py-2 font-semibold text-[#1b1b28]"
          >
            Liên kết email / Google để giữ tiến trình
          </Link>
        ) : (
          <button
            onClick={async () => {
              await createClient().auth.signOut();
              location.href = "/";
            }}
            className="rounded bg-white/10 px-4 py-2"
          >
            Đăng xuất
          </button>
        )}
        <div>
          <a href="/api/account/export" className="text-sm underline">
            Tải toàn bộ dữ liệu của tôi (JSON)
          </a>
        </div>
        <details className="rounded bg-white/5 p-3 text-sm">
          <summary className="cursor-pointer text-[#ff8a80]">Xóa tài khoản vĩnh viễn</summary>
          <p className="mt-2">
            Gõ <b>XOA TAI KHOAN</b> để xác nhận. Không thể hoàn tác.
          </p>
          <input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-2 rounded px-2 py-1 text-[#1b1b28]"
          />
          <button
            disabled={confirm !== "XOA TAI KHOAN"}
            onClick={async () => {
              await api.del("/api/account", { confirm });
              location.href = "/";
            }}
            className="ml-2 rounded bg-[#c62828] px-3 py-1 text-white disabled:opacity-40"
          >
            Xóa
          </button>
        </details>
      </section>
    </div>
  );
}
