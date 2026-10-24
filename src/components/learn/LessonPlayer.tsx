"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { btn } from "@/components/app/ui";
import { api, ApiError } from "@/lib/client/api";
import type { LessonStart, LessonView } from "@/lib/contracts/learn";
import { useMe } from "@/stores/meStore";
import { TrackLesson } from "./TrackLesson";

/** Loads a lesson and starts (or resumes) its run, then hands over to the track player. */
export function LessonPlayer({ lessonId }: { lessonId: number }) {
  const [view, setView] = useState<LessonView | null>(null);
  const [run, setRun] = useState<LessonStart | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setView(null);
    setRun(null);
    setError(null);
    void (async () => {
      try {
        await useMe.getState().load();
        const v = await api.get<LessonView>(`/api/lessons?id=${lessonId}`);
        const r = await api.post<LessonStart>("/api/lessons/start", { lessonId });
        if (cancelled) return;
        setView(v);
        setRun(r);
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiError ? e.message : "Không mở được bài học");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  if (error)
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <p className="text-bad">{error}</p>
        <Link href="/" className={`${btn.secondary} mt-4`}>
          Về trang chủ
        </Link>
      </main>
    );
  if (!view || !run)
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <p className="text-muted">Đang mở bài học…</p>
      </main>
    );
  return <TrackLesson view={view} run={run} />;
}
