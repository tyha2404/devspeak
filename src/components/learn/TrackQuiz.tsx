"use client";

import { Check, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { btn } from "@/components/app/ui";
import { LoadingState } from "@/components/app/LoadingState";
import { api, ApiError } from "@/lib/client/api";
import { sfx } from "@/lib/client/sfx";
import type { AnswerResult, DeliveryView, QuizResponse, SessionDone } from "@/lib/contracts/quiz";

type Final = Extract<AnswerResult, { final: true }>;

const BANDS = ["Nền tảng", "Áp dụng", "Ngữ cảnh"];
const LETTERS = ["A", "B", "C", "D"];
const INSTRUCTION = /^(chọn|đọc|điền|nói|viết|mục từ|từ nào)\b/i;

/** Heading, sentence box and options for the two prompt types the study tracks use. */
function present(d: DeliveryView) {
  const p = d.prompt;
  if (p.type === "mcq_meaning") {
    if (/^“[^”]+”$/.test(p.stem))
      return {
        heading: `${p.stem} ${p.question}`,
        sentence: null,
        context: null,
        options: p.options,
      };
    // Whichever line is the instruction ("Chọn…", "Đọc…") heads the question; the other is shown as the sentence.
    const stemIsInstruction = INSTRUCTION.test(p.stem) && !INSTRUCTION.test(p.question);
    return stemIsInstruction
      ? { heading: p.stem, sentence: p.question, context: null, options: p.options }
      : { heading: p.question, sentence: p.stem, context: null, options: p.options };
  }
  if (p.type === "fill_blank") {
    const bare = p.sentence.trim() === "___";
    return {
      heading: bare
        ? (p.context ?? "Điền vào chỗ trống.")
        : p.options?.length
          ? "Chọn đáp án phù hợp để hoàn thành câu."
          : "Điền vào chỗ trống.",
      sentence: bare ? null : p.sentence,
      context: bare ? null : (p.context ?? null),
      options: p.options ?? null,
    };
  }
  return { heading: "Câu hỏi", sentence: null, context: null, options: null };
}

function Sentence({ text }: { text: string }) {
  const parts = text.split("___");
  return (
    <p className="border-merged bg-paper rounded-r-xl border-l-4 px-5 py-4 text-[1.35rem] leading-snug font-semibold">
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && (
            <mark aria-label="chỗ trống" className="text-muted bg-transparent px-1">
              ____
            </mark>
          )}
        </span>
      ))}
    </p>
  );
}

/**
 * The study-track test: one answer per question, each against the clock (the server sets the
 * deadline and treats late answers as wrong). A timeout is recorded as a wrong answer and the
 * test simply moves on, as on ForumFlash.
 */
export function TrackQuiz({
  sessionId,
  label,
  bands = false,
  onDone,
}: {
  sessionId: string;
  /** e.g. "Bài kiểm tra ngữ pháp" */
  label: string;
  /** Show the difficulty band (grammar tests). */
  bands?: boolean;
  onDone: (s: SessionDone) => void;
}) {
  const [delivery, setDelivery] = useState<DeliveryView | null>(null);
  const [result, setResult] = useState<Final | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  const load = useCallback(async () => {
    setBusy(true);
    setResult(null);
    setPicked(null);
    setText("");
    try {
      const next = await api.get<DeliveryView | SessionDone>(
        `/api/quiz/next?sessionId=${sessionId}`,
      );
      if ("done" in next) onDoneRef.current(next);
      else {
        setNow(Date.now());
        setDelivery(next);
      }
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
        // Strict sessions allow one attempt, so every answer is final.
        if (r.final) {
          setResult(r);
          if (r.correct) sfx.correct();
          else sfx.wrong();
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

  const deadline = delivery?.deadline ? Date.parse(delivery.deadline) : null;
  const left = deadline ? Math.max(0, deadline - now) : null;
  const timedOut = left === 0;

  useEffect(() => {
    if (!deadline || result) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [deadline, result]);

  useEffect(() => {
    if (timedOut && !result && !busy) void submit({ kind: "timeout" });
  }, [timedOut, result, busy, submit]);

  const next = useCallback(() => {
    if (result?.session?.done)
      onDoneRef.current({
        done: true,
        answered: result.session.answered,
        correct: result.session.correct,
        total: result.session.total,
      });
    else void load();
  }, [result, load]);

  const view = delivery ? present(delivery) : null;

  // Enter → next question; 1–4 pick an option. Keys typed into the answer box are left alone.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (result && e.key === "Enter") {
        e.preventDefault();
        next();
      } else if (!result && view?.options) {
        const i = Number(e.key) - 1;
        const o = view.options[i];
        if (o) {
          setPicked(o.id);
          void submit({ kind: "choice", optionId: o.id });
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [result, next, view, submit]);

  if (error) return <p className="text-bad">{error}</p>;
  if (!delivery || !view) return <LoadingState compact />;

  const limit = (delivery.timeLimitSec ?? 20) * 1000;
  const secs = left === null ? null : Math.min(limit / 1000, Math.ceil(left / 1000));
  const urgent = secs !== null && secs <= 5;
  const correctId = result?.answer.kind === "choice" ? result.answer.optionId : undefined;
  const band = BANDS[delivery.index <= 5 ? 0 : delivery.index <= 10 ? 1 : 2]!;

  return (
    <div data-testid="quiz">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="text-muted text-sm font-semibold tracking-wide uppercase">
          {label} · Câu {delivery.index}/{delivery.total}
        </p>
        {secs !== null && (
          <div className="w-40 text-center" aria-live="off">
            <p className={`text-xs font-semibold uppercase ${urgent ? "text-bad" : "text-muted"}`}>
              Thời gian
            </p>
            <p
              className={`font-mono text-2xl font-bold ${urgent ? "text-bad" : ""}`}
              role="timer"
              aria-label={`Còn ${secs} giây`}
            >
              0:{String(result ? 0 : secs).padStart(2, "0")}
            </p>
            <div className="bg-line mt-1 h-1.5 overflow-hidden rounded-full">
              <div
                className={`h-full rounded-full ${urgent ? "bg-bad" : "bg-merged"}`}
                style={{ width: `${result ? 0 : (100 * (left ?? 0)) / limit}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {bands && (
        <p className="border-merged/40 bg-merged-soft mt-4 inline-block rounded-full border px-3 py-1 text-xs font-semibold uppercase">
          {band}
        </p>
      )}
      <h2 className="mt-3 text-[1.6rem] leading-tight font-bold sm:text-[2rem]">{view.heading}</h2>
      {view.context && <p className="text-muted mt-2">{view.context}</p>}
      {view.sentence && (
        <div className="mt-4">
          <Sentence text={view.sentence} />
        </div>
      )}

      {view.options ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {view.options.map((o, i) => {
            const state = result
              ? o.id === correctId
                ? "right"
                : o.id === picked
                  ? "wrong"
                  : "idle"
              : o.id === picked
                ? "picked"
                : "idle";
            return (
              <button
                key={o.id}
                disabled={!!result || busy}
                onClick={() => {
                  setPicked(o.id);
                  void submit({ kind: "choice", optionId: o.id });
                }}
                className={`flex items-center gap-4 rounded-xl border p-4 text-left text-lg font-semibold disabled:cursor-default ${
                  state === "right"
                    ? "border-ok bg-ok-soft"
                    : state === "wrong"
                      ? "border-bad bg-bad-soft"
                      : state === "picked"
                        ? "border-amber bg-amber-soft"
                        : "border-line bg-surface hover:border-amber/60"
                }`}
              >
                <span className="bg-paper grid h-10 w-10 shrink-0 place-items-center rounded-lg font-mono text-base">
                  {LETTERS[i]}
                </span>
                {o.text}
              </button>
            );
          })}
          {!result && (
            <p className="text-muted text-sm sm:col-span-2">
              Chọn một đáp án để kiểm tra (phím 1–4).
            </p>
          )}
        </div>
      ) : (
        <form
          className="mt-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) void submit({ kind: "text", text });
          }}
        >
          <label htmlFor="track-answer" className="text-muted text-sm font-semibold">
            Đáp án của bạn
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="track-answer"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={!!result}
              autoFocus
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="Nhập từ hoặc cụm từ"
              className="border-line bg-surface focus:border-amber min-w-0 flex-1 rounded-xl border px-4 py-3 text-lg outline-none"
            />
            <button
              type="submit"
              disabled={!text.trim() || !!result || busy}
              className={btn.secondary}
            >
              Kiểm tra
            </button>
          </div>
          {!result && (
            <p className="text-muted mt-1 text-sm">Điền đáp án rồi nhấn Enter để kiểm tra.</p>
          )}
        </form>
      )}

      {result && (
        <div
          role="status"
          className={`mt-6 flex flex-wrap items-center gap-4 rounded-2xl border p-5 ${
            result.correct ? "border-ok bg-ok-soft" : "border-bad bg-bad-soft"
          }`}
        >
          <span
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-white ${
              result.correct ? "bg-ok" : "bg-bad"
            }`}
          >
            {result.correct ? <Check size={22} aria-hidden /> : <X size={22} aria-hidden />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold">
              {result.correct ? "Chính xác." : timedOut ? "Hết giờ." : "Chưa đúng."}
            </p>
            <p className="text-muted text-sm">
              Đã ghi nhận đáp án.
              {!result.correct && result.answer.kind === "text" && result.answer.text
                ? ` Đáp án: ${result.answer.text}.`
                : ""}
            </p>
            {result.explanation.vi && (
              <p className="text-muted mt-1 text-sm">{result.explanation.vi}</p>
            )}
          </div>
          <button onClick={next} className={btn.primary} autoFocus>
            {result.session?.done ? "Xem kết quả →" : "Câu tiếp theo →"}
          </button>
        </div>
      )}
    </div>
  );
}
