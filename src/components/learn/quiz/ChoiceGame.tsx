"use client";

import { useEffect } from "react";
import { RichText } from "../RichText";
import { speak, speakScript } from "@/lib/client/tts";
import { useSettings } from "@/stores/settingsStore";
import { OptionButton, Skin, type OptionState } from "./Skin";
import type { MiniGameProps } from "./types";

type ChoicePrompt = MiniGameProps["prompt"] & { options: { id: string; text: string }[] };

/** Multiple choice for vocab checks, reply choices, listening and word-bank fill-ins. */
export function ChoiceGame({ prompt, disabled, reveal, lastWrong, onSubmit }: MiniGameProps) {
  const p = prompt as ChoicePrompt;
  const rate = useSettings((s) => s.ttsRate);

  const stateOf = (id: string): OptionState => {
    if (reveal?.kind === "choice") {
      if (reveal.optionId === id) return "correct";
      if (lastWrong?.kind === "choice" && lastWrong.optionId === id) return "wrong";
      return "idle";
    }
    if (lastWrong?.kind === "choice" && lastWrong.optionId === id) return "wrong";
    return "idle";
  };

  useEffect(() => {
    if (p.type === "listening") {
      if (p.script) speakScript(p.script, rate);
      else speak(p.tts, { lang: p.voice, rate });
    }
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (!disabled && n >= 1 && n <= p.options.length)
        onSubmit({ kind: "choice", optionId: p.options[n - 1]!.id });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [p, disabled, onSubmit, rate]);

  return (
    <Skin skin={p.skin}>
      {p.type === "mcq_meaning" && (
        <>
          <p className="text-lg">
            <RichText text={p.stem} />
          </p>
          <p className="mt-2 font-semibold">{p.question}</p>
        </>
      )}
      {p.type === "fill_blank" && (
        <>
          {p.context && <p className="text-sm opacity-70">{p.context}</p>}
          <p className="mt-1 text-lg">{p.sentence.replace("___", "_____")}</p>
        </>
      )}
      {p.type === "reply_choice" && (
        <div className="space-y-2">
          {p.context.map((m, i) => (
            <p key={i} className="bg-paper text-ink rounded px-3 py-2">
              <span className="font-bold">{m.speaker}: </span>
              {m.text}
            </p>
          ))}
          <p className="font-semibold">Bạn trả lời thế nào?</p>
        </div>
      )}
      {p.type === "listening" && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() =>
                p.script ? speakScript(p.script, rate) : speak(p.tts, { lang: p.voice, rate })
              }
              className="bg-merged rounded px-3 py-1 text-sm font-semibold"
            >
              🔊 Nghe lại
            </button>
            <button
              onClick={() =>
                p.script ? speakScript(p.script, 0.65) : speak(p.tts, { lang: p.voice, rate: 0.65 })
              }
              className="rounded bg-white/20 px-3 py-1 text-sm"
            >
              🐢 Chậm
            </button>
          </div>
          {p.script && (
            <p className="text-xs opacity-70">
              🎧 Cuộc họp {p.script.length} lượt nói ·{" "}
              {[...new Set(p.script.map((l) => l.speaker))].join(", ")}
            </p>
          )}
          {reveal &&
            (p.script ? (
              <ul className="space-y-0.5 text-sm opacity-80">
                {p.script.map((l, i) => (
                  <li key={i}>
                    <b>{l.speaker}:</b> {l.text}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm opacity-80">“{p.tts}”</p>
            ))}
          <p className="font-semibold">{p.question}</p>
        </div>
      )}
      <div className="mt-3 grid gap-2">
        {p.options.map((o, i) => (
          <OptionButton
            key={o.id}
            label={o.text}
            index={i}
            state={stateOf(o.id)}
            disabled={disabled}
            onClick={() => onSubmit({ kind: "choice", optionId: o.id })}
          />
        ))}
      </div>
    </Skin>
  );
}
