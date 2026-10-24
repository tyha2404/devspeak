import type { Metadata } from "next";
import { TracksHeader } from "@/components/app/TracksHeader";
import { safeAuthNext } from "@/lib/auth/redirect";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Đăng nhập · DevQuest English",
  robots: { index: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; mode?: string; error?: string }>;
}) {
  const { next, mode, error } = await searchParams;
  const safeNext = safeAuthNext(next);
  return (
    <div className="min-h-dvh">
      <TracksHeader />
      <main className="mx-auto max-w-md px-4 py-10">
        {error && (
          <p role="alert" className="bg-bad-soft text-bad mb-4 rounded-xl px-4 py-3 text-sm">
            Link đã hết hạn hoặc không hợp lệ. Hãy thử lại.
          </p>
        )}
        <LoginForm next={safeNext} initialMode={mode === "signup" ? "signup" : "login"} />
      </main>
    </div>
  );
}
