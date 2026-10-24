import { Check, Lock, Star } from "lucide-react";
import Link from "next/link";
import type { PathStage, PathUnit } from "@/lib/contracts/learn";

/**
 * The learning path drawn like `git log --graph`: every unit is a commit on one branch, every stage
 * ends in a release tag (its checkpoint). Situation units are round commits, knowledge units square.
 */
export function PathGraph({
  stages,
  currentUnitId,
}: {
  stages: PathStage[];
  currentUnitId?: number | null;
}) {
  return (
    <ol className="relative">
      {stages.map((s, si) => (
        <li key={s.id}>
          <StageHeader stage={s} index={si + 1} />
          <ol>
            {s.units.map((u) => (
              <UnitCommit key={u.id} unit={u} current={u.id === currentUnitId} />
            ))}
            <CheckpointTag stage={s} index={si + 1} />
          </ol>
        </li>
      ))}
    </ol>
  );
}

function Rail({ dashed = false }: { dashed?: boolean }) {
  return (
    <span
      aria-hidden
      className={`absolute top-0 bottom-0 left-[15px] w-0.5 ${dashed ? "border-line border-l-2 border-dashed" : "bg-line"}`}
    />
  );
}

function StageHeader({ stage, index }: { stage: PathStage; index: number }) {
  const pct = stage.progress.total
    ? Math.round((stage.progress.done / stage.progress.total) * 100)
    : 0;
  return (
    <div className="relative pt-2 pb-4 pl-11">
      {index > 1 && <Rail />}
      <span
        aria-hidden
        className="bg-ink absolute top-3 left-[9px] h-3.5 w-3.5 rotate-45 rounded-[3px]"
      />
      <h2 className="text-xl font-bold">
        Chặng {index} · {stage.title.vi}
      </h2>
      <p className="text-muted">
        {stage.cefr} · {stage.tagline}
      </p>
      {stage.progress.total > 0 && (
        <p className="text-muted mt-1 text-sm">
          {stage.progress.done}/{stage.progress.total} unit xong · {pct}%
        </p>
      )}
    </div>
  );
}

function Node({ unit, current }: { unit: PathUnit; current: boolean }) {
  const shape = unit.kind === "knowledge" ? "rounded-[6px]" : "rounded-full";
  const base = `absolute top-4 left-[6px] grid h-[20px] w-[20px] place-items-center ${shape}`;
  if (unit.state === "completed")
    return (
      <span className={`${base} bg-merged text-white`} aria-hidden>
        <Check size={13} strokeWidth={3} />
      </span>
    );
  if (unit.state === "coming_soon")
    return <span className={`${base} border-line bg-paper border-2 border-dashed`} aria-hidden />;
  if (unit.state === "locked")
    return <span className={`${base} border-line bg-surface border-2`} aria-hidden />;
  return (
    <span
      className={`${base} border-amber bg-surface border-[3px] ${current ? "dq-pulse" : ""}`}
      aria-hidden
    />
  );
}

const STATE_VI: Record<PathUnit["state"], string> = {
  completed: "Đã xong",
  in_progress: "Đang học",
  available: "Mở",
  locked: "Chưa mở",
  coming_soon: "Sắp ra mắt",
};

function UnitCommit({ unit, current }: { unit: PathUnit; current: boolean }) {
  const open = unit.state !== "locked" && unit.state !== "coming_soon";
  const done = unit.lessons.filter((l) => l.state === "completed").length;
  const body = (
    <div
      className={`rounded-xl px-4 py-3 ${
        current ? "border-amber/60 bg-surface border shadow-sm" : open ? "hover:bg-surface" : ""
      }`}
    >
      <div className="flex items-baseline gap-3">
        <span className="text-muted font-mono text-sm">{unit.code}</span>
        <span className={`font-semibold ${open || unit.state === "completed" ? "" : "text-muted"}`}>
          {unit.title.vi}
        </span>
        {unit.state === "locked" && <Lock size={14} className="text-muted" aria-label="Chưa mở" />}
      </div>
      {unit.state !== "coming_soon" && (
        <p className="text-muted mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span>
            {done}/{unit.lessons.length} bài · ~{unit.minutes} phút
          </span>
          {unit.stars > 0 && (
            <span className="inline-flex items-center gap-1">
              <Star size={13} className="fill-gold text-gold" aria-hidden />
              {unit.stars}/{unit.maxStars}
            </span>
          )}
          {unit.completedVia === "test_out" && <span>Đã kiểm tra vượt</span>}
          {unit.completedVia === "placement" && <span>Bỏ qua theo bài xếp lớp</span>}
        </p>
      )}
      {unit.state === "coming_soon" && <p className="text-muted mt-1 text-sm">Sắp ra mắt</p>}
      <span className="sr-only">{STATE_VI[unit.state]}</span>
    </div>
  );
  return (
    <li className="relative pl-9">
      <Rail dashed={unit.state === "coming_soon"} />
      <Node unit={unit} current={current} />
      {open ? (
        <Link href={`/career/path/${unit.slug}`} className="block rounded-xl">
          {body}
        </Link>
      ) : (
        body
      )}
    </li>
  );
}

function CheckpointTag({ stage, index }: { stage: PathStage; index: number }) {
  const cp = stage.checkpoint;
  const label = `v${index}.0`;
  return (
    <li className="relative pb-8 pl-9">
      <Rail />
      <span
        aria-hidden
        className={`absolute top-3.5 left-[4px] h-6 w-6 rotate-45 rounded-[4px] border-2 ${
          cp.state === "passed"
            ? "border-merged bg-merged"
            : cp.state === "available"
              ? "border-amber bg-surface"
              : "border-line bg-paper"
        }`}
      />
      <div className="px-4 py-3">
        <p className="font-semibold">
          <span className="bg-ink text-paper mr-2 rounded px-1.5 py-0.5 font-mono text-xs">
            {label}
          </span>
          Checkpoint chặng {index}
        </p>
        <p className="text-muted mt-1 text-sm">
          {cp.state === "passed" && cp.certificateId ? (
            <Link href={`/certificate/${cp.certificateId}`} className="text-merged underline">
              Xem chứng nhận
            </Link>
          ) : cp.state === "available" ? (
            <Link href={`/exam/checkpoint/${stage.id}`} className="text-ink font-medium underline">
              Làm bài checkpoint ({cp.size} câu, cần {cp.passPct}%)
            </Link>
          ) : cp.state === "coming_soon" ? (
            "Mở khi chặng này đủ nội dung"
          ) : (
            "Hoàn thành mọi unit để mở bài checkpoint và nhận chứng nhận"
          )}
        </p>
      </div>
    </li>
  );
}
