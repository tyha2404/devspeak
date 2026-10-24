"use client";

import { useCallback, useEffect, useState } from "react";
import { NPCS } from "@/game/data/npcs";
import { advanceDialogue, api, ApiError, startDialogue } from "@/lib/client/api";
import { speak } from "@/lib/client/tts";
import type { DialogueStep } from "@/lib/contracts/dialogue";
import { stripMarkup } from "@/lib/markup";
import { useGlossary } from "@/stores/glossaryStore";
import { useProfileStore } from "@/stores/profileStore";
import { useSettings } from "@/stores/settingsStore";
import { useUiStore } from "@/stores/uiStore";
import { Portrait } from "./BossScene";
import { ChatPanel } from "./ChatPanel";
import { Panel } from "./panels/Panel";
import { QuizHost } from "./QuizHost";
import { RichText } from "./RichText";
import { FreeWrite, Speak } from "./WriteSpeak";

const QUALITY = {
  best: { label: "Tuyệt vời!", cls: "border-[#2e7d32] bg-[#e8f5e9]" },
  ok: { label: "Ổn, nhưng có thể tốt hơn", cls: "border-[#f9a825] bg-[#fff8e1]" },
  poor: { label: "Chưa phù hợp", cls: "border-[#c62828] bg-[#ffebee]" },
};

export function DialogueOverlay({ npcId, onClose }: { npcId: string; onClose: () => void }) {
  const npc = NPCS[npcId];
  const [step, setStep] = useState<DialogueStep | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [typing, setTyping] = useState(true);
  const [showVi, setShowVi] = useState(false);
  const [busy, setBusy] = useState(false);
  const [chatting, setChatting] = useState(false);
  const [chatAvailable, setChatAvailable] = useState(false);
  const translation = useSettings((s) => s.translation);
  const rate = useSettings((s) => s.ttsRate);
  const merge = useGlossary((s) => s.merge);
  const toast = useUiStore((s) => s.toast);

  const apply = useCallback(
    (s: DialogueStep) => {
      merge(s.glossary);
      setStep(s);
      setTyping(true);
      setShowVi(false);
      if (s.rewards) {
        const { profile, setProfile } = useProfileStore.getState();
        if (profile)
          setProfile({
            ...profile,
            xpTotal: s.rewards.xpTotal,
            level: s.rewards.level,
            coins: s.rewards.coins || profile.coins,
          });
        if (s.rewards.leveledUp) toast(`🎉 Lên cấp! Level ${s.rewards.level}`);
      }
    },
    [merge, toast],
  );

  useEffect(() => {
    api
      .get<{ available: boolean; npcs: string[] }>("/api/npc/chat/status")
      .then((s) => setChatAvailable(s.available && s.npcs.includes(npcId)))
      .catch(() => {});
  }, [npcId]);

  useEffect(() => {
    startDialogue(npcId)
      .then(apply)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Không bắt đầu được hội thoại"));
  }, [npcId, apply]);

  const go = useCallback(
    async (choiceId?: string, text?: string) => {
      if (!step || busy) return;
      setBusy(true);
      try {
        apply(await advanceDialogue(step.runId, choiceId, text));
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Có lỗi, thử lại nhé");
      } finally {
        setBusy(false);
      }
    },
    [step, busy, apply],
  );

  const node = step?.node;
  // Enter/Space: finish the typewriter, then advance a line; number keys pick choices.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (chatting || !node || (e.target as HTMLElement)?.tagName === "INPUT") return;
      if (node.type === "line" && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        if (typing) setTyping(false);
        else void go();
      }
      if (node.type === "choice") {
        const n = Number(e.key);
        if (n >= 1 && n <= node.choices.length) void go(node.choices[n - 1]!.id);
      }
      if (node.type === "end" && e.key === "Enter") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [node, typing, go, onClose, chatting]);

  const vi = (text?: string) =>
    text && translation !== "never" && (translation === "always" || showVi) ? (
      <p className="mt-1 text-sm text-[#5c5c7a]">{text}</p>
    ) : text && translation === "tap" ? (
      <button onClick={() => setShowVi(true)} className="mt-1 text-xs text-[#5c5c7a] underline">
        Xem nghĩa tiếng Việt
      </button>
    ) : null;

  return (
    <Panel
      placement="bottom"
      onClose={onClose}
      label={npc ? `${npc.name} · ${npc.role.en}` : npcId}
      title={
        <>
          {npc?.name ?? npcId}
          <span className="ml-2 font-normal text-[#f4f1de]/60">{npc?.role.en}</span>
        </>
      }
    >
      <div className="flex gap-3 sm:gap-4">
        <div className="hidden flex-none sm:block">
          <div className="grid h-20 w-20 place-items-center rounded border-2 border-[#2b2d42] bg-[#e8e2cf]">
            <Portrait id={npcId} size={64} />
          </div>
          {step && (
            <p className="mt-1 w-20 text-center text-[10px] leading-tight text-[#5c5c7a]">
              {step.title.vi}
            </p>
          )}
        </div>
        <div className="min-w-0 flex-1">
          {chatAvailable && !chatting && (node?.type === "end" || error) && (
            <button
              onClick={() => setChatting(true)}
              className="mb-3 rounded bg-[#4a154b] px-3 py-1.5 text-sm text-white"
            >
              💬 Trò chuyện tự do với {npc?.name.split(" ")[0]} (AI)
            </button>
          )}
          {chatting && (
            <ChatPanel npcId={npcId} npcName={npc?.name.split(" ")[0] ?? npcId} onExit={onClose} />
          )}
          {chatting ? null : (
            <>
              {error && <p className="text-[#c62828]">{error}</p>}
              {!step && !error && <p>…</p>}

              {step?.feedback && (
                <div
                  className={`mb-3 rounded border-2 px-3 py-2 text-sm ${QUALITY[step.feedback.quality].cls}`}
                  role="status"
                >
                  <span className="font-bold">{QUALITY[step.feedback.quality].label}</span>{" "}
                  {step.feedback.vi}
                  {step.feedback.fixes?.map((f, i) => (
                    <span key={i} className="block">
                      <s>{f.original}</s> → <b>{f.corrected}</b>
                    </span>
                  ))}
                  {step.feedback.better && (
                    <span className="mt-1 block italic">💡 {step.feedback.better}</span>
                  )}
                </div>
              )}

              {node?.type === "freewrite" && (
                <div className="space-y-2">
                  {node.context.map((c, i) => (
                    <p key={i} className="rounded bg-white px-3 py-2">
                      <b>{c.speaker}:</b> {c.text}
                    </p>
                  ))}
                  <p className="font-semibold">
                    <RichText text={node.taskEn} />
                  </p>
                  <p className="text-sm text-[#5c5c7a]">{node.taskVi}</p>
                  <FreeWrite busy={busy} onSubmit={(t) => void go(undefined, t)} />
                </div>
              )}

              {node?.type === "speak" && (
                <div className="space-y-2">
                  <p className="text-lg font-semibold">
                    <RichText text={node.promptEn} />
                  </p>
                  <p className="text-sm text-[#5c5c7a]">{node.promptVi}</p>
                  <Speak
                    phrases={node.phrases}
                    busy={busy}
                    onSubmit={(t) => void go(undefined, t)}
                  />
                </div>
              )}

              {node?.type === "line" && (
                <div>
                  <p className="text-lg leading-relaxed" aria-live="polite">
                    <RichText text={node.en} typewriter={typing} onDone={() => setTyping(false)} />
                  </p>
                  {!typing && vi(node.vi)}
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => (typing ? setTyping(false) : go())}
                      disabled={busy}
                      className="rounded bg-[#1b1b28] px-4 py-1.5 text-sm text-white"
                    >
                      {typing ? "Bỏ qua" : "Tiếp tục (Enter)"}
                    </button>
                    <button
                      onClick={() =>
                        speak(stripMarkup(node.en), {
                          lang: npc?.voice.lang,
                          rate,
                          pitch: npc?.voice.pitch,
                        })
                      }
                      aria-label="Nghe câu này"
                      className="rounded bg-white px-2 py-1"
                    >
                      🔊
                    </button>
                  </div>
                </div>
              )}

              {node?.type === "choice" && (
                <div>
                  {node.promptEn && (
                    <p className="text-lg">
                      <RichText text={node.promptEn} />
                    </p>
                  )}
                  {node.promptVi && translation !== "never" && (
                    <p className="text-sm text-[#5c5c7a]">{node.promptVi}</p>
                  )}
                  <div className="mt-3 grid gap-2">
                    {node.choices.map((c, i) => (
                      <button
                        key={c.id}
                        disabled={busy}
                        onClick={() => go(c.id)}
                        className="rounded-md border-2 border-[#c5cad6] bg-white px-3 py-2 text-left hover:border-[#2667cc]"
                      >
                        <span className="mr-2 text-xs text-[#5c5c7a]">{i + 1}</span>
                        <RichText text={c.en} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {node?.type === "quiz" && (
                <div>
                  {node.introEn && <p className="mb-2 font-semibold">{node.introEn}</p>}
                  <p className="mb-2 text-xs text-[#5c5c7a]">
                    Cần đúng {node.passAt}/{node.total} câu
                  </p>
                  <QuizHost
                    key={node.sessionId}
                    sessionId={node.sessionId}
                    onDone={() => void go()}
                  />
                </div>
              )}

              {node?.type === "end" && step?.done && (
                <div className="text-center" role="status">
                  <p className="text-2xl">🎉</p>
                  <p className="font-bold">Hoàn thành: {step.title.vi}</p>
                  {step.rewards && (
                    <p className="mt-1">
                      {step.rewards.xp > 0 ? `+${step.rewards.xp} XP` : "Đã nhận XP trước đó"}
                      {step.rewards.wordsLearned.length > 0 &&
                        ` · 📒 ${step.rewards.wordsLearned.length} từ mới vào sổ tay`}
                    </p>
                  )}
                  <button
                    onClick={onClose}
                    className="mt-3 rounded bg-[#1b1b28] px-4 py-1.5 text-sm text-white"
                  >
                    Đóng (Enter)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Panel>
  );
}
