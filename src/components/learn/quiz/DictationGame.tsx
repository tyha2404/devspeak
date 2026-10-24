"use client";

import { useEffect, useState } from "react";
import { playUrl, speak } from "@/lib/client/tts";
import { useSettings } from "@/stores/settingsStore";
import { Skin } from "./Skin";
import type { MiniGameProps } from "./types";

/** Listen and type what you hear (Zoom call skin). Small typos on long words are accepted. */
export function DictationGame({
  prompt,
  disabled,
  reveal,
  lastWrong,
  onSubmit,
}: MiniGameProps<"listening">) {
  const [text, setText] = useState("");
  const rate = useSettings((s) => s.ttsRate);
  const play = (r: number) =>
    prompt.audio ? playUrl(prompt.audio, r) : speak(prompt.tts, { lang: prompt.voice, rate: r });
  useEffect(() => {
    play(rate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt, rate]);
  useEffect(() => {
    if (lastWrong) setText("");
  }, [lastWrong]);
  return (
    <Skin skin="zoom">
      <div className="flex gap-2">
        <button
          onClick={() => play(rate)}
          className="bg-merged rounded px-3 py-1 text-sm font-semibold"
        >
          🔊 Nghe lại
        </button>
        <button onClick={() => play(0.6)} className="rounded bg-white/20 px-3 py-1 text-sm">
          🐢 Chậm
        </button>
      </div>
      <p className="mt-2 font-semibold">{prompt.question}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) onSubmit({ kind: "text", text });
        }}
        className="mt-2 flex gap-2"
      >
        <input
          value={reveal?.kind === "text" && reveal.text ? reveal.text : text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
          aria-label="Gõ câu bạn nghe được"
          autoComplete="off"
          spellCheck={false}
          className="text-ink flex-1 rounded bg-white px-2 py-1"
        />
        <button
          disabled={disabled || !text.trim()}
          className="rounded bg-[#0e639c] px-3 text-sm disabled:opacity-40"
        >
          Kiểm tra
        </button>
      </form>
    </Skin>
  );
}
