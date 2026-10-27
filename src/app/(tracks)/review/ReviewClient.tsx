"use client";

import { Volume2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { btn } from "@/components/app/ui";
import { LoadingState } from "@/components/app/LoadingState";
import { QuizHost } from "@/components/learn/QuizHost";
import { api } from "@/lib/client/api";
import { speak } from "@/lib/client/tts";
import type { GlossEntry } from "@/lib/contracts/learn";
import { useMe } from "@/stores/meStore";

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
  { r: 1, label: "Quên", cls: "border-bad text-bad" },
  { r: 2, label: "Khó", cls: "border-amber text-ink" },
  { r: 3, label: "Nhớ", cls: "border-ok text-ok" },
  { r: 4, label: "Dễ", cls: "border-merged text-merged" },
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
  const [xp, setXp] = useState(0);

  useEffect(() => {
    api
      .get<Queue>("/api/srs/queue")
      .then(setQueue)
      .catch(() => setQueue({ sessionId: null, dueCount: 0, total: 0, cards: [] }));
  }, []);

  const card = queue?.cards[index];
  const rate = async (rating: 1 | 2 | 3 | 4) => {
    if (!card) return;
    const r = await api.post<{ xp: number }>("/api/srs/review", {
      clientReviewId: crypto.randomUUID(),
      slug: card.slug,
      rating,
      deliveryId: verification?.deliveryId,
      durationMs: Date.now() - startedAt,
    });
    setXp((x) => x + (r.xp ?? 0));
    setDone((d) => d + 1);
    setVerification(null);
    setPhase(queue!.cards[index + 1]?.hasVerification ? "verify" : "rate");
    setIndex((i) => i + 1);
    setStartedAt(Date.now());
  };

  useEffect(() => {
    if (queue && index >= queue.cards.length && done > 0) void useMe.getState().load();
  }, [queue, index, done]);

  if (!queue) return <LoadingState />;
  if (!queue.cards.length || index >= queue.cards.length) {
    return (
      <div className="border-line bg-surface rounded-2xl border p-4 sm:p-6">
        <p className="text-xl font-bold">
          {done ? `Xong ${done} từ${xp ? ` · +${xp} XP` : ""}` : "Không có từ nào cần ôn lúc này"}
        </p>
        <p className="text-muted mt-2">
          Sổ tay của bạn có {queue.total} từ. Từ mới vào sổ tay qua các bài Từ vựng trong lộ trình.
        </p>
        <Link href="/" className={`${btn.primary} mt-5`}>
          Học bài tiếp theo
        </Link>
      </div>
    );
  }

  const showVerify = phase === "verify" && card!.hasVerification && queue.sessionId;
  return (
    <div className="dq-page-enter space-y-4">
      <p className="text-muted text-sm">
        Từ {index + 1}/{queue.cards.length}
      </p>
      {showVerify ? (
        <QuizHost
          key={`${queue.sessionId}-${index}`}
          sessionId={queue.sessionId!}
          single
          onResult={(correct, deliveryId) => setVerification({ deliveryId, correct })}
          onDone={() => setPhase("rate")}
        />
      ) : (
        <div className="border-line bg-surface rounded-2xl border p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-2xl font-bold">
              {card!.word?.lemma}{" "}
              <span className="text-muted text-base font-normal">{card!.word?.ipa}</span>
            </p>
            <button
              onClick={() => speak(card!.word?.lemma ?? "")}
              aria-label="Nghe phát âm"
              className={btn.ghost}
            >
              <Volume2 size={20} aria-hidden />
            </button>
          </div>
          <p className="mt-2 font-semibold">{card!.word?.vi}</p>
          <p className="text-muted mt-1">{card!.word?.def}</p>
          {verification && !verification.correct && (
            <p className="bg-bad-soft mt-3 rounded-lg p-3 text-sm">
              Câu kiểm tra chưa đúng nên từ này sẽ được tính là &quot;Quên&quot; và quay lại sớm.
            </p>
          )}
          <p className="text-muted mt-5 text-sm">Bạn nhớ từ này thế nào?</p>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {RATINGS.map((b) => (
              <button
                key={b.r}
                onClick={() => rate(b.r)}
                className={`bg-surface hover:bg-paper rounded-lg border-2 py-2 font-semibold ${b.cls}`}
              >
                {b.label}
                <span className="text-muted block text-xs font-normal">{card!.intervals[b.r]}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
