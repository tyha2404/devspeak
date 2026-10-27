"use client";

import Link from "next/link";
import { useState } from "react";
import { btn } from "@/components/app/ui";
import { Spinner } from "@/components/app/LoadingState";
import { createClient } from "@/lib/supabase/browser";
import { useMe } from "@/stores/meStore";

const field =
  "border-line bg-surface focus:border-amber mt-1 w-full rounded-xl border px-3 py-2.5 outline-none";

/** Set a new password: after a reset link, or from the profile while signed in. */
export function PasswordForm() {
  const me = useMe((s) => s.home?.me);
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  if (me?.isGuest)
    return (
      <div className="mx-auto max-w-md">
        <h1 className="text-[2rem]">Đặt mật khẩu</h1>
        <p className="text-muted mt-2">Link đã hết hạn. Hãy yêu cầu email đặt lại mật khẩu mới.</p>
        <Link href="/login" className={`${btn.primary} mt-6`}>
          Về trang đăng nhập
        </Link>
      </div>
    );

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === "saving") return;
    setError(null);
    if (password !== again) return setError("Hai mật khẩu chưa khớp.");
    setState("saving");
    try {
      const { data, error: sessionError } = await createClient().auth.getUser();
      if (sessionError || !data.user || data.user.is_anonymous) {
        throw new Error("Phiên đăng nhập đã hết hạn. Hãy yêu cầu email đặt lại mật khẩu mới.");
      }
      const { error } = await createClient().auth.updateUser({ password });
      if (error) throw error;
      setState("saved");
    } catch (err) {
      setState("idle");
      setError(err instanceof Error ? err.message : "Không lưu được mật khẩu. Hãy thử lại.");
    }
  };

  return (
    <div className="border-line bg-surface mx-auto max-w-md rounded-3xl border p-4 sm:p-8">
      <h1 className="text-[2rem] leading-tight">Đặt mật khẩu mới</h1>
      {me?.email && <p className="text-muted mt-1 text-sm">Tài khoản: {me.email}</p>}
      {state === "saved" ? (
        <>
          <p role="status" className="bg-ok-soft mt-5 rounded-xl px-4 py-3 text-sm">
            Đã lưu mật khẩu mới.
          </p>
          <Link href="/settings" className={`${btn.primary} mt-5`}>
            Về cài đặt
          </Link>
        </>
      ) : (
        <form onSubmit={save} aria-busy={state === "saving"} className="mt-5 space-y-3">
          <label className="block text-sm font-medium">
            Mật khẩu mới
            <input
              type="password"
              disabled={state === "saving"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className={field}
            />
          </label>
          <label className="block text-sm font-medium">
            Nhập lại mật khẩu
            <input
              type="password"
              disabled={state === "saving"}
              required
              minLength={6}
              value={again}
              onChange={(e) => setAgain(e.target.value)}
              autoComplete="new-password"
              className={field}
            />
          </label>
          {error && (
            <p role="alert" className="bg-bad-soft text-bad rounded-xl px-4 py-3 text-sm">
              {error}
            </p>
          )}
          <button disabled={state === "saving"} className={`${btn.primary} w-full`}>
            {state === "saving" && <Spinner />}
            <span aria-live="polite">{state === "saving" ? "Đang lưu…" : "Lưu mật khẩu"}</span>
          </button>
        </form>
      )}
    </div>
  );
}
