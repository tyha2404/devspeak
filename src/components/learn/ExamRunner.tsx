"use client";

import { Award, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { btn } from "@/components/app/ui";
import { api, ApiError } from "@/lib/client/api";
import { sfx } from "@/lib/client/sfx";
import type { ExamResult, ExamStart } from "@/lib/contracts/learn";
import { useMe } from "@/stores/meStore";
import { QuizHost } from "./QuizHost";

const COPY = {
  "test-out": {
    title: "Kiểm tra để vượt unit",
    intro: "8 câu trộn từ các bài trong unit. Đúng từ 80% là unit được tính hoàn thành.",
    passed: "Bạn đã vượt qua unit này",
  },
  checkpoint: {
    title: "Checkpoint cuối chặng",
    intro: "Câu hỏi trộn từ mọi unit của chặng. Qua bài để nhận chứng nhận của chặng.",
    passed: "Bạn đã qua checkpoint",
  },
};

/** Unit test-out and stage checkpoint: one quiz session, graded and recorded on the server. */
export function ExamRunner({ kind, id }: { kind: "test-out" | "checkpoint"; id: number }) {
  const [exam, setExam] = useState<ExamStart | null>(null);
  const [started, setStarted] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const copy = COPY[kind];
  const base = kind === "test-out" ? "/api/test-out" : "/api/checkpoints";

  useEffect(() => {
    void useMe.getState().load();
  }, []);

  const start = async () => {
    try {
      setExam(
        await api.post<ExamStart>(
          `${base}/start`,
          kind === "test-out" ? { unitId: id } : { stageId: id },
        ),
      );
      setStarted(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không bắt đầu được bài kiểm tra");
    }
  };
  const finish = async () => {
    try {
      const r = await api.post<ExamResult>(`${base}/finish`, { sessionId: exam!.sessionId });
      if (r.passed) sfx.levelUp();
      void useMe.getState().load();
      setResult(r);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không lưu được kết quả");
    }
  };

  return (
    <div className="min-h-dvh">
      <header className="border-line border-b">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link href="/path" aria-label="Thoát" className={btn.ghost}>
            <X size={22} aria-hidden />
          </Link>
          <p className="font-semibold">{copy.title}</p>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8">
        {error && <p className="text-bad mb-4">{error}</p>}
        {!started && !result && (
          <div>
            <h1 className="text-[1.75rem] font-bold">{copy.title}</h1>
            <p className="text-muted mt-2 max-w-[60ch]">
              {copy.intro} Bạn có thể làm lại bao nhiêu lần cũng được.
            </p>
            <button onClick={start} className={`${btn.primary} mt-6`}>
              Bắt đầu
            </button>
          </div>
        )}
        {started && exam && !result && (
          <QuizHost sessionId={exam.sessionId} onDone={() => void finish()} />
        )}
        {result && (
          <div role="status">
            {result.passed ? (
              <>
                {kind === "checkpoint" && <Award size={44} className="text-merged" aria-hidden />}
                <h1 className="mt-3 text-[1.75rem] font-bold">{copy.passed}</h1>
                <p className="text-muted mt-2">Đúng {result.pct}%.</p>
              </>
            ) : (
              <>
                <h1 className="text-[1.75rem] font-bold">Chưa qua lần này</h1>
                <p className="text-muted mt-2">
                  Bạn đúng {result.pct}%, cần {exam?.passPct}%. Học các bài trong lộ trình rồi thử
                  lại nhé.
                </p>
              </>
            )}
            <div className="mt-8 flex flex-wrap gap-3">
              {result.certificateId && (
                <Link href={`/certificate/${result.certificateId}`} className={btn.primary}>
                  Xem chứng nhận
                </Link>
              )}
              {result.passed && result.next?.lesson ? (
                <Link
                  href={`/lesson/${result.next.lesson.id}`}
                  className={result.certificateId ? btn.secondary : btn.primary}
                >
                  Tiếp: {result.next.lesson.title.vi}
                </Link>
              ) : (
                !result.passed && (
                  <button onClick={() => location.reload()} className={btn.primary}>
                    Làm lại
                  </button>
                )
              )}
              <Link href="/path" className={btn.secondary}>
                Xem lộ trình
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
