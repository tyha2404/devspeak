"use client";

import { useEffect, useRef, useState } from "react";
import { Skin } from "./Skin";
import type { MiniGameProps } from "./types";

/** Fill-in-the-blank with a typed answer (no word bank). */
export function TypeGame({
  prompt,
  disabled,
  reveal,
  lastWrong,
  onSubmit,
}: MiniGameProps<"fill_blank">) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const [before, after] = prompt.sentence.split("___");

  useEffect(() => {
    ref.current?.focus();
  }, []);
  useEffect(() => {
    if (lastWrong) setText("");
  }, [lastWrong]);

  return (
    <Skin skin={prompt.skin}>
      {prompt.context && <p className="text-sm opacity-70">{prompt.context}</p>}
      <form
        className="mt-1 text-lg"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) onSubmit({ kind: "text", text });
        }}
      >
        <label>
          {before}
          <input
            ref={ref}
            value={reveal?.kind === "text" && reveal.text ? reveal.text : text}
            onChange={(e) => setText(e.target.value)}
            disabled={disabled}
            aria-label="Điền từ còn thiếu"
            autoCapitalize="off"
            autoComplete="off"
            spellCheck={false}
            className={`bg-amber-soft text-ink mx-1 w-32 rounded border-b-4 px-2 outline-none ${
              reveal ? "border-ok" : lastWrong ? "border-bad" : "border-amber"
            }`}
          />
          {after}
        </label>
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="bg-ink text-paper mt-3 block rounded px-4 py-2 text-sm font-semibold disabled:opacity-40"
        >
          Kiểm tra (Enter)
        </button>
      </form>
    </Skin>
  );
}
