"use client";

import { Star, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { btn, LESSON_KIND_VI } from "@/components/app/ui";
import { api, ApiError } from "@/lib/client/api";
import { sfx } from "@/lib/client/sfx";
import type { LessonResult, LessonStart, LessonView } from "@/lib/contracts/learn";
import { useMe } from "@/stores/meStore";
import { QuizHost } from "./QuizHost";
import { TrackLesson } from "./TrackLesson";
import { WordPopover } from "./WordPopover";
import { DialogueStep } from "./steps/DialogueStep";
import { FocusNote } from "./steps/FocusNote";
import { MistakeCards } from "./steps/MistakeCards";
import { TaskStep } from "./steps/TaskStep";
import { VocabCards } from "./steps/VocabCards";

type Phase = "content" | "quiz" | "finishing" | "result";

/** Kinds that open straight on their questions (no reading material first). */
const QUIZ_FIRST = new Set(["practice", "listening"]);

export function LessonPlayer({ lessonId }: { lessonId: number }) {
  const [view, setView] = useState<LessonView | null>(null);
  const [run, setRun] = useState<LessonStart | null>(null);
  const [phase, setPhase] = useState<Phase>("content");
  const [result, setResult] = useState<LessonResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setView(null);
    setRun(null);
    setResult(null);
    setError(null);
    void (async () => {
      try {
        await useMe.getState().load();
        const v = await api.get<LessonView>(`/api/lessons?id=${lessonId}`);
        const r = await api.post<LessonStart>("/api/lessons/start", { lessonId });
        if (cancelled) return;
        setView(v);
        setRun(r);
        setPhase(QUIZ_FIRST.has(v.kind) && r.sessionId ? "quiz" : "content");
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiError ? e.message : "Không mở được bài học");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  const finish = useCallback(async () => {
    if (!run) return;
    setPhase("finishing");
    try {
      const r = await api.post<LessonResult>("/api/lessons/complete", { runId: run.runId });
      useMe.getState().applyTotals(r.totals);
      if (r.passed) sfx.levelUp();
      setResult(r);
      setPhase("result");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không lưu được kết quả");
    }
  }, [run]);

  // After the reading part: quiz if the lesson has one, otherwise the lesson is done.
  const afterContent = useCallback(() => {
    if (run?.sessionId) setPhase("quiz");
    else void finish();
  }, [run, finish]);

  if (error)
    return (
      <Shell>
        <p className="text-bad">{error}</p>
        <Link href="/career" className={`${btn.secondary} mt-4`}>
          Về trang Học
        </Link>
      </Shell>
    );
  if (!view || !run) return <Shell>{<p className="text-muted">Đang mở bài học…</p>}</Shell>;
  // Grammar points and word sets have their own ForumFlash-style player.
  if (view.stage.track !== "career") return <TrackLesson view={view} run={run} />;

  const progress = phase === "content" ? 0.2 : phase === "quiz" ? 0.6 : 1;
  const c = view.content;

  return (
    <div className="min-h-dvh">
      <header className="border-line bg-paper/95 sticky top-0 z-10 border-b backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-4 px-4 py-3">
          <Link href="/career" aria-label="Thoát bài học" className={btn.ghost}>
            <X size={22} aria-hidden />
          </Link>
          <div
            className="bg-line h-2 flex-1 overflow-hidden rounded-full"
            role="progressbar"
            aria-valuenow={Math.round(progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Tiến độ bài học"
          >
            <div
              className="bg-amber h-full rounded-full transition-[width] duration-500"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <span className="text-muted text-sm">
            {view.index}/{view.total}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
        {phase !== "result" && (
          <div className="mb-6">
            <p className="text-muted text-sm">
              <span className="font-mono">{view.unit.code}</span> · {view.unit.title.vi} ·{" "}
              {LESSON_KIND_VI[view.kind]}
            </p>
            <h1 className="mt-1 text-[1.6rem] leading-tight font-bold">{view.title.vi}</h1>
            {view.title.en !== view.title.vi && <p className="text-muted">{view.title.en}</p>}
          </div>
        )}

        {phase === "content" && (
          <>
            {c.kind === "vocab" && (
              <VocabCards
                words={c.words}
                onDone={afterContent}
                doneLabel={run.sessionId ? "Kiểm tra nhanh" : "Hoàn thành"}
              />
            )}
            {c.kind === "focus" && (
              <>
                <FocusNote markdown={c.markdown} examples={c.examples} />
                <button onClick={afterContent} className={`${btn.primary} mt-8`}>
                  {run.sessionId ? "Luyện tập" : "Hoàn thành"}
                </button>
              </>
            )}
            {c.kind === "reading" && (
              <>
                <article className="border-line bg-surface rounded-2xl border p-5 leading-relaxed whitespace-pre-line">
                  {c.passage.text}
                </article>
                <p className="text-muted mt-2 text-sm">
                  {c.passage.adapted ? "Phỏng theo" : "Nguồn"}:{" "}
                  {c.passage.url ? (
                    <a href={c.passage.url} className="underline" target="_blank" rel="noreferrer">
                      {c.passage.source}
                    </a>
                  ) : (
                    c.passage.source
                  )}{" "}
                  · {c.passage.license}
                </p>
                <button onClick={afterContent} className={`${btn.primary} mt-6`}>
                  Trả lời câu hỏi
                </button>
              </>
            )}
            {c.kind === "mistakes" && (
              <>
                <MistakeCards items={c.items} />
                <button onClick={afterContent} className={`${btn.primary} mt-6`}>
                  Đã hiểu
                </button>
              </>
            )}
            {c.kind === "dialogue" && run.dialogue && (
              <DialogueStep
                initial={run.dialogue}
                characterId={view.unit.character}
                onDone={afterContent}
              />
            )}
            {c.kind === "task" && (
              <TaskStep task={c} runId={run.runId} onDone={() => void finish()} />
            )}
            {(c.kind === "practice" || c.kind === "listening") && (
              <button onClick={afterContent} className={btn.primary}>
                Bắt đầu
              </button>
            )}
          </>
        )}

        {phase === "quiz" && run.sessionId && (
          <QuizHost sessionId={run.sessionId} onDone={() => void finish()} />
        )}
        {phase === "finishing" && <p className="text-muted">Đang lưu kết quả…</p>}
        {phase === "result" && result && <ResultScreen view={view} result={result} />}
      </main>
      <WordPopover />
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-2xl px-4 py-16">{children}</main>;
}

function ResultScreen({ view, result }: { view: LessonView; result: LessonResult }) {
  const me = useMe((s) => s.home?.me);
  const next = result.next;
  const nextHref =
    next?.type === "lesson" && next.lesson
      ? `/lesson/${next.lesson.id}`
      : next?.type === "checkpoint"
        ? `/exam/checkpoint/${next.stage.id}`
        : "/career";
  return (
    <div role="status">
      {result.passed ? (
        <>
          <div className="flex gap-1" aria-label={`${result.stars}/3 sao`}>
            {[1, 2, 3].map((n) => (
              <Star
                key={n}
                size={36}
                className={n <= result.stars ? "fill-gold text-gold" : "text-line"}
                aria-hidden
              />
            ))}
          </div>
          <h1 className="mt-4 text-[1.75rem] font-bold">
            {result.unitCompleted
              ? `Xong unit ${view.unit.code}: ${view.unit.title.vi}`
              : "Hoàn thành bài học"}
          </h1>
          <p className="text-muted mt-2">
            Đúng {result.pct}%
            {result.xp > 0 ? ` · +${result.xp} XP` : result.first ? "" : " · đã nhận XP lần đầu"}
          </p>
          {result.totals?.goalMetNow && (
            <p className="bg-ok-soft mt-4 rounded-xl px-4 py-3 font-medium">
              Bạn đã đạt mục tiêu hôm nay. Streak: {result.totals.streak} ngày.
            </p>
          )}
          {me && !result.totals?.goalMetNow && me.todayXp < me.dailyGoal && (
            <p className="text-muted mt-4">
              Còn {me.dailyGoal - me.todayXp} XP nữa là đạt mục tiêu hôm nay.
            </p>
          )}
        </>
      ) : (
        <>
          <h1 className="text-[1.75rem] font-bold">Chưa qua bài này</h1>
          <p className="text-muted mt-2">
            Bạn đúng {result.pct}%, cần {view.passPct}% để qua. Các câu sai đã được đưa vào phần ôn
            tập. Làm lại ngay nhé.
          </p>
        </>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        {result.passed ? (
          <Link href={nextHref} className={btn.primary}>
            {next?.type === "lesson" && next.lesson
              ? `Tiếp: ${next.lesson.title.vi}`
              : next?.type === "checkpoint"
                ? "Làm bài checkpoint"
                : "Về trang Học"}
          </Link>
        ) : (
          <button onClick={() => location.reload()} className={btn.primary}>
            Làm lại
          </button>
        )}
        <Link href="/career/path" className={btn.secondary}>
          Xem lộ trình
        </Link>
      </div>
    </div>
  );
}
