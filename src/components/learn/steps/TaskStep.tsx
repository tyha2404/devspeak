"use client";

import { useState } from "react";
import { btn } from "@/components/app/ui";
import { api, ApiError } from "@/lib/client/api";
import type { LessonContent, TaskResult } from "@/lib/contracts/learn";
import { FreeWrite, Speak } from "../WriteSpeak";

type Task = Extract<LessonContent, { kind: "task" }>;

const SCORE_VI = ["Chưa đạt yêu cầu", "Đạt — hiểu được", "Tốt", "Rất tốt, chuyên nghiệp"];

/** A real-world task (Slack message, email, spoken standup) graded by Claude, with a model answer. */
export function TaskStep({
  task,
  runId,
  onDone,
}: {
  task: Task;
  runId: string;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TaskResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const submit = async (text: string) => {
    setBusy(true);
    setError(null);
    try {
      setResult(await api.post<TaskResult>("/api/lessons/task", { runId, text }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không chấm được bài, thử lại nhé");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {task.context.length > 0 && (
        <div className="space-y-2">
          {task.context.map((c, i) => (
            <div key={i} className="border-line bg-surface rounded-xl border px-4 py-3">
              <p className="text-muted text-sm font-semibold">{c.speaker}</p>
              <p className="mt-0.5 whitespace-pre-line">{c.text}</p>
            </div>
          ))}
        </div>
      )}
      <div>
        <p className="text-lg font-semibold">{task.prompt.en}</p>
        <p className="text-muted mt-1">{task.prompt.vi}</p>
      </div>

      {!result && (
        <div key={attempt}>
          {task.mode === "speak" ? (
            <Speak phrases={[]} busy={busy} onSubmit={submit} />
          ) : (
            <FreeWrite busy={busy} onSubmit={submit} placeholder="Viết bằng tiếng Anh…" />
          )}
          {busy && <p className="text-muted mt-2 text-sm">Đang chấm bài…</p>}
          {error && <p className="text-bad mt-2">{error}</p>}
        </div>
      )}

      {result && (
        <div role="status" className="space-y-4">
          <div
            className={`rounded-xl border-2 p-4 ${result.score >= 1 ? "border-ok bg-ok-soft" : "border-bad bg-bad-soft"}`}
          >
            <p className="font-semibold">
              {SCORE_VI[result.score]} · {result.score}/3
            </p>
            <p className="mt-1">{result.feedback}</p>
            {result.fixes.map((f, i) => (
              <p key={i} className="mt-1">
                <s>{f.original}</s> → <b>{f.corrected}</b>
              </p>
            ))}
          </div>
          {result.better && (
            <div className="border-line bg-surface rounded-xl border p-4">
              <p className="text-muted text-sm font-semibold">Bản của bạn, viết tự nhiên hơn</p>
              <p className="mt-1 whitespace-pre-line">{result.better}</p>
            </div>
          )}
          <div className="border-line bg-surface rounded-xl border p-4">
            <p className="text-muted text-sm font-semibold">Câu trả lời mẫu</p>
            <p className="mt-1 whitespace-pre-line">{result.modelAnswer}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {result.score >= 1 && (
              <button onClick={onDone} className={btn.primary}>
                Hoàn thành bài
              </button>
            )}
            <button
              onClick={() => {
                setResult(null);
                setAttempt((a) => a + 1);
              }}
              className={result.score >= 1 ? btn.secondary : btn.primary}
            >
              Viết lại
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
