"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/app/Avatar";
import { btn } from "@/components/app/ui";
import { ChatPanel } from "@/components/learn/ChatPanel";
import { QuizHost } from "@/components/learn/QuizHost";
import { api, ApiError } from "@/lib/client/api";
import { character } from "@/lib/characters";
import type { PathStage, PathUnit } from "@/lib/contracts/learn";
import { createClient } from "@/lib/supabase/browser";

interface Situation {
  slug: string;
  category: string;
  cefr: string;
  title_vi: string;
  title_en: string;
  context_vi: string;
  phrases: { en: string; vi: string; register: string }[];
}

/** Free practice: a quick mixed quiz over opened units, AI role-play, and the situation library. */
export function PracticeClient() {
  const [units, setUnits] = useState<PathUnit[]>([]);
  const [quiz, setQuiz] = useState<{ sessionId: string } | null>(null);
  const [quizDone, setQuizDone] = useState<{ correct: number; total: number } | null>(null);
  const [chat, setChat] = useState<{ available: boolean; npcs: string[] } | null>(null);
  const [talkTo, setTalkTo] = useState<string | null>(null);
  const [situations, setSituations] = useState<Situation[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ stages: PathStage[] }>("/api/path")
      .then((p) =>
        setUnits(
          p.stages
            .flatMap((s) => s.units)
            .filter((u) => u.state === "completed" || u.state === "in_progress"),
        ),
      );
    api
      .get<{ available: boolean; npcs: string[] }>("/api/npc/chat/status")
      .then(setChat)
      .catch(() => {});
    void createClient()
      .from("situations")
      .select("slug, category, cefr, title_vi, title_en, context_vi, phrases")
      .order("sort")
      .then(({ data }) => setSituations((data ?? []) as Situation[]));
  }, []);

  const startQuiz = async () => {
    setError(null);
    setQuizDone(null);
    try {
      setQuiz(await api.post<{ sessionId: string }>("/api/quiz/sessions", { size: 8 }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không tạo được bài luyện tập");
    }
  };

  const partners = [...new Set(units.map((u) => u.character))].filter((c) =>
    chat?.npcs.includes(c),
  );

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-[1.75rem] font-bold">Tình huống</h1>
        <p className="text-muted mt-1 max-w-[60ch]">
          Luyện thêm ngoài lộ trình: ôn nhanh những gì đã học, hoặc trò chuyện tự do với đồng
          nghiệp.
        </p>
      </header>

      <section aria-labelledby="quick">
        <h2 id="quick" className="text-xl font-bold">
          Luyện nhanh 8 câu
        </h2>
        <p className="text-muted mt-1">
          Câu hỏi trộn từ các unit bạn đã mở, ưu tiên câu lâu chưa làm đúng. Mỗi câu đúng +5 XP.
        </p>
        {error && <p className="text-bad mt-2">{error}</p>}
        {quiz && !quizDone ? (
          <div className="mt-4">
            <QuizHost
              sessionId={quiz.sessionId}
              onDone={(s) => setQuizDone({ correct: s.correct, total: s.total })}
            />
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-4">
            <button onClick={startQuiz} disabled={!units.length} className={btn.primary}>
              {quizDone ? "Luyện tiếp" : "Bắt đầu"}
            </button>
            {quizDone && (
              <span className="text-muted">
                Vừa rồi: đúng {quizDone.correct}/{quizDone.total}
              </span>
            )}
            {!units.length && (
              <span className="text-muted text-sm">Học ít nhất một bài để mở phần này.</span>
            )}
          </div>
        )}
      </section>

      <section aria-labelledby="roleplay">
        <h2 id="roleplay" className="text-xl font-bold">
          Trò chuyện với đồng nghiệp (AI)
        </h2>
        <p className="text-muted mt-1">
          Hội thoại tự do 6 lượt theo tình huống của unit; cuối buổi có tổng kết lỗi cần sửa.
        </p>
        {chat && !chat.available && (
          <p className="text-muted mt-3">
            Tính năng trò chuyện AI đang tạm nghỉ. Quay lại sau nhé.
          </p>
        )}
        {talkTo ? (
          <div className="border-line bg-surface mt-4 rounded-2xl border p-4">
            <ChatPanel
              npcId={talkTo}
              npcName={character(talkTo).name.split(" ")[0]!}
              onExit={() => setTalkTo(null)}
            />
          </div>
        ) : (
          chat?.available && (
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {partners.map((id) => {
                const c = character(id);
                return (
                  <li key={id}>
                    <button
                      onClick={() => setTalkTo(id)}
                      className="border-line bg-surface hover:border-amber flex w-full items-center gap-3 rounded-xl border p-3 text-left"
                    >
                      <Avatar id={id} size={36} />
                      <span>
                        <span className="block font-semibold">{c.name}</span>
                        <span className="text-muted text-sm">{c.role.vi}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
              {!partners.length && (
                <li className="text-muted text-sm">
                  Mở thêm unit để trò chuyện với các đồng nghiệp.
                </li>
              )}
            </ul>
          )
        )}
      </section>

      <section aria-labelledby="library">
        <h2 id="library" className="text-xl font-bold">
          Thư viện tình huống
        </h2>
        {situations.length ? (
          <ul className="mt-4 space-y-3">
            {situations.map((s) => (
              <li key={s.slug}>
                <details className="border-line bg-surface rounded-xl border p-4">
                  <summary className="cursor-pointer font-semibold">
                    {s.title_vi} <span className="text-muted font-normal">· {s.cefr}</span>
                  </summary>
                  <p className="text-muted mt-2">{s.context_vi}</p>
                  <ul className="mt-3 space-y-2">
                    {s.phrases.map((p) => (
                      <li key={p.en}>
                        <p className="font-medium">{p.en}</p>
                        <p className="text-muted text-sm">{p.vi}</p>
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted mt-2">
            Khoảng 60 tình huống hay gặp (xin quyền truy cập, báo trễ deadline, xin review gấp…)
            đang được soạn và sẽ xuất hiện ở đây.
          </p>
        )}
      </section>
    </div>
  );
}
