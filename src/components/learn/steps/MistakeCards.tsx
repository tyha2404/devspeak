"use client";

import { Volume2 } from "lucide-react";
import { speak } from "@/lib/client/tts";
import type { MistakeItem } from "@/lib/contracts/learn";

const KIND_VI: Record<MistakeItem["kind"], string> = {
  grammar: "Ngữ pháp",
  "word-choice": "Dùng từ",
  register: "Giọng điệu",
  pronunciation: "Phát âm",
  symbol: "Đọc ký hiệu",
};

/** Wrong → right pairs with a short why; pronunciation and symbol items can be heard. */
export function MistakeCards({ items }: { items: MistakeItem[] }) {
  return (
    <ul className="space-y-3">
      {items.map((m) => (
        <li key={m.slug} className="border-line bg-surface rounded-xl border p-4">
          <p className="text-muted text-sm">{KIND_VI[m.kind]}</p>
          {m.wrong && (
            <p className="text-bad mt-1 line-through decoration-2" aria-label={`Sai: ${m.wrong}`}>
              {m.wrong}
            </p>
          )}
          <p className="text-ok mt-1 flex items-start justify-between gap-3 font-semibold">
            <span>{m.right}</span>
            <button
              onClick={() => speak(m.say && m.kind !== "pronunciation" ? m.say : m.right)}
              aria-label="Nghe"
              className="text-muted hover:text-ink"
            >
              <Volume2 size={18} aria-hidden />
            </button>
          </p>
          {m.say && <p className="mt-1 text-sm">Đọc là: {m.say}</p>}
          <p className="text-muted mt-2 text-sm">{m.explanation}</p>
        </li>
      ))}
    </ul>
  );
}
