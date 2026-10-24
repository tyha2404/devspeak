"use client";

import { Check, Lock, Star, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { btn } from "@/components/app/ui";
import { LoadingState } from "@/components/app/LoadingState";
import { api } from "@/lib/client/api";
import type { GlossEntry } from "@/lib/contracts/learn";
import type { PathLesson, PathStage, PathUnit } from "@/lib/contracts/learn";

type StudyTrack = "grammar" | "vocab";

const COPY: Record<StudyTrack, { eyebrow: string; aside: string; empty: string }> = {
  grammar: {
    eyebrow: "Lộ trình ngữ pháp",
    aside: "Chọn chặng học",
    empty: "Bậc này đang được soạn.",
  },
  vocab: {
    eyebrow: "Lộ trình từ vựng",
    aside: "Chọn chủ đề",
    empty: "Chủ đề này đang được soạn.",
  },
};

const lessonsDone = (u: PathUnit) => u.lessons.filter((l) => l.state === "completed").length;
const open = (u: PathUnit) => u.state !== "locked" && u.state !== "coming_soon";

/** One study track: levels/topics on the side, the selected unit's numbered lessons in the main column. */
export function TrackClient({ track }: { track: StudyTrack }) {
  const [stage, setStage] = useState<PathStage | null | undefined>(undefined);
  const [unitId, setUnitId] = useState<number | null>(null);
  const [info, setInfo] = useState<PathLesson | null>(null);
  const copy = COPY[track];

  useEffect(() => {
    api
      .get<{ stages: PathStage[] }>("/api/path")
      .then((p) => {
        const s = p.stages.find((x) => x.track === track) ?? null;
        setStage(s);
        const current =
          s?.units.find((u) => u.state === "in_progress" || u.state === "available") ?? s?.units[0];
        setUnitId(current?.id ?? null);
      })
      .catch(() => setStage(null));
  }, [track]);

  if (stage === undefined) return <LoadingState />;
  if (!stage) return <p className="text-muted">Lộ trình này chưa có nội dung.</p>;
  const unit = stage.units.find((u) => u.id === unitId) ?? stage.units[0];

  const published = stage.units.filter((u) => u.state !== "coming_soon");
  const totalWords = published.reduce((n, u) => n + u.lessons.reduce((m, l) => m + l.words, 0), 0);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-muted flex items-center gap-2 text-sm font-semibold tracking-[0.14em] uppercase">
            <span aria-hidden className="bg-merged h-2 w-2 rounded-full" />
            {copy.eyebrow}
          </p>
          <h1 className="mt-2 text-[2.4rem] leading-none sm:text-[3rem]">
            {unit?.title.vi ?? stage.title.vi}
          </h1>
          {unit && <p className="text-muted mt-2 max-w-[60ch]">{unit.summary}</p>}
        </div>
        <div
          role="group"
          aria-label="Đổi lộ trình"
          className="border-line bg-surface flex rounded-xl border p-1"
        >
          {(["grammar", "vocab"] as const).map((t) => (
            <Link
              key={t}
              href={`/${t}`}
              aria-current={t === track ? "page" : undefined}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                t === track ? "bg-amber text-on-amber" : "text-ink hover:bg-paper"
              }`}
            >
              {t === "grammar" ? "Ngữ pháp" : "Từ vựng"}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-8 md:grid md:grid-cols-[17rem_1fr] md:items-start md:gap-6">
        <aside
          aria-label={copy.aside}
          className="border-line bg-surface overflow-hidden rounded-3xl border md:sticky md:top-24"
        >
          <div className="bg-amber text-on-amber px-5 py-5">
            <p className="text-xs font-semibold tracking-[0.14em] uppercase opacity-80">
              {track === "grammar" ? "Lộ trình CEFR" : "Thư viện chủ đề"}
            </p>
            <p className="font-display mt-1 text-[1.6rem] leading-tight">{copy.aside}</p>
            <p className="text-sm opacity-80">
              {track === "grammar"
                ? `${stage.units.length} bậc từ A1 đến C2`
                : `${stage.units.length} chủ đề · ${totalWords} mục từ đã mở`}
            </p>
          </div>
          <ul className="flex gap-2 overflow-x-auto p-3 md:max-h-[70vh] md:flex-col md:overflow-y-auto">
            {stage.units.map((u) => {
              const done = lessonsDone(u);
              const selected = u.id === unit?.id;
              return (
                <li key={u.id} className="shrink-0">
                  <button
                    onClick={() => setUnitId(u.id)}
                    disabled={!open(u)}
                    aria-pressed={selected}
                    className={`flex w-56 items-center gap-3 rounded-2xl border p-3 text-left md:w-full ${
                      selected
                        ? "border-merged bg-merged-soft"
                        : "border-line bg-surface hover:border-merged/60"
                    } disabled:opacity-55`}
                  >
                    <span
                      className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl font-mono text-sm font-bold ${
                        selected || u.state === "completed"
                          ? "bg-merged text-on-amber"
                          : "bg-paper text-ink"
                      }`}
                    >
                      {u.code}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{u.title.vi}</span>
                      <span className="text-muted block text-xs">
                        {u.state === "coming_soon"
                          ? "Sắp ra mắt"
                          : u.completedVia === "test_out"
                            ? `Đã vượt cấp · ${done}/${u.lessons.length} bài đã học`
                            : `${done}/${u.lessons.length} bài đã hoàn thành`}
                      </span>
                      <span className="bg-line mt-1.5 block h-1 overflow-hidden rounded-full">
                        <span
                          className="bg-merged block h-full"
                          style={{ width: `${(100 * done) / Math.max(1, u.lessons.length)}%` }}
                        />
                      </span>
                    </span>
                    {(u.state === "locked" || u.state === "coming_soon") && (
                      <span className="bg-paper text-muted rounded-md px-1.5 py-0.5 text-[0.65rem] font-bold uppercase">
                        Khoá
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {unit && (
          <section
            aria-label={unit.title.vi}
            className="border-line bg-surface mt-6 rounded-3xl border p-5 sm:p-8 md:mt-0"
          >
            <div className="flex flex-wrap items-center gap-4">
              <span className="bg-merged text-on-amber grid h-14 w-14 place-items-center rounded-2xl font-mono text-lg font-bold">
                {unit.code}
              </span>
              <div>
                <p className="font-display text-[1.4rem] leading-tight">{unit.title.en}</p>
                <p className="text-muted text-sm">
                  {track === "grammar"
                    ? `${unit.lessons.length} chủ điểm ngữ pháp trong chặng này`
                    : `${unit.lessons.length} bài học · ${unit.lessons.reduce((n, l) => n + l.words, 0)} mục từ`}
                </p>
              </div>
            </div>

            {track === "grammar" && open(unit) && unit.lessons.length > 0 && (
              <div className="bg-amber text-on-amber mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5">
                <div>
                  <p className="text-xs font-semibold tracking-[0.14em] uppercase opacity-80">
                    Bài kiểm tra vượt cấp · mốc đạt 80%
                  </p>
                  <h2 className="mt-1 text-[1.4rem]">Kiểm tra kiến thức {unit.code}</h2>
                  <p className="text-sm opacity-80">
                    Câu hỏi trộn từ mọi chủ điểm của bậc. Đạt 80% là mở toàn bộ bài của bậc này và
                    bậc kế tiếp.
                  </p>
                </div>
                <Link
                  href={`/test-out/${unit.id}`}
                  className="bg-surface text-ink rounded-xl px-4 py-2.5 font-semibold"
                >
                  {unit.completedVia === "test_out" ? "Làm lại bài →" : "Làm bài vượt cấp →"}
                </Link>
              </div>
            )}

            {track === "vocab" && unit.lessons.length > 0 && (
              <div className="mt-6">
                <TopicHeader unit={unit} />
              </div>
            )}
            {unit.lessons.length === 0 ? (
              <p className="text-muted mt-6">{copy.empty}</p>
            ) : (
              <ol className="mt-8">
                {unit.lessons.map((l, i) => (
                  <li key={l.id} className="relative">
                    {i > 0 && (
                      <span
                        aria-hidden
                        className="border-line absolute -top-6 left-1/2 h-6 border-l-2 border-dashed"
                      />
                    )}
                    <div
                      className={`mb-6 flex items-center gap-4 ${i % 2 ? "md:flex-row-reverse" : ""}`}
                    >
                      <button
                        onClick={() => setInfo(l)}
                        disabled={l.state === "locked"}
                        aria-label={`${String(i + 1).padStart(2, "0")} ${
                          l.state === "completed" ? "Xong" : l.state === "locked" ? "Khoá" : "Học"
                        }`}
                        className={`grid h-20 w-20 shrink-0 place-items-center rounded-full border-4 text-center ${
                          l.state === "completed"
                            ? "border-merged bg-merged-soft"
                            : l.state === "locked"
                              ? "border-line bg-paper text-muted"
                              : "border-amber bg-amber text-on-amber"
                        }`}
                      >
                        <span>
                          <span className="block font-mono text-xl font-bold">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className="flex items-center justify-center gap-0.5 text-[0.6rem] font-bold uppercase">
                            {l.state === "completed" ? (
                              <>
                                <Check size={10} aria-hidden /> Xong
                              </>
                            ) : l.state === "locked" ? (
                              <>
                                <Lock size={10} aria-hidden /> Khoá
                              </>
                            ) : (
                              "Học"
                            )}
                          </span>
                        </span>
                      </button>
                      <button
                        onClick={() => setInfo(l)}
                        disabled={l.state === "locked"}
                        className="border-line bg-surface hover:border-merged/60 flex min-w-0 flex-1 items-center gap-3 rounded-2xl border p-4 text-left disabled:opacity-55 md:max-w-[26rem]"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="text-bad block text-[0.7rem] font-bold tracking-wide uppercase">
                            {track === "grammar"
                              ? (l.group ?? "Ngữ pháp")
                              : `${l.words} mục từ · ${l.questionCount} câu`}
                          </span>
                          <span className="font-display block text-[1.2rem] leading-tight">
                            {track === "grammar"
                              ? l.title.en
                              : `Bài từ vựng ${String(i + 1).padStart(2, "0")}`}
                          </span>
                          <span className="text-muted block text-sm">
                            {l.state === "locked"
                              ? "Hoàn thành bài trước để mở"
                              : l.history
                                ? "Xem kết quả · Học lại →"
                                : "Xem thông tin bài học →"}
                          </span>
                        </span>
                        {l.state === "completed" && <Stars n={l.stars} />}
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}
      </div>

      <LessonInfo
        lesson={info}
        unit={unit}
        track={track}
        onClose={() => setInfo(null)}
        index={info && unit ? unit.lessons.findIndex((l) => l.id === info.id) + 1 : 0}
      />
    </div>
  );
}

function Stars({ n }: { n: number }) {
  return (
    <span className="flex shrink-0 gap-0.5" aria-label={`${n}/3 sao`}>
      {[1, 2, 3].map((k) => (
        <Star
          key={k}
          size={16}
          className={k <= n ? "fill-gold text-gold" : "text-line"}
          aria-hidden
        />
      ))}
    </span>
  );
}

/** "Topic 01 · 2 lessons · 20 words" with the full word list one click away. */
function TopicHeader({ unit }: { unit: PathUnit }) {
  const [words, setWords] = useState<GlossEntry[] | null>(null);
  const ref = useRef<HTMLDialogElement>(null);
  const open = async () => {
    ref.current?.showModal();
    if (!words)
      setWords(
        (await api.get<{ words: GlossEntry[] }>(`/api/tracks/words?unitId=${unit.id}`)).words,
      );
  };
  const count = unit.lessons.reduce((n, l) => n + l.questionCount, 0);
  return (
    <div className="border-line bg-surface mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-5">
      <div>
        <p className="text-muted text-xs font-semibold uppercase">Chủ đề {unit.code.slice(1)}</p>
        <p className="font-semibold">
          {unit.lessons.length} bài học · {count} câu kiểm tra
        </p>
        <p className="text-muted text-sm">
          Mỗi bài: học bằng thẻ lật, sau đó kiểm tra mức độ ghi nhớ.
        </p>
      </div>
      <button onClick={() => void open()} className={btn.secondary}>
        Xem toàn bộ thẻ →
      </button>
      <dialog
        ref={ref}
        aria-label={`Toàn bộ từ của chủ đề ${unit.title.vi}`}
        className="bg-surface text-ink backdrop:bg-ink/50 m-auto max-h-[85dvh] w-[min(40rem,calc(100vw-2rem))] rounded-2xl p-0 shadow-xl"
      >
        <div className="border-line bg-surface sticky top-0 flex items-center justify-between border-b px-5 py-3">
          <p className="font-semibold">
            {unit.title.vi}
            {words && <span className="text-muted"> · {words.length} mục từ</span>}
          </p>
          <button onClick={() => ref.current?.close()} aria-label="Đóng" className={btn.ghost}>
            <X size={18} aria-hidden />
          </button>
        </div>
        {!words ? (
          <div className="p-5">
            <LoadingState compact />
          </div>
        ) : (
          <ol className="divide-line divide-y">
            {words.map((w, i) => (
              <li key={w.slug} className="flex gap-3 px-5 py-3">
                <span className="text-muted w-6 shrink-0 font-mono text-sm">{i + 1}</span>
                <span className="min-w-0">
                  <span className="block font-semibold">
                    {w.lemma}{" "}
                    <span className="text-muted text-sm font-normal">
                      {w.ipa ? `${w.ipa} · ` : ""}
                      {w.pos}
                    </span>
                  </span>
                  <span className="block">{w.vi}</span>
                  {w.example && (
                    <span className="text-muted block text-sm italic">{w.example.en}</span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        )}
      </dialog>
    </div>
  );
}

const starLabel = (n: number) =>
  n === 3 ? "100%" : n === 2 ? "90–99%" : n === 1 ? "80–89%" : "Chưa có sao";

/** The two phases of a lesson, its latest result, and the way in. */
function LessonInfo({
  lesson,
  unit,
  index,
  track,
  onClose,
}: {
  lesson: PathLesson | null;
  unit: PathUnit | undefined;
  index: number;
  track: StudyTrack;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (lesson && !d.open) d.showModal();
    if (!lesson && d.open) d.close();
  }, [lesson]);
  const h = lesson?.history;

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="lesson-info-title"
      className="bg-surface text-ink backdrop:bg-ink/50 m-auto w-[min(36rem,calc(100vw-2rem))] rounded-2xl p-0 shadow-xl"
    >
      {lesson && unit && (
        <div className="p-6">
          <div className="flex items-start gap-4">
            <span className="bg-ink text-paper grid h-12 w-12 shrink-0 place-items-center rounded-xl font-mono font-bold">
              {String(index).padStart(2, "0")}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-muted text-xs font-semibold uppercase">
                {unit.code} · {track === "grammar" ? "Ngữ pháp" : "Từ vựng"}
              </p>
              <h2 id="lesson-info-title" className="text-[1.35rem] leading-tight font-bold">
                {lesson.title.en}
              </h2>
              <p className="text-muted text-sm">{lesson.title.vi}</p>
            </div>
            <button onClick={onClose} aria-label="Đóng thông tin bài học" className={btn.ghost}>
              <X size={18} aria-hidden />
            </button>
          </div>

          <ol className="mt-5 grid gap-3 sm:grid-cols-2">
            <li className="border-ink/60 rounded-xl border p-3">
              <p className="text-muted text-xs">Giai đoạn 1</p>
              <p className="font-semibold">Phần học</p>
              <p className="text-muted text-sm">
                {track === "grammar" ? "5 phần kiến thức" : "Thẻ lật, tự đánh giá mức nhớ"}
              </p>
            </li>
            <li className="border-line bg-paper rounded-xl border p-3">
              <p className="text-muted text-xs">Giai đoạn 2</p>
              <p className="font-semibold">Bài kiểm tra</p>
              <p className="text-muted text-sm">{lesson.questionCount} câu · cần 80% · +35–80 XP</p>
            </li>
          </ol>

          <div className="border-line mt-5 border-t pt-4">
            {h ? (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase">Kết quả gần nhất</p>
                  <p className="bg-paper rounded-full px-2.5 py-0.5 text-xs font-semibold">
                    {new Date(h.lastAt).toLocaleDateString("vi-VN")}
                  </p>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    [`${h.lastPct ?? 0}%`, "Điểm gần nhất"],
                    [h.lastTotal ? `${h.lastCorrect}/${h.lastTotal}` : "—", "Số câu đúng"],
                    [String(h.attempts), "Số lần làm"],
                    [`${h.bestPct}%`, "Điểm cao nhất"],
                  ].map(([v, k]) => (
                    <div key={k} className="border-line rounded-xl border p-3">
                      <dd className="text-xl font-bold">{v}</dd>
                      <dt className="text-muted text-xs">{k}</dt>
                    </div>
                  ))}
                </dl>
                <p className="bg-paper mt-2 flex items-center justify-between rounded-xl px-4 py-3 text-sm">
                  Đánh giá cao nhất
                  {lesson.stars > 0 ? (
                    <span className="flex items-center gap-2">
                      <Stars n={lesson.stars} />
                      <span className="text-muted">{starLabel(lesson.stars)}</span>
                    </span>
                  ) : (
                    <strong className="text-gold">Chưa có sao</strong>
                  )}
                </p>
              </>
            ) : (
              <p className="text-sm">
                <strong>Chưa làm bài.</strong>{" "}
                <span className="text-muted">
                  Bắt đầu phần học, sau đó hoàn thành bài kiểm tra để lưu điểm.
                </span>
              </p>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button onClick={onClose} className={btn.secondary}>
              Đóng
            </button>
            <Link href={`/lesson/${lesson.id}`} className={btn.primary}>
              {h ? "Học lại từ đầu →" : "Bắt đầu học →"}
            </Link>
          </div>
        </div>
      )}
    </dialog>
  );
}
