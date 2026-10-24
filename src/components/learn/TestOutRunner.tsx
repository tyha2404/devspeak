"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TracksHeader } from "@/components/app/TracksHeader";
import { btn } from "@/components/app/ui";
import { api, ApiError } from "@/lib/client/api";
import { sfx } from "@/lib/client/sfx";
import type { ExamResult, ExamStart } from "@/lib/contracts/learn";
import { useMe } from "@/stores/meStore";
import { TestIntro, TrackResult, TrackStepper } from "./TrackParts";
import { TrackQuiz } from "./TrackQuiz";

/** A grammar level's test-out: timed, one answer per question, graded and recorded on the server. */
export function TestOutRunner({ unitId, backHref }: { unitId: number; backHref: string }) {
  const [exam, setExam] = useState<ExamStart | null>(null);
  const [started, setStarted] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void useMe.getState().load();
  }, []);

  const start = async () => {
    try {
      setExam(await api.post<ExamStart>("/api/test-out/start", { unitId }));
      setStarted(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không bắt đầu được bài kiểm tra");
    }
  };
  const finish = async () => {
    try {
      const r = await api.post<ExamResult>("/api/test-out/finish", { sessionId: exam!.sessionId });
      if (r.passed) sfx.levelUp();
      void useMe.getState().load();
      setResult(r);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không lưu được kết quả");
    }
  };

  return (
    <div className="min-h-dvh">
      <TracksHeader />
      <TrackStepper exitHref={backHref} phase={result ? 2 : started ? 1 : 0} />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
        {error && <p className="text-bad mb-4">{error}</p>}
        {!started && !result && (
          <TestIntro
            eyebrow="Bài kiểm tra vượt cấp"
            title="Kiểm tra kiến thức cả bậc"
            text="Câu hỏi trộn từ mọi bài của bậc. Đạt 80% là mở toàn bộ bài của bậc này và bậc kế tiếp; các bài vẫn giữ trạng thái chưa hoàn thành cho tới khi bạn học."
            total={16}
            passPct={80}
          >
            <button onClick={start} className={btn.primary} autoFocus>
              Làm bài kiểm tra →
            </button>
          </TestIntro>
        )}
        {started && exam && !result && (
          <TrackQuiz
            sessionId={exam.sessionId}
            label="Kiểm tra vượt cấp"
            bands
            onDone={() => void finish()}
          />
        )}
        {result && (
          <TrackResult
            title={result.passed ? "Bậc tiếp theo đã mở." : "Bạn đã hoàn thành bài kiểm tra."}
            passed={result.passed}
            pct={result.pct}
            stars={null}
            xp={result.xp}
            correct={result.correct}
            total={result.total}
            passPct={exam?.passPct ?? 80}
            note={
              result.passed
                ? "Các bài của bậc này và bậc kế tiếp đã mở. Sao chỉ được ghi nhận khi bạn hoàn thành từng bài."
                : undefined
            }
            actions={
              result.passed ? (
                <Link href={backHref} className={btn.primary}>
                  Tiếp tục lộ trình →
                </Link>
              ) : (
                <>
                  <button onClick={() => location.reload()} className={btn.primary}>
                    Làm lại bài
                  </button>
                  <Link href={backHref} className={btn.secondary}>
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
