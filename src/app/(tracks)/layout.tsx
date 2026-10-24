"use client";

import { useEffect, type ReactNode } from "react";
import { Toasts } from "@/components/app/Toasts";
import { TracksHeader } from "@/components/app/TracksHeader";
import { useMe } from "@/stores/meStore";

/**
 * The app shell ("/" and below): the ForumFlash-style top bar with the account menu.
 * Visitors start straight away as guests; there is no onboarding.
 */
export default function TracksLayout({ children }: { children: ReactNode }) {
  const home = useMe((s) => s.home);
  const load = useMe((s) => s.load);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <div className="min-h-dvh">
      <TracksHeader />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-10">
        {home ? children : <p className="text-muted">Đang tải…</p>}
      </main>
      <Toasts />
    </div>
  );
}
