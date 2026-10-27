"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { btn } from "@/components/app/ui";
import { api, ApiError } from "@/lib/client/api";
import { sfx } from "@/lib/client/sfx";
import type { LessonResult, LessonStart, LessonView } from "@/lib/contracts/learn";
import { TracksHeader } from "@/components/app/TracksHeader";
import { useMe } from "@/stores/meStore";
import { GrammarStudy } from "./steps/GrammarStudy";
import { TrackCards } from "./steps/TrackCards";
import { TestIntro, TrackResult, TrackStepper } from "./TrackParts";
import { TrackQuiz } from "./TrackQuiz";
import { LessonPendingState } from "./LessonLoading";

type Phase = "study" | "intro" | "quiz" | "finishing" | "result";

/** A grammar point or word set from a study track: study phase, timed test, score card. */
export function TrackLesson({ view, run }: { view: LessonView; run: LessonStart }) {
  const [phase, setPhase] = useState<Phase>("study");
  const [result, setResult] = useState<LessonResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const trackHref = `/${view.stage.track}`;
  const grammar = view.content.kind === "grammar";

  const finish = useCallback(async () => {
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
  }, [run.runId]);

  const startTest = useCallback(() => {
    if (run.sessionId) setPhase("quiz");
    else void finish();
  }, [run.sessionId, finish]);

  const c = view.content;
  const next = result?.next;
  return (
    <div className="min-h-dvh">
      <TracksHeader focus />
      <TrackStepper
        exitHref={trackHref}
        phase={phase === "study" ? 0 : phase === "result" ? 2 : 1}
      />
      <main
        key={phase}
        className="dq-page-enter mx-auto max-w-3xl min-w-0 px-4 py-4 [overflow-wrap:anywhere] sm:py-10"
      >
        {error && <p className="text-bad mb-4">{error}</p>}
        {phase === "study" && (
          <>
            {c.kind === "grammar" && (
              <GrammarStudy
                grammar={c.grammar}
                cefr={view.unit.code}
                questionCount={view.questionCount}
                passPct={view.passPct}
                onDone={startTest}
              />
            )}
            {c.kind === "vocab" && (
              <TrackCards
                words={c.words}
                topic={view.unit.title.en}
                onDone={() => setPhase("intro")}
              />
            )}
          </>
        )}
        {phase === "intro" && (
          <TestIntro
            eyebrow="Phần học đã hoàn thành"
            title="Bài kiểm tra từ vựng"
            text={`Bài kiểm tra gồm ${view.questionCount} câu về các từ vừa học. Từ trả lời chưa đúng nằm sẵn trong sổ ôn tập.`}
            total={view.questionCount}
            passPct={view.passPct}
          >
            <button onClick={startTest} className={btn.primary} autoFocus>
              Làm bài kiểm tra →
            </button>
          </TestIntro>
        )}
        {phase === "quiz" && run.sessionId && (
          <TrackQuiz
            sessionId={run.sessionId}
            label={grammar ? "Bài kiểm tra ngữ pháp" : "Bài kiểm tra từ vựng"}
            bands={grammar}
            onDone={() => void finish()}
          />
        )}
        {phase === "finishing" && !error && <LessonPendingState saving />}
        {phase === "result" && result && (
          <TrackResult
            title={view.title.en}
            passed={result.passed}
            pct={result.pct}
            stars={result.passed ? result.stars : 0}
            xp={result.xp}
            correct={result.correct ?? 0}
            total={result.total ?? view.questionCount}
            passPct={view.passPct}
            note={
              result.passed && !result.first && result.xp === 0
                ? "Bạn đã nhận XP của bài này hôm nay; học lại vẫn nâng được số sao."
                : undefined
            }
            actions={
              result.passed ? (
                <>
                  <Link
                    href={next?.lesson ? `/lesson/${next.lesson.id}` : trackHref}
                    className={btn.primary}
                  >
                    {next?.lesson ? `Bài tiếp: ${next.lesson.title.en} →` : "Tiếp tục lộ trình →"}
                  </Link>
                  <Link href={`/lesson/${view.id}/practice`} className={btn.secondary}>
                    Luyện tập (không tính giờ)
                  </Link>
                  <Link href={trackHref} className={btn.secondary}>
                    Về lộ trình
                  </Link>
                </>
              ) : (
                <>
                  <button onClick={() => location.reload()} className={btn.primary}>
                    Học lại từ đầu
                  </button>
                  <Link href={trackHref} className={btn.secondary}>
                    Trở về lộ trình
                  </Link>
                </>
              )
            }
          />
        )}
      </main>
    </div>
  );
}
