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
            className={`mx-1 w-32 rounded border-b-4 bg-[#fff8e1] px-2 text-[#1b1b28] outline-none ${
              reveal ? "border-[#2e7d32]" : lastWrong ? "border-[#c62828]" : "border-[#2667cc]"
            }`}
          />
          {after}
        </label>
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="mt-3 block rounded bg-[#1b1b28] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          Kiểm tra (Enter)
        </button>
      </form>
    </Skin>
  );
}
