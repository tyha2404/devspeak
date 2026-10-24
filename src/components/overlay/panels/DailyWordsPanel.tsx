"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { applyAward, applyProgress, type ProgressUpdate } from "@/lib/client/progress";
import { speak } from "@/lib/client/tts";
import type { GlossEntry } from "@/lib/contracts/dialogue";
import { useSettings } from "@/stores/settingsStore";
import { Panel } from "./Panel";

type Word = GlossEntry & { slot: number; learned: boolean };

export function DailyWordsPanel({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<{ day: string; words: Word[] } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const rate = useSettings((s) => s.ttsRate);

  useEffect(() => {
    api
      .get<{ day: string; words: Word[] }>("/api/daily")
      .then(setData)
      .catch(() => setData({ day: "", words: [] }));
  }, []);

  const learn = async (w: Word, known: boolean) => {
    setBusy(w.slug);
    try {
      const r = await api.post<{ award: object; bonus: object | null; progress: ProgressUpdate }>(
        "/api/daily/learn",
        { slug: w.slug, known },
      );
      applyAward(r.bonus ?? r.award);
      applyProgress(r.progress);
      setData(
        (d) =>
          d && {
            ...d,
            words: d.words.map((x) => (x.slug === w.slug ? { ...x, learned: true } : x)),
          },
      );
    } finally {
      setBusy(null);
    }
  };

  const learnedCount = data?.words.filter((w) => w.learned).length ?? 0;
  return (
    <Panel title={`📋 Word of the Day ${data?.day ? `· ${data.day}` : ""}`} onClose={onClose}>
      {!data && <p>Đang tải…</p>}
      {data && data.words.length === 0 && (
        <p>Hôm nay bạn có nhiều thẻ cần ôn — hãy ôn tập trước nhé!</p>
      )}
      {data && data.words.length > 0 && (
        <p className="mb-3 text-sm text-[#5c5c7a]">
          {learnedCount}/{data.words.length} từ · +5 XP mỗi từ, +25 XP khi học đủ
        </p>
      )}
      <ul className="space-y-3">
        {data?.words.map((w) => (
          <li
            key={w.slug}
            className={`rounded border-2 bg-white p-3 ${w.learned ? "border-[#2e7d32]" : "border-transparent"}`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-lg font-bold">
                {w.lemma} <span className="text-sm font-normal text-[#5c5c7a]">{w.ipa}</span>
              </p>
              <button onClick={() => speak(w.lemma, { rate })} aria-label={`Nghe ${w.lemma}`}>
                🔊
              </button>
            </div>
            <p className="font-semibold">{w.vi}</p>
            <p className="text-sm">{w.def}</p>
            {w.example && (
              <p className="mt-1 border-l-4 border-[#f2a65a] pl-2 text-sm italic">
                {w.example.en}
                {w.example.vi && (
                  <span className="block text-[#5c5c7a] not-italic">{w.example.vi}</span>
                )}
              </p>
            )}
            {w.learned ? (
              <p className="mt-2 text-sm text-[#2e7d32]">✓ Đã vào sổ tay</p>
            ) : (
              <div className="mt-2 flex gap-2">
                <button
                  disabled={!!busy}
                  onClick={() => learn(w, false)}
                  className="rounded bg-[#1b1b28] px-3 py-1 text-sm text-white"
                >
                  Học từ này
                </button>
                <button
                  disabled={!!busy}
                  onClick={() => learn(w, true)}
                  className="rounded border border-[#1b1b28] px-3 py-1 text-sm"
                >
                  Tôi biết rồi
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
