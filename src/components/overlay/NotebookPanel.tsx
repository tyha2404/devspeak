"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { speak } from "@/lib/client/tts";
import { Panel } from "./panels/Panel";

interface Card {
  slug: string;
  lemma: string;
  ipa: string | null;
  pos: string;
  vi: string;
  def: string;
  state: string;
  due: string;
}

export function NotebookPanel({ onClose }: { onClose: () => void }) {
  const [cards, setCards] = useState<Card[] | null>(null);
  useEffect(() => {
    api
      .get<Card[]>("/api/notebook")
      .then(setCards)
      .catch(() => setCards([]));
  }, []);
  const due = cards?.filter((c) => new Date(c.due) <= new Date()).length ?? 0;

  return (
    <Panel title={`📒 Sổ tay · ${cards?.length ?? 0} từ`} label="Sổ tay từ vựng" onClose={onClose}>
      {due > 0 && (
        <a
          href="/review"
          className="block rounded bg-[#f2a65a] px-3 py-2 text-center font-semibold"
        >
          Ôn {due} từ đến hạn →
        </a>
      )}
      <ul className="mt-3 space-y-2">
        {cards?.length === 0 && (
          <li className="text-[#5c5c7a]">
            Chưa có từ nào. Chạm vào từ được gạch chân khi nói chuyện để thêm.
          </li>
        )}
        {cards?.map((c) => (
          <li key={c.slug} className="rounded bg-white px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold">
                {c.lemma} <span className="text-xs font-normal text-[#5c5c7a]">{c.ipa}</span>
              </span>
              <button onClick={() => speak(c.lemma)} aria-label={`Nghe ${c.lemma}`}>
                🔊
              </button>
            </div>
            <p className="text-sm">{c.vi}</p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
