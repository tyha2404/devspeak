"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Spinner } from "@/components/app/LoadingState";
import { btn } from "@/components/app/ui";
import { publicEnv } from "@/env";
import { mergeRememberedGuest, rememberGuest } from "@/lib/client/auth";
import { createClient } from "@/lib/supabase/browser";
import { useMe } from "@/stores/meStore";

type Mode = "login" | "signup" | "forgot";

const field =
  "border-line bg-surface focus:border-amber mt-1 w-full rounded-xl border px-3 py-2.5 outline-none transition-colors duration-150 disabled:opacity-60";

/**
 * Sign in or sign up with email + password; reset a forgotten
 * password. A guest's progress is merged into the account it signs into.
 */
export function LoginForm({ next, initialMode }: { next: string; initialMode: Mode }) {
  const supabase = createClient();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [navigating, startNavigation] = useTransition();
  const pending = busy || navigating;
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setIsGuest(!!data.user?.is_anonymous));
  }, [supabase]);

  const callback = (to: string) =>
    `${publicEnv.NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent(to)}`;

  /** A session now exists: carry the guest's progress over and go on. */
  const done = async () => {
    await mergeRememberedGuest();
    await useMe.getState().load();
    startNavigation(() => {
      router.replace(next);
      router.refresh();
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await rememberGuest();
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: callback("/account/password"),
        });
        if (error) throw error;
        setNotice("Đã gửi email đặt lại mật khẩu. Mở email và bấm vào link để đặt mật khẩu mới.");
        return;
      }
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: callback(next),
            data: { display_name: name.trim() || undefined },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setNotice("Gần xong! Mở email và bấm vào link xác nhận để kích hoạt tài khoản.");
          return;
        }
        await done();
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await done();
    } catch (err) {
      setError(translate(err instanceof Error ? err.message : String(err)));
    } finally {
      setBusy(false);
    }
  };

  const changeMode = (mode: Mode) => {
    setMode(mode);
    setError(null);
    setNotice(null);
    setPassword("");
  };

  const title = {
    login: "Đăng nhập",
    signup: "Tạo tài khoản",
    forgot: "Quên mật khẩu",
  }[mode];

  return (
    <div className="dq-enter border-line bg-surface rounded-3xl border p-6 shadow-sm sm:p-8">
      <p className="text-merged text-xs font-semibold tracking-[0.14em] uppercase">
        Tài khoản học tập
      </p>
      <h1 className="mt-1 text-[2rem] leading-tight">{title}</h1>
      {isGuest && (mode === "login" || mode === "signup") && (
        <p className="bg-merged-soft mt-3 rounded-xl px-4 py-3 text-sm">
          Tiến độ bạn đã học với tư cách khách sẽ được chuyển vào tài khoản.
        </p>
      )}

      {(mode === "login" || mode === "signup") && (
        <div
          role="tablist"
          aria-label="Chọn"
          className="bg-paper mt-5 grid grid-cols-2 rounded-xl p-1"
        >
          {(["login", "signup"] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              disabled={pending}
              onClick={() => changeMode(m)}
              className={`rounded-lg py-2 text-sm font-semibold ${
                mode === m ? "bg-surface shadow-sm" : "text-muted"
              }`}
            >
              {m === "login" ? "Đăng nhập" : "Đăng ký"}
            </button>
          ))}
        </div>
      )}

      <form key={mode} onSubmit={submit} aria-busy={pending} className="dq-enter mt-5 space-y-3">
        {mode === "signup" && (
          <label className="block text-sm font-medium">
            Tên hiển thị
            <input
              value={name}
              disabled={pending}
              onChange={(e) => setName(e.target.value)}
              maxLength={32}
              autoComplete="name"
              className={field}
            />
          </label>
        )}
        <label className="block text-sm font-medium">
          Email
          <input
            type="email"
            disabled={pending}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className={field}
          />
        </label>
        {(mode === "login" || mode === "signup") && (
          <label className="block text-sm font-medium">
            Mật khẩu
            <input
              type="password"
              disabled={pending}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className={field}
            />
          </label>
        )}
        {mode === "login" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => changeMode("forgot")}
            className="text-muted text-sm underline"
          >
            Quên mật khẩu?
          </button>
        )}
        <button disabled={pending} className={`${btn.primary} w-full`}>
          {pending && <Spinner />}
          <span aria-live="polite">
            {navigating
              ? "Đang mở trang học…"
              : busy
                ? mode === "login"
                  ? "Đang đăng nhập…"
                  : mode === "signup"
                    ? "Đang tạo tài khoản…"
                    : "Đang gửi email…"
                : mode === "login"
                  ? "Đăng nhập"
                  : mode === "signup"
                    ? "Tạo tài khoản"
                    : "Gửi email đặt lại mật khẩu"}
          </span>
        </button>
      </form>

      {error && (
        <p role="alert" className="dq-enter bg-bad-soft text-bad mt-4 rounded-xl px-4 py-3 text-sm">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="dq-enter bg-ok-soft mt-4 rounded-xl px-4 py-3 text-sm">
          {notice}
        </p>
      )}

      {mode === "forgot" && (
        <button
          disabled={pending}
          onClick={() => changeMode("login")}
          className="text-muted mt-4 text-sm underline"
        >
          ← Quay lại đăng nhập
        </button>
      )}

      <Link href="/" className="text-muted mt-6 block text-center text-sm underline">
        Học tiếp với tư cách khách
      </Link>
    </div>
  );
}

/** Supabase auth errors in Vietnamese (the common ones). */
function translate(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email hoặc mật khẩu không đúng.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Email này đã có tài khoản. Hãy đăng nhập.";
  if (m.includes("email not confirmed"))
    return "Email chưa được xác nhận. Hãy mở link trong email.";
  if (m.includes("password should be at least")) return "Mật khẩu cần ít nhất 6 ký tự.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Bạn thao tác quá nhanh, thử lại sau ít phút.";
  return message;
}
