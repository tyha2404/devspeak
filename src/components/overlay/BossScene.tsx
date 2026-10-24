"use client";

import { CHARACTER_IDS } from "@/game/data/characters";

const SCALE = 4;
const SHEET_COLS = 9;

/** An NPC's front-facing sprite, cut from the generated character sheet. */
export function Portrait({ id, size = 16 * SCALE }: { id: string; size?: number }) {
  const row = CHARACTER_IDS.indexOf(id as (typeof CHARACTER_IDS)[number]);
  const scale = size / 16;
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 [image-rendering:pixelated]"
      style={{
        width: size,
        height: size,
        backgroundImage: "url(/assets/sprites/characters.png)",
        backgroundSize: `${SHEET_COLS * 16 * scale}px auto`,
        backgroundPosition: `0 -${Math.max(0, row) * 16 * scale}px`,
      }}
    />
  );
}

interface Progress {
  correct: number;
  wrong: number;
  total: number;
}

const Meter = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className="text-xs">
    {label}
    <div className="h-2 rounded bg-black/20">
      <div
        className={`h-2 rounded transition-all duration-500 ${color}`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  </div>
);

/** Interview with Robert (Intern → Junior). */
function Interview({ correct, wrong, total }: Progress) {
  return (
    <div className="flex items-center gap-4 rounded-lg bg-[#3d405b] p-3 text-white">
      <Portrait id="robert" />
      <div className="grid flex-1 grid-cols-2 gap-3">
        <Meter label="Robert's doubt" value={100 - (correct / total) * 100} color="bg-[#e63946]" />
        <div className="text-xs">
          Confidence
          <div className="flex gap-1">
            {Array.from({ length: 5 }, (_, i) => (
              <span
                key={i}
                className={`h-2 flex-1 rounded ${i < 5 - Math.min(5, wrong) ? "bg-[#52b788]" : "bg-black/20"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Architecture review with Raj (Junior → Mid): each right answer completes part of the diagram. */
function ArchitectureReview({ correct, total }: Progress) {
  const boxes = ["Client", "API", "Cache", "Queue", "Worker", "DB", "Search", "Metrics"].slice(
    0,
    total,
  );
  return (
    <div className="rounded-lg border-2 border-[#c5cad6] bg-[#eef1f4] p-3 text-[#1b1b28]">
      <div className="mb-2 flex items-center gap-3">
        <Portrait id="raj" size={48} />
        <div className="flex-1">
          <p className="text-xs font-bold">Whiteboard · system design</p>
          <Meter label="Raj's approval" value={(correct / total) * 100} color="bg-[#3a86ff]" />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1 text-xs">
        {boxes.map((b, i) => (
          <span key={b} className="flex items-center gap-1">
            <span
              className={`rounded border-2 px-2 py-0.5 font-mono transition-colors ${i < correct ? "border-[#3a86ff] bg-white" : "border-dashed border-[#c5cad6] text-[#9aa0ad]"}`}
            >
              {b}
            </span>
            {i < boxes.length - 1 && <span className="text-[#9aa0ad]">→</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Client demo for Mike (Mid → Senior): his mood follows your answers. */
function ClientDemo({ correct, wrong, total }: Progress) {
  const score = (correct - wrong * 0.5) / total;
  const mood = score >= 0.7 ? "🤩" : score >= 0.4 ? "🙂" : score >= 0.1 ? "😐" : "😟";
  return (
    <div className="rounded-lg bg-[#1d3557] p-3 text-white">
      <div className="flex items-center gap-3">
        <Portrait id="mike" size={48} />
        <div className="flex-1">
          <p className="text-xs font-bold">Live demo · client office</p>
          <Meter label="Client satisfaction" value={50 + score * 50} color="bg-[#ffd166]" />
        </div>
        <span className="text-3xl" aria-label="Mike's mood">
          {mood}
        </span>
      </div>
      <div className="mt-2 flex gap-1">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded ${i < correct + wrong ? (i < correct ? "bg-[#52b788]" : "bg-[#e63946]") : "bg-white/20"}`}
          />
        ))}
      </div>
    </div>
  );
}

/** Tech talk on the main stage (Senior → Tech Lead): the audience reacts. */
function TechTalk({ correct, wrong, total }: Progress) {
  const audience = ["attendee-a", "attendee-b", "robert", "mike", "raj", "kenji", "emma", "sarah"];
  return (
    <div className="rounded-lg bg-[#1b1b28] p-3 text-white">
      <p className="mb-2 text-center text-xs font-bold">🎤 Main stage · DevQuest Conf</p>
      <div className="flex justify-center gap-1">
        {audience.map((id, i) => (
          <span key={id} className="relative">
            <Portrait id={id} size={32} />
            {i < correct && (
              <span className="absolute -top-3 left-1 animate-bounce text-sm">👏</span>
            )}
          </span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <Meter label="Applause" value={(correct / total) * 100} color="bg-[#52b788]" />
        <Meter label="Time used" value={((correct + wrong) / total) * 100} color="bg-[#f2a65a]" />
      </div>
    </div>
  );
}

const SCENES = {
  intern: Interview,
  junior: ArchitectureReview,
  mid: ClientDemo,
  senior: TechTalk,
} as const;

export function BossScene({ fromRank, ...p }: Progress & { fromRank: string }) {
  const Scene = SCENES[fromRank as keyof typeof SCENES] ?? Interview;
  return <Scene {...p} />;
}
