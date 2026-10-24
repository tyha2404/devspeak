"use client";

import { RotateCcw, Check, Volume2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { speak } from "@/lib/client/tts";
import type { GlossEntry } from "@/lib/contracts/dialogue";
import { useSettings } from "@/stores/settingsStore";

/** Time allowed for studying a word set before the test starts anyway. */
const STUDY_MS = 20 * 60_000;

/**
 * Flashcards with self-rating: a card must be flipped before it can be rated; "Cần ôn" sends it
 * to the back of the queue, "Đã nhớ" retires it. The set is done once every card is remembered
 * (or the study time runs out).
 */
export function TrackCards({
  words,
  topic,
  onDone,
}: {
  words: GlossEntry[];
  topic: string;
  onDone: () => void;
}) {
  const [queue, setQueue] = useState(() => words.map((w) => w.slug));
  const [known, setKnown] = useState<Set<string>>(new Set());
  const [review, setReview] = useState<Set<string>>(new Set());
  const [flipped, setFlipped] = useState(false);
  const [deadline] = useState(() => Date.now() + STUDY_MS);
  const [now, setNow] = useState(() => Date.now());
  const rate = useSettings((s) => s.ttsRate);
  const bySense = new Map(words.map((w) => [w.slug, w]));
  const w = queue[0] ? bySense.get(queue[0]) : undefined;
  const left = Math.max(0, deadline - now);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (left === 0 || !w) onDone();
  }, [left, w, onDone]);

  const say = useCallback(() => {
    if (w) speak(w.lemma, { rate });
  }, [w, rate]);

  const mark = useCallback(
    (remembered: boolean) => {
      if (!w || !flipped) return;
      setFlipped(false);
      if (remembered) {
        setKnown((k) => new Set(k).add(w.slug));
        setReview((r) => {
          const n = new Set(r);
          n.delete(w.slug);
          return n;
        });
        setQueue((q) => q.slice(1));
      } else {
        setReview((r) => new Set(r).add(w.slug));
        setQueue((q) => [...q.slice(1), q[0]!]);
      }
    },
    [w, flipped],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === " ") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key === "a" || e.key === "A") say();
      else if (e.key === "1") mark(false);
      else if (e.key === "2") mark(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [say, mark]);

  if (!w) return null;
  const mm = Math.floor(left / 60_000);
  const ss = Math.floor((left % 60_000) / 1000);
  const again = review.has(w.slug);

  return (
    <div>
      <div
        role="timer"
        aria-label={`Còn ${mm} phút ${ss} giây để học thẻ`}
        className="border-merged/30 bg-merged-soft flex flex-wrap items-center gap-4 rounded-2xl border px-4 py-3"
      >
        <p className="text-sm font-semibold uppercase">Thời gian học</p>
        <p className="font-mono text-lg font-bold">
          {mm}:{String(ss).padStart(2, "0")}
        </p>
        <div className="bg-line h-1.5 min-w-24 flex-1 overflow-hidden rounded-full">
          <div
            className="bg-merged h-full rounded-full"
            style={{ width: `${(100 * left) / STUDY_MS}%` }}
          />
        </div>
        <p className="text-sm">
          <strong>
            {known.size}/{words.length}
          </strong>{" "}
          đã nhớ{review.size > 0 && ` · ${review.size} thẻ đang chờ ôn lại`}
        </p>
      </div>

      <p className="text-muted mt-5 text-sm font-semibold">
        {again && "Ôn lại · "}
        {topic}
      </p>
      <div className="border-line bg-surface mt-2 overflow-hidden rounded-2xl border shadow-sm">
        <button
          onClick={() => setFlipped((f) => !f)}
          aria-pressed={flipped}
          aria-label={flipped ? "Lật về mặt từ" : "Lật sang mặt nghĩa"}
          className="block min-h-64 w-full p-6 text-center sm:p-8"
        >
          {flipped ? (
            <span className="block">
              <span className="text-bad text-xs font-semibold tracking-wide uppercase">
                Nghĩa · cách dùng · ví dụ
              </span>
              <span className="mt-3 block text-[1.9rem] leading-tight font-bold">{w.vi}</span>
              {w.def && <span className="text-muted mt-2 block">{w.def}</span>}
              {w.note && (
                <span className="bg-merged-soft mt-4 block rounded-xl px-4 py-2 text-sm">
                  <strong className="mr-2 uppercase">Cách dùng</strong>
                  {w.note}
                </span>
              )}
              {w.example && (
                <span className="border-line mt-4 block rounded-xl border px-4 py-3 text-left">
                  <span className="block">{w.example.en}</span>
                  {w.example.vi && <span className="text-muted block text-sm">{w.example.vi}</span>}
                </span>
              )}
            </span>
          ) : (
            <span className="block">
              <span className="text-muted text-xs font-semibold tracking-wide uppercase">
                {w.pos}
              </span>
              <span className="mt-4 block text-[2.4rem] leading-tight font-bold">{w.lemma}</span>
              <span className="text-muted mt-6 block text-sm">↻ Lật thẻ</span>
            </span>
          )}
        </button>
        <div className="border-line bg-paper flex items-center justify-end gap-3 border-t px-4 py-2">
          {w.ipa && <span className="text-muted font-mono text-sm">{w.ipa}</span>}
          <button
            onClick={say}
            aria-label={`Nghe phát âm: ${w.lemma}`}
            className="border-line bg-surface inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold"
          >
            <Volume2 size={16} aria-hidden /> Nghe
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          onClick={() => mark(false)}
          disabled={!flipped}
          className="border-bad/40 bg-bad-soft inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 font-semibold disabled:opacity-40"
        >
          <RotateCcw size={16} aria-hidden /> Cần ôn
        </button>
        <button
          onClick={() => mark(true)}
          disabled={!flipped}
          className="bg-ok inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold text-white disabled:opacity-40"
        >
          <Check size={16} aria-hidden /> Đã nhớ
        </button>
      </div>
      <p className="text-muted mt-2 text-center text-sm">
        {flipped
          ? "Chọn mức độ ghi nhớ để sang thẻ tiếp theo."
          : "Lật thẻ trước khi đánh dấu mức độ ghi nhớ."}
      </p>
      <p className="text-muted mt-2 flex justify-center gap-4 text-xs">
        <span>
          <kbd className="border-line rounded border px-1.5">A</kbd> Phát âm
        </span>
        <span>
          <kbd className="border-line rounded border px-1.5">Space</kbd> Lật thẻ
        </span>
        <span>
          <kbd className="border-line rounded border px-1.5">1</kbd>/
          <kbd className="border-line rounded border px-1.5">2</kbd> Cần ôn / Đã nhớ
        </span>
      </p>
    </div>
  );
}
