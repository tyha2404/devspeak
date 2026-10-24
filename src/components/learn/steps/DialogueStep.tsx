"use client";

import { Volume2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Avatar } from "@/components/app/Avatar";
import { btn } from "@/components/app/ui";
import { advanceDialogue, ApiError } from "@/lib/client/api";
import { character } from "@/lib/characters";
import { speak } from "@/lib/client/tts";
import type { DialogueStep as Step } from "@/lib/contracts/dialogue";
import { stripMarkup } from "@/lib/markup";
import { useGlossary } from "@/stores/glossaryStore";
import { useSettings } from "@/stores/settingsStore";
import { QuizHost } from "../QuizHost";
import { RichText } from "../RichText";
import { FreeWrite, Speak } from "../WriteSpeak";

const QUALITY = {
  best: { label: "Rất phù hợp", cls: "border-ok bg-ok-soft" },
  ok: { label: "Hiểu được, nhưng có cách nói tốt hơn", cls: "border-amber bg-amber-soft" },
  poor: { label: "Chưa phù hợp", cls: "border-bad bg-bad-soft" },
};

/** A scripted conversation with the unit's colleague, graded choice by choice on the server. */
export function DialogueStep({
  initial,
  characterId,
  onDone,
}: {
  initial: Step;
  characterId: string;
  onDone: () => void;
}) {
  const guide = character(characterId);
  const [step, setStep] = useState<Step>(initial);
  const [typing, setTyping] = useState(true);
  const [showVi, setShowVi] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const translation = useSettings((s) => s.translation);
  const rate = useSettings((s) => s.ttsRate);
  const merge = useGlossary((s) => s.merge);

  useEffect(() => merge(initial.glossary), [initial, merge]);

  const go = useCallback(
    async (choiceId?: string, text?: string) => {
      if (busy) return;
      setBusy(true);
      setError(null);
      try {
        const next = await advanceDialogue(step.runId, choiceId, text);
        merge(next.glossary);
        setStep(next);
        setTyping(true);
        setShowVi(false);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Có lỗi, thử lại nhé");
      } finally {
        setBusy(false);
      }
    },
    [busy, step.runId, merge],
  );

  const node = step.node;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (node.type === "line" && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        if (typing) setTyping(false);
        else void go();
      }
      if (node.type === "choice") {
        const n = Number(e.key);
        if (n >= 1 && n <= node.choices.length) void go(node.choices[n - 1]!.id);
      }
      if (node.type === "end" && e.key === "Enter") onDone();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [node, typing, go, onDone]);

  const vi = (text?: string) =>
    text && translation !== "never" && (translation === "always" || showVi) ? (
      <p className="text-muted mt-1">{text}</p>
    ) : text && translation === "tap" ? (
      <button onClick={() => setShowVi(true)} className="text-muted mt-1 text-sm underline">
        Xem nghĩa tiếng Việt
      </button>
    ) : null;

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <span className="border-line bg-surface grid h-12 w-12 place-items-center rounded-xl border">
          <Avatar id={characterId} size={36} />
        </span>
        <div>
          <p className="font-semibold">{guide.name}</p>
          <p className="text-muted text-sm">{guide.role.en}</p>
        </div>
      </div>

      {error && <p className="text-bad mb-3">{error}</p>}

      {step.feedback && (
        <div
          role="status"
          className={`mb-4 rounded-xl border-2 px-4 py-3 ${QUALITY[step.feedback.quality].cls}`}
        >
          <p className="font-semibold">{QUALITY[step.feedback.quality].label}</p>
          <p className="mt-1">{step.feedback.vi}</p>
          {step.feedback.fixes?.map((f, i) => (
            <p key={i} className="mt-1">
              <s>{f.original}</s> → <b>{f.corrected}</b>
            </p>
          ))}
          {step.feedback.better && <p className="mt-2 italic">Gợi ý: {step.feedback.better}</p>}
        </div>
      )}

      {node.type === "line" && (
        <div className="border-line bg-surface rounded-2xl border p-5">
          <p className="text-lg leading-relaxed" aria-live="polite">
            <RichText text={node.en} typewriter={typing} onDone={() => setTyping(false)} />
          </p>
          {!typing && vi(node.vi)}
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => (typing ? setTyping(false) : go())}
              disabled={busy}
              className={btn.primary}
            >
              {typing ? "Hiện hết" : "Tiếp tục"}
            </button>
            <button
              onClick={() =>
                speak(stripMarkup(node.en), {
                  lang: guide.voice.lang,
                  rate,
                  pitch: guide.voice.pitch,
                })
              }
              aria-label="Nghe câu này"
              className={btn.secondary}
            >
              <Volume2 size={18} aria-hidden />
            </button>
          </div>
        </div>
      )}

      {node.type === "choice" && (
        <div>
          {node.promptEn && (
            <p className="text-lg">
              <RichText text={node.promptEn} />
            </p>
          )}
          {node.promptVi && translation !== "never" && (
            <p className="text-muted">{node.promptVi}</p>
          )}
          <p className="text-muted mt-4 text-sm">Bạn sẽ trả lời thế nào?</p>
          <div className="mt-2 grid gap-2">
            {node.choices.map((c, i) => (
              <button
                key={c.id}
                disabled={busy}
                onClick={() => go(c.id)}
                className="border-line bg-surface hover:border-amber rounded-xl border-2 px-4 py-3 text-left"
              >
                <span className="text-muted mr-3 text-sm">{i + 1}</span>
                <RichText text={c.en} />
              </button>
            ))}
          </div>
        </div>
      )}

      {node.type === "freewrite" && (
        <div className="space-y-3">
          {node.context.map((c, i) => (
            <p key={i} className="bg-surface rounded-xl px-4 py-3">
              <b>{c.speaker}:</b> {c.text}
            </p>
          ))}
          <p className="text-lg font-semibold">
            <RichText text={node.taskEn} />
          </p>
          <p className="text-muted">{node.taskVi}</p>
          <FreeWrite busy={busy} onSubmit={(t) => void go(undefined, t)} />
        </div>
      )}

      {node.type === "speak" && (
        <div className="space-y-3">
          <p className="text-lg font-semibold">
            <RichText text={node.promptEn} />
          </p>
          <p className="text-muted">{node.promptVi}</p>
          <Speak phrases={node.phrases} busy={busy} onSubmit={(t) => void go(undefined, t)} />
        </div>
      )}

      {node.type === "quiz" && (
        <div>
          {node.introEn && <p className="mb-1 font-semibold">{node.introEn}</p>}
          <p className="text-muted mb-3 text-sm">
            Cần đúng {node.passAt}/{node.total} câu để tiếp tục
          </p>
          <QuizHost key={node.sessionId} sessionId={node.sessionId} onDone={() => void go()} />
        </div>
      )}

      {node.type === "end" && (
        <div className="border-line bg-surface rounded-2xl border p-5">
          <p className="text-lg font-semibold">Hết hội thoại: {step.title.vi}</p>
          {!!step.rewards?.wordsLearned.length && (
            <p className="text-muted mt-1">
              {step.rewards.wordsLearned.length} từ mới đã vào sổ tay.
            </p>
          )}
          <button onClick={onDone} className={`${btn.primary} mt-4`}>
            Hoàn thành bài
          </button>
        </div>
      )}
    </div>
  );
}
