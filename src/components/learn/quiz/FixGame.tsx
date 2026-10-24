"use client";

import { useState } from "react";
import { OptionButton, Skin } from "./Skin";
import type { MiniGameProps } from "./types";

/** "Fix the commit message": tap the wrong word, then choose its correction. */
export function FixGame({
  prompt,
  disabled,
  reveal,
  lastWrong,
  onSubmit,
}: MiniGameProps<"error_correction">) {
  const [token, setToken] = useState<string | null>(null);
  const revealed = reveal?.kind === "fix" ? reveal : null;

  return (
    <Skin skin={prompt.skin}>
      {prompt.skin === "gitlog" && (
        <p className="text-xs text-[#d7ba7d]">a1b2c3d (HEAD -&gt; feature/login)</p>
      )}
      <p className="mt-1 text-xs opacity-70">1. Chạm vào từ bị sai</p>
      <div className="mt-1 flex flex-wrap gap-1 text-lg">
        {prompt.tokens.map((t) => {
          const isRevealed = revealed?.tokenId === t.id;
          const isPicked = token === t.id;
          const wasWrong = lastWrong?.kind === "fix" && lastWrong.tokenId === t.id && !revealed;
          return (
            <button
              key={t.id}
              disabled={disabled}
              onClick={() => setToken(t.id)}
              className={`rounded px-1 ${
                isRevealed
                  ? "bg-ok text-white"
                  : isPicked
                    ? "bg-amber text-ink"
                    : wasWrong
                      ? "underline decoration-[#f14c4c] decoration-wavy"
                      : "hover:bg-white/10"
              }`}
            >
              {t.text}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs opacity-70">2. Chọn cách sửa</p>
      <div className="mt-1 grid gap-2">
        {prompt.options.map((o, i) => (
          <OptionButton
            key={o.id}
            label={o.text}
            index={i}
            disabled={disabled || !token}
            state={revealed?.optionId === o.id ? "correct" : "idle"}
            onClick={() => token && onSubmit({ kind: "fix", tokenId: token, optionId: o.id })}
          />
        ))}
      </div>
    </Skin>
  );
}
