"use client";

import { Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import { btn } from "@/components/app/ui";
import { TestIntro } from "@/components/learn/TrackParts";
import { speak } from "@/lib/client/tts";
import type { GrammarBody } from "@/lib/contracts/learn";
import { useSettings } from "@/stores/settingsStore";

const PAGES = [
  { eyebrow: "Tổng quan", title: (g: GrammarBody) => `${g.group} · trọng tâm và cấu trúc` },
  { eyebrow: "Chức năng", title: () => "Chức năng và ví dụ" },
  { eyebrow: "Cấu trúc", title: () => "Cấu trúc câu" },
  { eyebrow: "Ví dụ", title: () => "Ví dụ và giảng giải" },
  { eyebrow: "Đối chiếu", title: () => "Đối chiếu và tự sửa" },
] as const;

function Say({ text }: { text: string }) {
  const rate = useSettings((s) => s.ttsRate);
  return (
    <button
      onClick={() => speak(text, { rate })}
      aria-label={`Nghe: ${text}`}
      className="text-muted hover:text-ink shrink-0"
    >
      <Volume2 size={16} aria-hidden />
    </button>
  );
}

/** Five study screens for one grammar point, then hands over to the lesson's test. */
export function GrammarStudy({
  grammar: g,
  cefr,
  questionCount,
  passPct,
  onDone,
}: {
  grammar: GrammarBody;
  cefr: string;
  questionCount: number;
  passPct: number;
  onDone: () => void;
}) {
  const [page, setPage] = useState(0);
  const last = PAGES.length; // the test intro
  const go = (n: number) => {
    setPage(n);
    window.scrollTo({ top: 0 });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || e.key !== "Enter") return;
      e.preventDefault();
      if (page < last) go(page + 1);
      else onDone();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [page, last, onDone]);

  return (
    <div>
      <div key={page} className="dq-enter">
        {page < last && (
          <header className="border-line mb-6 flex items-end justify-between gap-4 border-b pb-4">
            <div className="min-w-0 flex-1">
              <p className="text-muted text-xs font-semibold tracking-wide uppercase">
                {page + 1}/{PAGES.length} · {PAGES[page]!.eyebrow}
              </p>
              <h2 className="mt-1 text-[1.4rem] leading-tight font-bold">
                {PAGES[page]!.title(g)}
              </h2>
            </div>
            <span className="bg-ink text-paper shrink-0 rounded-lg px-2.5 py-1 font-mono text-sm font-bold whitespace-nowrap">
              {cefr}
            </span>
          </header>
        )}

        {page === 0 && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[3fr_2fr]">
              <article className="border-line bg-surface rounded-2xl border p-4 sm:p-5">
                <p className="text-muted text-sm font-semibold">Trọng tâm</p>
                <p className="mt-2 leading-relaxed">{g.overview.focus}</p>
              </article>
              <article className="border-amber/40 bg-amber-soft rounded-2xl border p-4 sm:p-5">
                <p className="text-muted text-sm font-semibold">Cấu trúc chính</p>
                <ul className="mt-2 space-y-1 font-mono font-semibold">
                  {g.overview.formulas.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </article>
            </div>
            <article className="bg-ink text-paper flex flex-col items-start gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
              <p className="text-sm opacity-80">Ví dụ mở đầu</p>
              <p className="w-full min-w-0 flex-1 text-[1.6rem] leading-tight font-bold sm:w-auto">
                {g.overview.hook}
              </p>
            </article>
            <ul className="grid gap-2 sm:grid-cols-2">
              {g.functions.map((f, i) => (
                <li key={f.title} className="flex items-center gap-3">
                  <span className="bg-paper border-line grid h-7 w-7 place-items-center rounded-md border font-mono text-xs">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-sm font-medium">{f.title}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {page === 1 && (
          <div className="space-y-3">
            {g.functions.map((f, i) => (
              <article
                key={f.title}
                className="border-line bg-surface rounded-2xl border p-4 sm:p-5"
              >
                <p className="text-muted font-mono text-xs">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-muted mt-1">{f.explain}</p>
                <ul className="mt-3 space-y-1">
                  {f.examples.map((e) => (
                    <li key={e} className="flex items-center gap-2 italic">
                      {e} <Say text={e} />
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}

        {page === 2 && (
          <div className="space-y-4 sm:space-y-6">
            <section>
              <h3 className="font-semibold">Các dạng thường gặp</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {g.structure.forms.map((f) => (
                  <article key={f.label} className="border-line bg-surface rounded-xl border p-4">
                    <p className="text-muted text-sm">{f.label}</p>
                    <p className="mt-1 font-mono font-semibold">{f.pattern}</p>
                    <p className="mt-2 flex items-center gap-2 italic">
                      {f.example} <Say text={f.example} />
                    </p>
                  </article>
                ))}
              </div>
            </section>
            <section>
              <h3 className="font-semibold">Cách phân tích</h3>
              <ol className="mt-3 space-y-3">
                {g.structure.steps.map((s, i) => (
                  <li key={s.title} className="flex gap-3">
                    <span className="bg-amber-soft grid h-8 w-8 shrink-0 place-items-center rounded-lg font-mono text-sm font-bold">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <p className="font-semibold">{s.title}</p>
                      <p className="text-muted">{s.explain}</p>
                      <p className="mt-1 font-mono text-sm">{s.example}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        )}

        {page === 3 && (
          <div className="space-y-3">
            <p className="text-muted text-sm">
              Đọc mỗi ví dụ theo ba lớp: nghĩa, cấu trúc, ngữ cảnh.
            </p>
            {g.examples.map((e, i) => (
              <article key={e.en} className="border-line bg-surface rounded-2xl border p-4 sm:p-5">
                <p className="text-muted text-xs font-semibold">
                  {String(i + 1).padStart(2, "0")} · {e.tag}
                </p>
                <h3 className="mt-1 flex items-start gap-2 text-lg font-semibold">
                  {e.en} <Say text={e.en} />
                </h3>
                <p className="text-muted">{e.vi}</p>
                <p className="border-merged mt-2 border-l-4 pl-3 text-sm">{e.note}</p>
              </article>
            ))}
          </div>
        )}

        {page === 4 && (
          <div className="space-y-4 sm:space-y-6">
            <section>
              <h3 className="font-semibold">{g.contrast.title}</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {g.contrast.rows.map((r) => (
                  <article key={r.label} className="border-line bg-surface rounded-xl border p-4">
                    <p className="font-semibold">{r.label}</p>
                    <p className="text-muted text-sm">{r.note}</p>
                    <p className="mt-1 italic">{r.example}</p>
                  </article>
                ))}
              </div>
            </section>
            <section>
              <h3 className="font-semibold">Tự sửa</h3>
              <ul className="mt-3 space-y-3">
                {g.contrast.fixes.map((f) => (
                  <li key={f.wrong} className="border-line bg-surface rounded-xl border p-4">
                    <p>
                      <span className="text-bad text-sm font-semibold">Chưa đúng </span>
                      <del className="text-muted">{f.wrong}</del>
                    </p>
                    <p>
                      <span className="text-ok text-sm font-semibold">Đã sửa </span>
                      <strong>{f.right}</strong>
                    </p>
                    <p className="text-muted mt-1 text-sm">{f.why}</p>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}

        {page === last && (
          <TestIntro
            eyebrow="Phần học đã hoàn thành"
            title="Bài kiểm tra ngữ pháp"
            text={`Bài kiểm tra gồm ${questionCount} câu về nội dung vừa học. Câu trả lời chưa đúng được lưu để ôn lại.`}
            total={questionCount}
            passPct={passPct}
          />
        )}
      </div>
      <nav
        aria-label="Điều hướng phần học"
        className="mt-5 flex items-center justify-between sm:mt-8"
      >
        {page > 0 ? (
          <button onClick={() => go(page - 1)} className={btn.ghost}>
            ← {page === last ? "Xem lại phần học" : "Quay lại"}
          </button>
        ) : (
          <span />
        )}
        {page < last ? (
          <button onClick={() => go(page + 1)} className={btn.primary}>
            Tiếp tục →
          </button>
        ) : (
          <button onClick={onDone} className={btn.primary}>
            Làm bài kiểm tra →
          </button>
        )}
      </nav>
    </div>
  );
}
