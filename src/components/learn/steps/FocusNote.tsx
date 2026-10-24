"use client";

import { Volume2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { speak } from "@/lib/client/tts";
import { useSettings } from "@/stores/settingsStore";

/** A short Vietnamese explanation (Markdown, raw HTML disabled) plus example sentences to listen to. */
export function FocusNote({
  markdown,
  examples,
}: {
  markdown: string;
  examples: { en: string; vi?: string }[];
}) {
  const rate = useSettings((s) => s.ttsRate);
  return (
    <div>
      <div className="dq-prose">
        <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
          {markdown}
        </ReactMarkdown>
      </div>
      {examples.length > 0 && (
        <ul className="mt-6 space-y-3">
          {examples.map((e) => (
            <li key={e.en} className="border-line bg-surface rounded-xl border p-4">
              <p className="flex items-start justify-between gap-3">
                <span className="font-medium">{e.en}</span>
                <button
                  onClick={() => speak(e.en, { rate })}
                  aria-label="Nghe câu này"
                  className="text-muted hover:text-ink"
                >
                  <Volume2 size={18} aria-hidden />
                </button>
              </p>
              {e.vi && <p className="text-muted mt-1 text-sm">{e.vi}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
