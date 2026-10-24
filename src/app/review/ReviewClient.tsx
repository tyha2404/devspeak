"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { QuizHost } from "@/components/overlay/QuizHost";
import { api } from "@/lib/client/api";
import { applyAward, applyProgress, type ProgressUpdate } from "@/lib/client/progress";
import { ensureSession } from "@/lib/client/session";
import { speak } from "@/lib/client/tts";
import type { GlossEntry } from "@/lib/contracts/dialogue";

interface Queue {
  sessionId: string | null;
  dueCount: number;
  total: number;
  cards: {
    slug: string;
    word: GlossEntry;
    hasVerification: boolean;
    intervals: Record<1 | 2 | 3 | 4, string>;
  }[];
}

const RATINGS = [
  { r: 1, label: "Quên", cls: "bg-[#c62828]" },
  { r: 2, label: "Khó", cls: "bg-[#ef6c00]" },
  { r: 3, label: "Nhớ", cls: "bg-[#2e7d32]" },
  { r: 4, label: "Dễ", cls: "bg-[#1565c0]" },
] as const;

/**
 * Review loop per card: answer the server-graded check first (that decides XP and forces "Again"
 * on a miss), then rate how well you remembered.
 */
export function ReviewClient() {
  const [queue, setQueue] = useState<Queue | null>(null);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"verify" | "rate">("verify");
  const [verification, setVerification] = useState<{ deliveryId: string; correct: boolean } | null>(
    null,
  );
  const [startedAt, setStartedAt] = useState(Date.now());
  const [done, setDone] = useState(0);

  useEffect(() => {
    ensureSession()
      .then(() => api.get<Queue>("/api/srs/queue"))
      .then(setQueue)
      .catch(() => setQueue({ sessionId: null, dueCount: 0, total: 0, cards: [] }));
  }, []);

  const card = queue?.cards[index];
  const rate = async (rating: 1 | 2 | 3 | 4) => {
    if (!card) return;
    const r = await api.post<{ award: object | null; progress: ProgressUpdate }>(
      "/api/srs/review",
      {
        clientReviewId: crypto.randomUUID(),
        slug: card.slug,
        rating,
        deliveryId: verification?.deliveryId,
        durationMs: Date.now() - startedAt,
      },
    );
    applyAward(r.award as never);
    applyProgress(r.progress);
    setDone((d) => d + 1);
    setVerification(null);
    setPhase(queue!.cards[index + 1]?.hasVerification ? "verify" : "rate");
    setIndex((i) => i + 1);
    setStartedAt(Date.now());
  };

  if (!queue) return <p>Đang tải…</p>;
  if (!queue.cards.length || index >= queue.cards.length) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-4xl">✅</p>
        <p className="text-lg font-bold">
          {done ? `Xong ${done} thẻ!` : "Không có thẻ nào đến hạn."}
        </p>
        <p className="text-[#c9c6b5]">
          Sổ tay của bạn có {queue.total} từ. Quay lại khi có thẻ đến hạn nhé.
        </p>
        <Link
          href="/play"
          className="inline-block rounded bg-[#f2a65a] px-4 py-2 font-semibold text-[#1b1b28]"
        >
          Về văn phòng
        </Link>
      </div>
    );
  }

  const showVerify = phase === "verify" && card!.hasVerification && queue.sessionId;
  return (
    <div className="space-y-4">
      <p className="text-sm text-[#c9c6b5]">
        Thẻ {index + 1}/{queue.cards.length}
      </p>
      {showVerify ? (
        <div className="rounded-lg bg-[#f4f1de] p-4 text-[#1b1b28]">
          <QuizHost
            key={`${queue.sessionId}-${index}`}
            sessionId={queue.sessionId!}
            single
            onResult={(correct, deliveryId) => setVerification({ deliveryId, correct })}
            onDone={() => setPhase("rate")}
          />
        </div>
      ) : (
        <div className="space-y-3 rounded-lg bg-[#f4f1de] p-4 text-[#1b1b28]">
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold">
              {card!.word?.lemma}{" "}
              <span className="text-sm font-normal text-[#5c5c7a]">{card!.word?.ipa}</span>
            </p>
            <button onClick={() => speak(card!.word?.lemma ?? "")} aria-label="Nghe">
              🔊
            </button>
          </div>
          <p className="font-semibold">{card!.word?.vi}</p>
          <p className="text-sm">{card!.word?.def}</p>
          {verification && !verification.correct && (
            <p className="rounded bg-[#ffebee] p-2 text-sm">
              Bài kiểm tra sai nên thẻ sẽ được tính là &quot;Quên&quot;.
            </p>
          )}
          <div className="grid grid-cols-4 gap-2">
            {RATINGS.map((b) => (
              <button
                key={b.r}
                onClick={() => rate(b.r)}
                className={`rounded py-2 text-sm font-semibold text-white ${b.cls}`}
              >
                {b.label}
                <span className="block text-xs font-normal opacity-80">{card!.intervals[b.r]}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
