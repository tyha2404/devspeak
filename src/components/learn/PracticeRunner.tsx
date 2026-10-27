"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { btn } from "@/components/app/ui";
import { TracksHeader } from "@/components/app/TracksHeader";
import { api, ApiError } from "@/lib/client/api";
import type { SessionDone } from "@/lib/contracts/quiz";
import { useMe } from "@/stores/meStore";
import { TrackQuiz } from "./TrackQuiz";

/** Untimed practice over a passed lesson: score only, no stars, XP or progress. */
export function PracticeRunner({ lessonId }: { lessonId: number }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [done, setDone] = useState<SessionDone | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [round, setRound] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setSessionId(null);
    setDone(null);
    void (async () => {
      try {
        await useMe.getState().load();
        const r = await api.post<{ sessionId: string }>("/api/lessons/practice", { lessonId });
        if (!cancelled) setSessionId(r.sessionId);
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiError ? e.message : "Không bắt đầu được");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId, round]);

  return (
    <div className="min-h-dvh">
      <TracksHeader />
      <main className="mx-auto max-w-3xl px-4 py-4 sm:py-10">
        {error && <p className="text-bad mb-4">{error}</p>}
        {sessionId && !done && (
          <TrackQuiz
            key={sessionId}
            sessionId={sessionId}
            label="Luyện tập (không tính giờ)"
            bands={false}
            onDone={setDone}
          />
        )}
        {done && (
          <div data-testid="practice-result" className="text-center">
            <p className="text-muted text-sm font-semibold tracking-wide uppercase">
              Luyện tập · không tính điểm
            </p>
            <p className="mt-2 text-5xl font-bold">
              {done.correct}/{done.total}
            </p>
            <p className="text-muted mt-2">
              {Math.round((100 * done.correct) / Math.max(1, done.total))}% câu đúng
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button onClick={() => setRound((n) => n + 1)} className={btn.primary}>
                Luyện tập lại
              </button>
              <Link href={`/lesson/${lessonId}`} className={btn.secondary}>
                Về bài học
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
