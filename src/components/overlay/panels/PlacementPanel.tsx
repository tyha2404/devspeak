"use client";

import { useState } from "react";
import { EventBus } from "@/game/EventBus";
import { api } from "@/lib/client/api";
import { useUiStore } from "@/stores/uiStore";
import { QuizHost } from "../QuizHost";
import { Panel } from "./Panel";

const RANK_VI: Record<string, string> = {
  A2: "Intern (A2)",
  B1: "Junior (B1)",
  B2: "Mid (B1+/B2)",
};

/** Onboarding: 12-question placement so B1/B2 learners don't start bored at Intern. */
export function PlacementPanel({ onClose }: { onClose: () => void }) {
  const [session, setSession] = useState<string | null>(null);
  const [result, setResult] = useState<{ cefr: string; startLevel: number } | null>(null);
  const toast = useUiStore((s) => s.toast);

  const skip = () => {
    try {
      localStorage.setItem("dq:placement-dismissed", "1");
    } catch {}
    onClose();
  };

  return (
    <Panel title="👋 Chào mừng đến DevQuest!" onClose={skip}>
      {!session && !result && (
        <div className="space-y-3">
          <p>
            Bạn là lập trình viên mới của công ty. Làm bài kiểm tra 12 câu để bắt đầu đúng trình độ,
            hoặc bắt đầu từ Intern.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={async () =>
                setSession(
                  (await api.post<{ sessionId: string }>("/api/placement/start")).sessionId,
                )
              }
              className="rounded bg-[#1b1b28] px-4 py-2 text-white"
            >
              Làm bài xếp lớp (12 câu)
            </button>
            <button onClick={skip} className="rounded border border-[#1b1b28] px-4 py-2">
              Bắt đầu từ Intern
            </button>
          </div>
          <p className="text-xs text-[#5c5c7a]">
            Điều khiển: WASD/mũi tên để đi, E để nói chuyện, N mở sổ tay.
          </p>
        </div>
      )}
      {session && (
        <QuizHost
          sessionId={session}
          onDone={async () => {
            const r = await api.post<{ cefr: string; startLevel: number }>(
              "/api/placement/finish",
              { sessionId: session },
            );
            setSession(null);
            setResult(r);
            toast(`Bạn bắt đầu ở ${RANK_VI[r.cefr]}`);
            EventBus.emit("world:reload");
          }}
        />
      )}
      {result && (
        <div className="space-y-3 text-center" role="status">
          <p className="text-3xl">🎯</p>
          <p className="font-bold">
            Trình độ: {RANK_VI[result.cefr]} · Level {result.startLevel}
          </p>
          <button onClick={onClose} className="rounded bg-[#1b1b28] px-4 py-2 text-white">
            Vào văn phòng
          </button>
        </div>
      )}
    </Panel>
  );
}
