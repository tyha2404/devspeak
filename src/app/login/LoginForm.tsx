"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { publicEnv } from "@/env";
import { createClient } from "@/lib/supabase/browser";

/**
 * Sign in with a magic link or Google. A guest upgrading keeps the same user id
 * (updateUser for email, linkIdentity for Google), so no progress is lost.
 */
export function LoginForm({ next }: { next: string }) {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setIsGuest(!!data.user?.is_anonymous));
  }, [supabase]);

  const redirectTo = `${publicEnv.NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`;

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("sending");
    const { error } = isGuest
      ? await supabase.auth.updateUser({ email }, { emailRedirectTo: redirectTo })
      : await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
    if (error && isGuest && error.message.toLowerCase().includes("already")) {
      // The email belongs to an existing account: sign into it and merge this guest afterwards.
      const { data } = await supabase.auth.getSession();
      try {
        if (data.session) sessionStorage.setItem("dq:merge-guest", data.session.access_token);
      } catch {}
      await supabase.auth.signOut();
      const retry = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (retry.error) {
        setState("error");
        setMessage(retry.error.message);
      } else {
        setState("sent");
        setMessage(
          "Email này đã có tài khoản: sau khi đăng nhập, tiến trình khách sẽ được gộp vào.",
        );
      }
    } else if (error) {
      setState("error");
      setMessage(error.message);
    } else setState("sent");
  };

  const google = async () => {
    const { error } = isGuest
      ? await supabase.auth.linkIdentity({ provider: "google", options: { redirectTo } })
      : await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (error) {
      setState("error");
      setMessage(error.message);
    }
  };

  return (
    <div className="space-y-4">
      {isGuest && (
        <p className="rounded bg-[#fff3c4] p-3 text-sm text-[#1b1b28]">
          Bạn đang chơi với tư cách khách. Liên kết email hoặc Google để giữ tiến trình trên mọi
          thiết bị.
        </p>
      )}
      <form onSubmit={sendLink} className="space-y-2">
        <label className="block text-sm">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border border-[#5c5c7a] bg-white px-3 py-2 text-[#1b1b28]"
            autoComplete="email"
          />
        </label>
        <button
          disabled={state === "sending"}
          className="w-full rounded bg-[#f2a65a] py-2 font-semibold text-[#1b1b28]"
        >
          {isGuest ? "Liên kết email" : "Gửi link đăng nhập"}
        </button>
      </form>
      <button onClick={google} className="w-full rounded border border-[#f4f1de] py-2">
        {isGuest ? "Liên kết Google" : "Đăng nhập với Google"}
      </button>
      {state === "sent" && (
        <p role="status">📬 Kiểm tra hộp thư và bấm vào link để tiếp tục. {message}</p>
      )}
      {state === "error" && (
        <p role="alert" className="text-[#ff8a80]">
          {message}
        </p>
      )}
      <Link href="/" className="block text-center text-sm underline">
        Học tiếp với tư cách khách
      </Link>
    </div>
  );
}
