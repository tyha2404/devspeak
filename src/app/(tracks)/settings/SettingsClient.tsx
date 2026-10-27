"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SettingsForm } from "@/components/app/SettingsForm";
import { btn } from "@/components/app/ui";
import { api } from "@/lib/client/api";
import { signOut } from "@/lib/client/auth";
import { createClient } from "@/lib/supabase/browser";
import { useMe } from "@/stores/meStore";
import { toast } from "@/stores/toastStore";

const GOALS = [
  { xp: 10, label: "Nhẹ nhàng", minutes: 5 },
  { xp: 20, label: "Đều đặn", minutes: 10 },
  { xp: 30, label: "Nghiêm túc", minutes: 15 },
  { xp: 50, label: "Tăng tốc", minutes: 25 },
] as const;

/** Daily goal, app preferences and account actions, split out of the profile page. */
export function SettingsClient() {
  const home = useMe((s) => s.home);
  const [name, setName] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    void (async () => {
      const { data: p } = await createClient().from("profiles").select("display_name").single();
      setName(p?.display_name ?? "");
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
    const { error } = await db
      .from("profiles")
      .update({ display_name: name.trim().slice(0, 32) || null })
      .eq("id", data.user!.id);
    if (error) return toast("Không lưu được tên hiển thị");
    await useMe.getState().load();
    toast("Đã lưu tên hiển thị");
  };

  return (
    <div className="dq-page-enter space-y-4 sm:space-y-8">
      <header>
        <h1 className="text-[1.75rem] font-bold">Cài đặt</h1>
        <p className="text-muted mt-1">
          Mục tiêu học, giao diện, âm thanh và tài khoản.{" "}
          <Link href="/profile" className="underline">
            Xem trang cá nhân
          </Link>
        </p>
      </header>

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

      <section aria-labelledby="settings">
        <h2 id="settings" className="mb-3 text-xl font-bold">
          Giao diện & âm thanh
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
            placeholder="Tên hiển thị"
            aria-label="Tên hiển thị"
            maxLength={32}
            className="border-line bg-surface min-w-0 flex-1 rounded-lg border px-3 py-2"
          />
          <button onClick={saveName} className={btn.secondary}>
            Lưu tên
          </button>
        </div>
        {!me.isGuest && (
          <div className="flex flex-wrap gap-2">
            <Link href="/account/password" className={btn.secondary}>
              Đổi mật khẩu
            </Link>
            <button
              onClick={() =>
                void signOut().catch(() => toast("Không đăng xuất được. Hãy thử lại."))
              }
              className={btn.secondary}
            >
              Đăng xuất
            </button>
          </div>
        )}
        <p>
          <a href="/api/account/export" className="text-muted text-sm underline">
            Tải toàn bộ dữ liệu của tôi (JSON)
          </a>
        </p>
        <details className="border-line rounded-xl border p-4 text-sm">
          <summary className="text-bad flex min-h-11 cursor-pointer items-center font-medium">
            Xóa tài khoản vĩnh viễn
          </summary>
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
