"use client";

import { Volume2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { btn } from "@/components/app/ui";
import { LoadingState } from "@/components/app/LoadingState";
import { api } from "@/lib/client/api";
import { speak } from "@/lib/client/tts";

interface Card {
  slug: string;
  lemma: string;
  ipa: string | null;
  pos: string;
  vi: string;
  def: string;
  state: string;
  due: string;
  reps: number;
}

const STATE_VI: Record<string, string> = {
  new: "Mới",
  learning: "Đang học",
  review: "Đã thuộc",
  relearning: "Học lại",
};

export function WordsClient() {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [q, setQ] = useState("");
  useEffect(() => {
    api
      .get<Card[]>("/api/notebook")
      .then(setCards)
      .catch(() => setCards([]));
  }, []);
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (cards ?? []).filter(
      (c) =>
        !needle || c.lemma.toLowerCase().includes(needle) || c.vi.toLowerCase().includes(needle),
    );
  }, [cards, q]);
  const due = cards?.filter((c) => new Date(c.due) <= new Date()).length ?? 0;
  if (!cards) return <LoadingState />;

  return (
    <div className="dq-page-enter">
      <h1 className="text-[1.75rem] font-bold">Sổ tay từ vựng</h1>
      <p className="text-muted mt-1">{`${cards.length} từ · ${due} từ cần ôn hôm nay`}</p>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Tìm từ tiếng Anh hoặc nghĩa tiếng Việt"
        aria-label="Tìm trong sổ tay"
        className="border-line bg-surface mt-5 w-full rounded-lg border px-3 py-2.5"
      />
      {cards?.length === 0 && (
        <p className="text-muted mt-6">
          Chưa có từ nào. Từ sẽ vào sổ tay khi bạn học bài Từ vựng, hoặc chạm vào từ được gạch chân
          trong hội thoại.
        </p>
      )}
      <ul className="divide-line border-line bg-surface mt-4 divide-y rounded-xl border">
        {shown.map((c) => (
          <li key={c.slug} className="flex items-start gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p>
                <span className="font-semibold">{c.lemma}</span>{" "}
                <span className="text-muted text-sm">
                  {c.ipa} · {c.pos}
                </span>
              </p>
              <p className="text-sm">{c.vi}</p>
            </div>
            <span className="bg-paper text-muted mt-0.5 rounded-md px-2 py-0.5 text-xs">
              {STATE_VI[c.state] ?? c.state}
            </span>
            <button
              onClick={() => speak(c.lemma)}
              aria-label={`Nghe ${c.lemma}`}
              className={btn.ghost}
            >
              <Volume2 size={18} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
