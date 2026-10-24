"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/client/api";
import type { AnswerResult, DeliveryView, QuizResponse, SessionDone } from "@/lib/contracts/quiz";
import { useProfileStore } from "@/stores/profileStore";
import { useUiStore } from "@/stores/uiStore";
import { applyProgress, type ProgressUpdate } from "@/lib/client/progress";
import { sfx } from "@/lib/client/sfx";
import { ChoiceGame } from "./minigames/ChoiceGame";
import { FixGame } from "./minigames/FixGame";
import { OrderGame } from "./minigames/OrderGame";
import { DictationGame } from "./minigames/DictationGame";
import { TypeGame } from "./minigames/TypeGame";

type Final = Extract<AnswerResult, { final: true }>;

export function applyTotals(totals: Final["totals"]) {
  if (!totals) return;
  const { profile, setProfile } = useProfileStore.getState();
  if (profile)
    setProfile({
      ...profile,
      xpTotal: totals.xpTotal,
      level: totals.level,
      coins: totals.coins,
      streak: totals.streak,
    });
  if (totals.leveledUp) {
    sfx.levelUp();
    useUiStore.getState().toast(`🎉 Lên cấp! Bạn đã đạt Level ${totals.level}`);
  }
}

/** Runs one server-side quiz session: one delivery at a time, two attempts each. */
export function QuizHost({
  sessionId,
  onDone,
  onResult,
  single = false,
}: {
  sessionId: string;
  /** Answer one question, then hand control back (SRS verification) instead of loading the next. */
  single?: boolean;
  onDone: (s: SessionDone) => void;
  /** Called after each final answer (boss bars, review flow). */
  onResult?: (correct: boolean, deliveryId: string) => void;
}) {
  const [delivery, setDelivery] = useState<DeliveryView | null>(null);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [lastWrong, setLastWrong] = useState<QuizResponse | null>(null);
  const [result, setResult] = useState<Final | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reported, setReported] = useState(false);
  const toast = useUiStore((s) => s.toast);

  // Parents pass inline callbacks; keep them in refs so a parent re-render never reloads the question.
  const onDoneRef = useRef(onDone);
  const onResultRef = useRef(onResult);
  useEffect(() => {
    onDoneRef.current = onDone;
    onResultRef.current = onResult;
  });

  const load = useCallback(async () => {
    setBusy(true);
    setHint(null);
    setLastWrong(null);
    setResult(null);
    setReported(false);
    try {
      const next = await api.get<DeliveryView | SessionDone>(
        `/api/quiz/next?sessionId=${sessionId}`,
      );
      if ("done" in next) onDoneRef.current(next);
      else setDelivery(next);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không tải được câu hỏi");
    } finally {
      setBusy(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = useCallback(
    async (response: QuizResponse) => {
      if (!delivery || busy || result) return;
      setBusy(true);
      try {
        const r = await api.post<AnswerResult>("/api/quiz/answer", {
          deliveryId: delivery.deliveryId,
          response,
        });
        if (!r.final) {
          sfx.wrong();
          setHint(r.hint);
          setLastWrong(response);
        } else {
          setResult(r);
          if (r.correct) sfx.correct();
          else sfx.wrong();
          if (!r.correct) setLastWrong(response);
          applyTotals(r.totals);
          applyProgress((r as { progress?: ProgressUpdate }).progress);
          onResultRef.current?.(r.correct, delivery.deliveryId);
        }
      } catch (e) {
        if (e instanceof ApiError && e.code === "DELIVERY_EXPIRED") void load();
        else setError(e instanceof ApiError ? e.message : "Có lỗi, thử lại nhé");
      } finally {
        setBusy(false);
      }
    },
    [delivery, busy, result, load],
  );

  const next = useCallback(() => {
    if (single && result) {
      onDoneRef.current({ done: true, answered: 1, correct: result.correct ? 1 : 0, total: 1 });
      return;
    }
    if (result?.session?.done) {
      onDoneRef.current({
        done: true,
        answered: result.session.answered,
        correct: result.session.correct,
        total: result.session.total,
      });
    } else void load();
  }, [result, load, single]);

  useEffect(() => {
    if (!result) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [result, next]);

  if (error) return <p className="text-[#c62828]">{error}</p>;
  if (!delivery) return <p>Đang tải câu hỏi…</p>;

  const props = {
    disabled: busy || !!result,
    reveal: result?.answer ?? null,
    lastWrong,
    onSubmit: submit,
  };
  const p = delivery.prompt;
  const game =
    p.type === "sentence_order" ? (
      <OrderGame key={delivery.deliveryId} prompt={p} {...props} />
    ) : p.type === "error_correction" ? (
      <FixGame key={delivery.deliveryId} prompt={p} {...props} />
    ) : p.type === "fill_blank" && !p.options ? (
      <TypeGame key={delivery.deliveryId} prompt={p} {...props} />
    ) : p.type === "listening" && p.dictation ? (
      <DictationGame key={delivery.deliveryId} prompt={p} {...props} />
    ) : (
      <ChoiceGame key={delivery.deliveryId} prompt={p} {...props} />
    );

  return (
    <div className="space-y-3" data-testid="quiz">
      <div className="flex items-center gap-2 text-xs text-[#5c5c7a]">
        <span>
          Câu {delivery.index}/{delivery.total}
        </span>
        <div className="h-1.5 flex-1 rounded bg-[#d6d3c4]">
          <div
            className="h-1.5 rounded bg-[#f2a65a]"
            style={{ width: `${((delivery.index - 1) / delivery.total) * 100}%` }}
          />
        </div>
        {!result && delivery.hasHint && !hint && (
          <button
            onClick={async () =>
              setHint(
                (
                  await api.post<{ hint: string }>("/api/quiz/hint", {
                    deliveryId: delivery.deliveryId,
                  })
                ).hint,
              )
            }
            className="rounded bg-[#fff3c4] px-2 py-0.5 text-[#1b1b28]"
            title="Gợi ý (giảm XP câu này còn 5)"
          >
            🦆 Gợi ý
          </button>
        )}
      </div>

      {game}

      {hint && !result && (
        <p role="status" className="rounded bg-[#fff3c4] px-3 py-2 text-sm text-[#1b1b28]">
          🦆 {lastWrong ? "Chưa đúng — " : ""}
          {hint}
        </p>
      )}

      {result && (
        <div
          role="status"
          className={`rounded-md border-2 px-3 py-2 text-sm text-[#1b1b28] ${
            result.correct ? "border-[#2e7d32] bg-[#e8f5e9]" : "border-[#c62828] bg-[#ffebee]"
          }`}
        >
          <p className="font-bold">
            {result.correct ? "✓ Đúng rồi!" : "✗ Chưa đúng"}
            {result.xp > 0 && <span className="ml-2">+{result.xp} XP</span>}
          </p>
          {result.explanation.vi && <p className="mt-1">{result.explanation.vi}</p>}
          <div className="mt-2 flex items-center gap-3">
            <button
              onClick={next}
              className="rounded bg-[#1b1b28] px-4 py-1.5 font-semibold text-white"
            >
              Tiếp (Enter)
            </button>
            {!reported && (
              <button
                onClick={async () => {
                  await api.post("/api/quiz/report", {
                    deliveryId: delivery.deliveryId,
                    reason: "wrong_answer",
                  });
                  setReported(true);
                  toast("Cảm ơn! Câu hỏi sẽ được xem lại.");
                }}
                className="text-xs text-[#5c5c7a] underline"
              >
                Báo câu hỏi sai
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
