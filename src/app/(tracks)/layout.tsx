"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { LoadingState } from "@/components/app/LoadingState";
import { btn } from "@/components/app/ui";
import { Toasts } from "@/components/app/Toasts";
import { TracksHeader } from "@/components/app/TracksHeader";
import { mergeRememberedGuest } from "@/lib/client/auth";
import { useMe } from "@/stores/meStore";

/**
 * The app shell ("/" and below): the ForumFlash-style top bar with the account menu.
 * Visitors start straight away as guests; there is no onboarding.
 */
export default function TracksLayout({ children }: { children: ReactNode }) {
  const home = useMe((s) => s.home);
  const load = useMe((s) => s.load);
  const [ready, setReady] = useState(false);
  const [startupError, setStartupError] = useState(false);
  const initialize = useCallback(async () => {
    // Finish a guest merge before any page reads the account's learning history.
    try {
      await mergeRememberedGuest();
      return (await load()) !== null;
    } catch {
      return false;
    }
  }, [load]);
  useEffect(() => {
    let active = true;
    void initialize().then((success) => {
      if (active) {
        setStartupError(!success);
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, [initialize]);
  return (
    <div className="min-h-dvh">
      <TracksHeader />
      <main className="mx-auto max-w-6xl min-w-0 px-4 py-4 [overflow-wrap:anywhere] sm:px-6 sm:py-6 md:py-10">
        {!ready ? (
          <LoadingState />
        ) : startupError || !home ? (
          <div className="border-line bg-surface mx-auto max-w-md rounded-2xl border p-4 sm:p-6">
            <h1 className="text-xl">Chưa tải được dữ liệu học tập</h1>
            <p role="alert" className="text-muted mt-2 text-sm">
              Kiểm tra kết nối mạng rồi thử lại. Tiến độ đã lưu của bạn vẫn được giữ.
            </p>
            <button
              className={`${btn.primary} mt-5`}
              onClick={async () => {
                setReady(false);
                const success = await initialize();
                setStartupError(!success);
                setReady(true);
              }}
            >
              Thử lại
            </button>
          </div>
        ) : (
          children
        )}
      </main>
      <Toasts />
    </div>
  );
}
