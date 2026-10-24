"use client";

import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/client/api";
import { useMe } from "@/stores/meStore";

interface Msg {
  role: "npc" | "me";
  text: string;
  correction?: { original: string; corrected: string; explanation_vi: string } | null;
}

/** Free conversation with an NPC (Claude). Falls back to a friendly notice when AI is unavailable. */
export function ChatPanel({
  npcId,
  npcName,
  onExit,
}: {
  npcId: string;
  npcName: string;
  onExit: () => void;
}) {
  const [session, setSession] = useState<{
    sessionId: string;
    goal: { vi: string };
    turnsLeft: number;
  } | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [goal, setGoal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{
    corrections: { original: string; corrected: string; explanation_vi: string }[];
    usedWords: string[];
    xp: number;
    turns: number;
  } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .post<{ sessionId: string; goal: { vi: string }; opener: string; turnsLeft: number }>(
        "/api/npc/chat/start",
        { npcId },
      )
      .then((s) => {
        setSession(s);
        setMsgs([{ role: "npc", text: s.opener }]);
      })
      .catch((e) =>
        setError(
          e instanceof ApiError && e.code === "AI_UNAVAILABLE"
            ? `${npcName} đang bận họp. Thử lại sau nhé!`
            : e instanceof ApiError
              ? e.message
              : "Không mở được chat",
        ),
      );
  }, [npcId, npcName]);
  useEffect(() => endRef.current?.scrollIntoView({ block: "end" }), [msgs]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !text.trim() || busy) return;
    const mine = text.trim();
    setText("");
    setMsgs((m) => [...m, { role: "me", text: mine }]);
    setBusy(true);
    try {
      const r = await api.post<{
        reply: string;
        correction: Msg["correction"];
        goalProgress: number;
        turnsLeft: number;
        suggestEnd: boolean;
      }>("/api/npc/chat", {
        sessionId: session.sessionId,
        message: mine,
      });
      setMsgs((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { ...copy[copy.length - 1]!, correction: r.correction };
        return [...copy, { role: "npc", text: r.reply }];
      });
      setGoal((g) => Math.max(g, r.goalProgress));
      setSession((s) => s && { ...s, turnsLeft: r.turnsLeft });
      if (r.suggestEnd) await end();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.code === "QUOTA_EXCEEDED"
            ? "Hôm nay bạn đã dùng hết lượt chat. Quay lại mai nhé!"
            : err.code === "AI_UNAVAILABLE"
              ? `${npcName} đang bận, chuyển sang hội thoại có sẵn.`
              : err.message
          : "Lỗi mạng",
      );
    } finally {
      setBusy(false);
    }
  };

  const end = async () => {
    if (!session) return onExit();
    const s = await api.post<NonNullable<typeof summary>>("/api/npc/chat/end", {
      sessionId: session.sessionId,
    });
    setSummary(s);
    if (s.xp) {
      if (s.xp > 0) void useMe.getState().load();
    }
  };

  if (summary) {
    return (
      <div className="space-y-2" role="status">
        <p className="font-bold">
          Tổng kết cuộc trò chuyện ({summary.turns} lượt){summary.xp ? ` · +${summary.xp} XP` : ""}
        </p>
        {summary.usedWords.length > 0 && (
          <p className="text-sm">Từ mục tiêu đã dùng: {summary.usedWords.join(", ")}</p>
        )}
        {summary.corrections.length ? (
          <ul className="space-y-1 text-sm">
            {summary.corrections.map((c, i) => (
              <li key={i} className="bg-paper rounded p-2">
                <s className="text-bad">{c.original}</s> → <b className="text-ok">{c.corrected}</b>
                <span className="text-muted block">{c.explanation_vi}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm">Không có lỗi nào cần sửa. Tuyệt!</p>
        )}
        {!summary.xp && summary.turns < 6 && (
          <p className="text-muted text-xs">
            Trò chuyện ít nhất 6 lượt (mỗi lượt từ 3 từ) để nhận XP.
          </p>
        )}
        <button onClick={onExit} className="bg-ink rounded px-4 py-1.5 text-sm text-white">
          Đóng
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {session && (
        <div className="text-muted text-xs">
          🎯 {session.goal.vi} · còn {session.turnsLeft} lượt
          <div className="bg-line mt-1 h-1.5 rounded">
            <div className="bg-ok h-1.5 rounded" style={{ width: `${(goal / 3) * 100}%` }} />
          </div>
        </div>
      )}
      <div
        className="bg-paper max-h-[40dvh] space-y-2 overflow-y-auto rounded p-2"
        aria-live="polite"
      >
        {msgs.map((m, i) => (
          <div key={i} className={m.role === "me" ? "text-right" : ""}>
            <p
              className={`inline-block max-w-[85%] rounded-lg px-3 py-1.5 text-left ${m.role === "me" ? "bg-amber-soft" : "bg-paper"}`}
            >
              {m.role === "npc" && <b className="mr-1">{npcName}:</b>}
              {m.text}
            </p>
            {m.correction && (
              <p className="text-muted mt-1 text-xs">
                💡 Better: <b>{m.correction.corrected}</b> — {m.correction.explanation_vi}
              </p>
            )}
          </div>
        ))}
        {busy && <p className="text-muted text-sm">{npcName} đang gõ…</p>}
        <div ref={endRef} />
      </div>
      {error && <p className="text-bad text-sm">{error}</p>}
      <form onSubmit={send} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 280))}
          disabled={!session || busy || !!error}
          placeholder="Trả lời bằng tiếng Anh…"
          aria-label="Tin nhắn"
          className="border-line bg-surface flex-1 rounded border px-3 py-1.5"
          autoFocus
        />
        <button
          disabled={!session || busy || !text.trim()}
          className="bg-ink text-paper rounded px-3 text-sm disabled:opacity-40"
        >
          Gửi
        </button>
        <button type="button" onClick={end} className="border-line rounded border px-3 text-sm">
          Kết thúc
        </button>
      </form>
    </div>
  );
}
