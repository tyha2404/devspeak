"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { btn } from "@/components/app/ui";
import { QuizHost } from "@/components/learn/QuizHost";
import { api, ApiError } from "@/lib/client/api";
import type { ExamStart } from "@/lib/contracts/learn";
import { useMe } from "@/stores/meStore";

const REASONS = [
  { id: "job", label: "Làm việc trong team quốc tế", hint: "Standup, code review, họp, Slack" },
  {
    id: "interview",
    label: "Chuẩn bị phỏng vấn",
    hint: "Tự giới thiệu, câu hỏi hành vi, technical",
  },
  { id: "docs", label: "Đọc tài liệu kỹ thuật", hint: "Docs, RFC, Stack Overflow" },
  { id: "client", label: "Làm việc với khách hàng", hint: "Requirement, email, demo" },
  { id: "general", label: "Nói chung là muốn giỏi hơn", hint: "Học theo lộ trình từ đầu" },
] as const;

const GOALS = [
  { xp: 10, label: "Nhẹ nhàng", minutes: 5 },
  { xp: 20, label: "Đều đặn", minutes: 10 },
  { xp: 30, label: "Nghiêm túc", minutes: 15 },
  { xp: 50, label: "Tăng tốc", minutes: 25 },
] as const;

type Step = "reason" | "goal" | "level" | "placement" | "placed";

/** First run: why you're learning, how much per day, and where on the path to start. */
export function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("reason");
  const [reason, setReason] = useState<string>("job");
  const [goal, setGoal] = useState<number>(20);
  const [exam, setExam] = useState<ExamStart | null>(null);
  const [placed, setPlaced] = useState<{
    band: string;
    unit: { code: string; title: { vi: string } };
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void useMe
      .getState()
      .load()
      .then((h) => {
        if (h?.me.onboarded && h.me.placementDone) router.replace("/learn");
      });
  }, [router]);

  const save = async () => {
    await api.post("/api/onboarding", { dailyGoal: goal, reason });
  };

  const fromStart = async () => {
    setBusy(true);
    try {
      await save();
      await api.post("/api/placement/skip");
      await useMe.getState().load();
      router.replace("/learn");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Có lỗi, thử lại nhé");
      setBusy(false);
    }
  };
  const startPlacement = async () => {
    setBusy(true);
    try {
      await save();
      setExam(await api.post<ExamStart>("/api/placement/start"));
      setStep("placement");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Có lỗi, thử lại nhé");
    } finally {
      setBusy(false);
    }
  };
  const finishPlacement = async () => {
    try {
      setPlaced(await api.post("/api/placement/finish", { sessionId: exam!.sessionId }));
      await useMe.getState().load();
      setStep("placed");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không chấm được bài xếp lớp");
    }
  };

  const choice = (active: boolean) =>
    `w-full rounded-xl border-2 p-4 text-left ${active ? "border-amber bg-amber-soft" : "border-line bg-surface hover:bg-paper"}`;

  return (
    <main className="mx-auto max-w-xl px-4 py-10 sm:py-16">
      <p className="text-muted font-mono text-sm">dq init</p>
      {error && <p className="text-bad mt-4">{error}</p>}

      {step === "reason" && (
        <section>
          <h1 className="mt-2 text-[1.75rem] leading-tight font-bold">
            Bạn học tiếng Anh để làm gì?
          </h1>
          <p className="text-muted mt-2">
            Lộ trình vẫn đi từ A2 đến B2, nhưng mình sẽ gợi ý tình huống sát với mục tiêu của bạn.
          </p>
          <div className="mt-6 space-y-2">
            {REASONS.map((r) => (
              <button
                key={r.id}
                onClick={() => setReason(r.id)}
                aria-pressed={reason === r.id}
                className={choice(reason === r.id)}
              >
                <p className="font-semibold">{r.label}</p>
                <p className="text-muted text-sm">{r.hint}</p>
              </button>
            ))}
          </div>
          <button onClick={() => setStep("goal")} className={`${btn.primary} mt-6`}>
            Tiếp tục
          </button>
        </section>
      )}

      {step === "goal" && (
        <section>
          <h1 className="mt-2 text-[1.75rem] leading-tight font-bold">
            Mỗi ngày bạn dành bao lâu?
          </h1>
          <p className="text-muted mt-2">
            Đạt mục tiêu mỗi ngày để giữ streak. Bạn có thể đổi lại trong Hồ sơ.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-2">
            {GOALS.map((g) => (
              <button
                key={g.xp}
                onClick={() => setGoal(g.xp)}
                aria-pressed={goal === g.xp}
                className={choice(goal === g.xp)}
              >
                <p className="font-semibold">{g.label}</p>
                <p className="text-muted text-sm">
                  ~{g.minutes} phút · {g.xp} XP
                </p>
              </button>
            ))}
          </div>
          <div className="mt-6 flex gap-3">
            <button onClick={() => setStep("reason")} className={btn.secondary}>
              Quay lại
            </button>
            <button onClick={() => setStep("level")} className={btn.primary}>
              Tiếp tục
            </button>
          </div>
        </section>
      )}

      {step === "level" && (
        <section>
          <h1 className="mt-2 text-[1.75rem] leading-tight font-bold">Bắt đầu từ đâu?</h1>
          <p className="text-muted mt-2">
            Nếu đã đọc được tài liệu tiếng Anh và nói được vài câu, hãy làm bài xếp lớp 12 câu
            (khoảng 4 phút) để bỏ qua phần bạn đã biết.
          </p>
          <div className="mt-6 space-y-2">
            <button onClick={startPlacement} disabled={busy} className={choice(false)}>
              <p className="font-semibold">Làm bài xếp lớp</p>
              <p className="text-muted text-sm">
                12 câu từ A2 đến B2, không tính điểm, không giới hạn thời gian
              </p>
            </button>
            <button onClick={fromStart} disabled={busy} className={choice(false)}>
              <p className="font-semibold">Học từ đầu</p>
              <p className="text-muted text-sm">Bắt đầu ở Chặng 1 · Nền tảng</p>
            </button>
          </div>
        </section>
      )}

      {step === "placement" && exam && (
        <section>
          <h1 className="mt-2 mb-6 text-[1.5rem] font-bold">Bài xếp lớp</h1>
          <QuizHost sessionId={exam.sessionId} onDone={() => void finishPlacement()} />
        </section>
      )}

      {step === "placed" && placed && (
        <section>
          <h1 className="mt-2 text-[1.75rem] leading-tight font-bold">
            Bạn bắt đầu ở {placed.unit.code}
          </h1>
          <p className="text-muted mt-2">
            Trình độ ước tính: {placed.band}. Các unit trước đó được tính là đã xong; bạn vẫn có thể
            mở lại để ôn bất cứ lúc nào.
          </p>
          <p className="border-line bg-surface mt-4 rounded-xl border p-4 font-semibold">
            {placed.unit.title.vi}
          </p>
          <button onClick={() => router.replace("/learn")} className={`${btn.primary} mt-6`}>
            Vào học
          </button>
        </section>
      )}
    </main>
  );
}
