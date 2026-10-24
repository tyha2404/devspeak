"use client";

import { ChevronLeft, ChevronRight, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import { btn } from "@/components/app/ui";
import { speak } from "@/lib/client/tts";
import type { GlossEntry } from "@/lib/contracts/dialogue";
import { useSettings } from "@/stores/settingsStore";

/** One word at a time: the English side first, the meaning one tap (or Space) away. */
export function VocabCards({
  words,
  onDone,
  doneLabel,
}: {
  words: GlossEntry[];
  onDone: () => void;
  doneLabel: string;
}) {
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const rate = useSettings((s) => s.ttsRate);
  const w = words[i];

  useEffect(() => {
    if (w) speak(w.lemma, { rate });
  }, [w, rate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!revealed) setRevealed(true);
        else if (i < words.length - 1) {
          setI(i + 1);
          setRevealed(false);
        } else onDone();
      }
      if (e.key === "ArrowRight" && revealed && i < words.length - 1) {
        setI(i + 1);
        setRevealed(false);
      }
      if (e.key === "ArrowLeft" && i > 0) {
        setI(i - 1);
        setRevealed(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i, revealed, words.length, onDone]);

  if (!w) return null;
  const last = i === words.length - 1;
  return (
    <div>
      <p className="text-muted text-sm">
        Từ {i + 1}/{words.length} · đã thêm vào sổ tay để ôn tập
      </p>
      <div className="border-line bg-surface mt-3 rounded-2xl border p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[2rem] leading-tight font-bold">{w.lemma}</p>
            <p className="text-muted mt-1">
              {w.ipa ? `${w.ipa} · ` : ""}
              {w.pos}
            </p>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => speak(w.lemma, { rate })}
              aria-label="Nghe"
              className={btn.secondary}
            >
              <Volume2 size={18} aria-hidden />
            </button>
            <button
              onClick={() => speak(w.lemma, { rate: 0.6 })}
              className={btn.secondary}
              aria-label="Nghe chậm"
            >
              0.6×
            </button>
          </div>
        </div>
        {revealed ? (
          <div className="mt-6 space-y-3">
            <p className="text-xl font-semibold">{w.vi}</p>
            <p className="text-muted">{w.def}</p>
            {w.note && <p className="bg-amber-soft rounded-lg px-3 py-2 text-sm">{w.note}</p>}
            {w.example && (
              <div className="border-merged border-l-4 pl-3">
                <p className="flex items-start gap-2 italic">
                  {w.example.en}
                  <button
                    onClick={() => speak(w.example!.en, { rate })}
                    aria-label="Nghe câu ví dụ"
                    className="text-muted"
                  >
                    <Volume2 size={16} aria-hidden />
                  </button>
                </p>
                {w.example.vi && <p className="text-muted text-sm">{w.example.vi}</p>}
              </div>
            )}
          </div>
        ) : (
          <button onClick={() => setRevealed(true)} className={`${btn.secondary} mt-6 w-full`}>
            Xem nghĩa <span className="text-muted text-sm">(Space)</span>
          </button>
        )}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={() => {
            setI(i - 1);
            setRevealed(true);
          }}
          disabled={i === 0}
          className={btn.ghost}
        >
          <ChevronLeft size={16} aria-hidden /> Từ trước
        </button>
        {revealed &&
          (last ? (
            <button onClick={onDone} className={btn.primary}>
              {doneLabel}
            </button>
          ) : (
            <button
              onClick={() => {
                setI(i + 1);
                setRevealed(false);
              }}
              className={btn.primary}
            >
              Từ tiếp theo <ChevronRight size={18} aria-hidden />
            </button>
          ))}
      </div>
    </div>
  );
}
