"use client";

import { useEffect, useState } from "react";
import { EventBus } from "@/game/EventBus";
import { api, ApiError } from "@/lib/client/api";
import { useProfileStore } from "@/stores/profileStore";
import { useUiStore } from "@/stores/uiStore";
import { BossScene } from "../BossScene";
import { QuizHost } from "../QuizHost";
import { Panel } from "./Panel";

const RANK_VI: Record<string, string> = {
  intern: "Intern",
  junior: "Junior",
  mid: "Mid",
  senior: "Senior",
  techlead: "Tech Lead",
};

interface Status {
  rank: string;
  level: number;
  next: string | null;
  minLevel: number | null;
  eligible: boolean;
  boss: { en: string; vi: string } | null;
}

/** Promotion boss for the next rank (interview, architecture review, client demo, tech talk). Never ends early. */
export function PromotionPanel({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [session, setSession] = useState<{
    sessionId: string;
    total: number;
    passAt: number;
  } | null>(null);
  const [result, setResult] = useState<{
    passed: boolean;
    correct: number;
    total: number;
    rank: string;
  } | null>(null);
  const [answered, setAnswered] = useState({ correct: 0, wrong: 0 });
  const toast = useUiStore((s) => s.toast);

  useEffect(() => {
    api.get<Status>("/api/promotion").then(setStatus);
  }, []);

  const start = async () => {
    try {
      setResult(null);
      setAnswered({ correct: 0, wrong: 0 });
      setSession(await api.post("/api/promotion/start"));
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Không bắt đầu được");
    }
  };

  const finish = async () => {
    if (!session) return;
    const r = await api.post<{ passed: boolean; correct: number; total: number; rank: string }>(
      "/api/promotion/finish",
      { sessionId: session.sessionId },
    );
    setResult(r);
    setSession(null);
    if (r.passed) {
      const { profile, setProfile } = useProfileStore.getState();
      if (profile) setProfile({ ...profile, rank: r.rank as never });
      toast(`🎖️ Chúc mừng! Bạn đã lên ${RANK_VI[r.rank]}`);
      // New rank unlocks doors and NPCs: rebuild the world with fresh unlocks.
      EventBus.emit("world:reload");
    }
  };

  return (
    <Panel title="🎖️ Promotion Review" onClose={onClose}>
      {!status && <p>Đang tải…</p>}
      {status && !session && !result && (
        <div className="space-y-3">
          <p>
            Cấp bậc hiện tại: <b>{RANK_VI[status.rank]}</b> · Level {status.level}
          </p>
          {status.next ? (
            <>
              <p>
                <b>{status.boss?.vi}</b> — thử thách để lên <b>{RANK_VI[status.next]}</b>: 8 câu hỗn
                hợp, cần đúng ≥70%. Có thể thử lại bất cứ lúc nào.
              </p>
              {status.eligible ? (
                <button onClick={start} className="rounded bg-[#1b1b28] px-4 py-2 text-white">
                  Bắt đầu phỏng vấn
                </button>
              ) : (
                <p className="rounded bg-[#fff3c4] p-2 text-sm">
                  Cần đạt Level {status.minLevel} để được phỏng vấn.
                </p>
              )}
            </>
          ) : (
            <p>Bạn đã ở cấp cao nhất hiện có. 🎉</p>
          )}
        </div>
      )}
      {session && (
        <div className="space-y-3">
          <BossScene
            fromRank={status?.rank ?? "intern"}
            correct={answered.correct}
            wrong={answered.wrong}
            total={session.total}
          />
          <QuizHost
            sessionId={session.sessionId}
            onDone={() => void finish()}
            onResult={(correct) =>
              setAnswered((a) =>
                correct ? { ...a, correct: a.correct + 1 } : { ...a, wrong: a.wrong + 1 },
              )
            }
          />
        </div>
      )}
      {result && (
        <div className="space-y-3 text-center" role="status">
          <p className="text-3xl">{result.passed ? "🎉" : "📚"}</p>
          <p className="font-bold">
            {result.passed ? `Đậu! Bạn giờ là ${RANK_VI[result.rank]}` : "Chưa đậu lần này"} (
            {result.correct}/{result.total})
          </p>
          {!result.passed && (
            <p className="text-sm">Ôn thêm với các NPC rồi thử lại nhé — không mất gì cả.</p>
          )}
          <button
            onClick={result.passed ? onClose : start}
            className="rounded bg-[#1b1b28] px-4 py-2 text-white"
          >
            {result.passed ? "Đóng" : "Thử lại"}
          </button>
        </div>
      )}
    </Panel>
  );
}
