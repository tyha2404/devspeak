"use client";

import { useState } from "react";
import { addToNotebook } from "@/lib/client/api";
import { speak } from "@/lib/client/tts";
import { useGlossary } from "@/stores/glossaryStore";
import { useSettings } from "@/stores/settingsStore";
import { useToasts } from "@/stores/toastStore";

const POS_VI: Record<string, string> = {
  noun: "danh từ",
  verb: "động từ",
  adjective: "tính từ",
  adverb: "trạng từ",
  phrase: "cụm từ",
  phrasal_verb: "cụm động từ",
  preposition: "giới từ",
};

export function WordPopover() {
  const entry = useGlossary((s) => s.open);
  const close = useGlossary((s) => s.close);
  const rate = useSettings((s) => s.ttsRate);
  const toast = useToasts((s) => s.toast);
  const [saving, setSaving] = useState(false);
  if (!entry) return null;

  const save = async () => {
    setSaving(true);
    try {
      const r = await addToNotebook(entry.slug);
      toast(
        r.added ? `📒 Đã thêm "${entry.lemma}" vào sổ tay` : `"${entry.lemma}" đã có trong sổ tay`,
      );
      close();
    } catch {
      toast("Không lưu được, thử lại sau nhé");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-label={entry.lemma}
      className="border-line bg-surface text-ink pointer-events-auto fixed inset-x-4 top-20 z-50 mx-auto max-w-md rounded-xl border p-4 shadow-2xl"
      onKeyDown={(e) => e.key === "Escape" && close()}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xl font-bold">{entry.lemma}</p>
          <p className="text-muted text-sm">
            {entry.ipa ? `${entry.ipa} · ` : ""}
            {POS_VI[entry.pos] ?? entry.pos}
          </p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => speak(entry.lemma, { rate })}
            aria-label="Nghe phát âm"
            className="bg-paper rounded px-2 py-1"
          >
            🔊
          </button>
          <button
            onClick={() => speak(entry.lemma, { rate: 0.6 })}
            aria-label="Nghe chậm"
            className="bg-paper rounded px-2 py-1 text-xs"
          >
            🐢
          </button>
          <button onClick={close} aria-label="Đóng" className="rounded px-2 py-1">
            ✕
          </button>
        </div>
      </div>
      <p className="mt-2 font-semibold">{entry.vi}</p>
      <p className="mt-1 text-sm">{entry.def}</p>
      {entry.note && <p className="text-muted mt-1 text-sm">💡 {entry.note}</p>}
      {entry.example && (
        <p className="border-amber mt-2 border-l-4 pl-2 text-sm italic">
          {entry.example.en}
          {entry.example.vi && (
            <span className="text-muted block not-italic">{entry.example.vi}</span>
          )}
        </p>
      )}
      <button
        onClick={save}
        disabled={saving}
        className="bg-ink text-paper mt-3 w-full rounded py-2 text-sm font-semibold disabled:opacity-50"
      >
        📒 Thêm vào sổ tay
      </button>
    </div>
  );
}
