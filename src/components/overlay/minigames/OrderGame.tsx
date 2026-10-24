"use client";

import { useState } from "react";
import { Skin } from "./Skin";
import type { MiniGameProps } from "./types";

/**
 * Sentence ordering styled as `git rebase -i`: tap tokens to append them, tap a placed token to
 * send it back. Fully keyboard-operable since every token is a button.
 */
export function OrderGame({
  prompt,
  disabled,
  reveal,
  lastWrong,
  onSubmit,
}: MiniGameProps<"sentence_order">) {
  const [picked, setPicked] = useState<string[]>([]);
  const byId = new Map(prompt.tokens.map((t) => [t.id, t.text]));
  const remaining = prompt.tokens.filter((t) => !picked.includes(t.id));
  const complete = picked.length === prompt.tokens.length;

  return (
    <Skin skin="terminal">
      <p className="text-xs text-[#6a9955]"># {prompt.instruction}</p>
      <div
        className={`mt-2 flex min-h-12 flex-wrap gap-2 rounded border border-dashed p-2 ${
          reveal ? "border-[#4ec9b0]" : lastWrong ? "border-[#f14c4c]" : "border-[#555]"
        }`}
        aria-label="Câu của bạn"
      >
        {picked.length === 0 && <span className="text-sm text-[#777]">pick 1 …</span>}
        {picked.map((id) => (
          <button
            key={id}
            disabled={disabled}
            onClick={() => setPicked((p) => p.filter((x) => x !== id))}
            className="rounded bg-[#264f78] px-2 py-1 text-sm text-white"
          >
            {byId.get(id)}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2" aria-label="Các từ">
        {remaining.map((t) => (
          <button
            key={t.id}
            disabled={disabled}
            onClick={() => setPicked((p) => [...p, t.id])}
            className="rounded border border-[#555] px-2 py-1 text-sm hover:border-[#4ec9b0]"
          >
            {t.text}
          </button>
        ))}
      </div>
      {reveal?.kind === "order" && <p className="mt-3 text-sm text-[#4ec9b0]">✓ {reveal.text}</p>}
      <div className="mt-3 flex gap-2">
        <button
          disabled={disabled || !complete}
          onClick={() => {
            onSubmit({ kind: "order", tokenIds: picked });
            setPicked([]);
          }}
          className="rounded bg-[#0e639c] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          :wq (Kiểm tra)
        </button>
        <button
          disabled={disabled || !picked.length}
          onClick={() => setPicked([])}
          className="rounded px-3 py-2 text-sm"
        >
          Làm lại
        </button>
      </div>
    </Skin>
  );
}
