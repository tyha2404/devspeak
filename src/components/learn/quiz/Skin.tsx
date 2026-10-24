import type { ReactNode } from "react";

const SKINS: Record<string, { title: string; frame: string; bar: string }> = {
  flashcard: { title: "Vocab check", frame: "bg-surface text-ink", bar: "bg-amber text-ink" },
  slack: { title: "# team-dev", frame: "bg-surface text-ink", bar: "bg-[#4a154b] text-white" },
  jira: { title: "DQ-142 · Bug", frame: "bg-surface text-ink", bar: "bg-[#0052cc] text-white" },
  vscode: {
    title: "app.ts — VS Code",
    frame: "bg-[#1e1e1e] text-[#d4d4d4]",
    bar: "bg-[#323233] text-[#cccccc]",
  },
  email: { title: "New message", frame: "bg-surface text-ink", bar: "bg-[#c5221f] text-white" },
  terminal: {
    title: "git rebase -i",
    frame: "bg-[#0c0c0c] text-[#cccccc] font-mono",
    bar: "bg-[#2d2d2d] text-[#cccccc]",
  },
  gitlog: {
    title: "git log --oneline",
    frame: "bg-[#0c0c0c] text-[#cccccc] font-mono",
    bar: "bg-[#2d2d2d] text-[#cccccc]",
  },
  pr: {
    title: "Pull request #42 · Conversation",
    frame: "bg-surface text-ink",
    bar: "bg-[#24292f] text-white",
  },
  zoom: { title: "Zoom meeting", frame: "bg-[#1a1a1a] text-white", bar: "bg-merged text-white" },
};

/** Fake dev-tool window chrome around a mini-game. */
export function Skin({ skin, children }: { skin: string; children: ReactNode }) {
  const s = SKINS[skin] ?? SKINS.flashcard!;
  return (
    <div className={`border-line overflow-hidden rounded-md border ${s.frame}`}>
      <div className={`flex items-center gap-2 px-3 py-1 text-xs font-semibold ${s.bar}`}>
        <span className="flex gap-1" aria-hidden>
          <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
          <span className="h-2 w-2 rounded-full bg-[#febc2e]" />
          <span className="h-2 w-2 rounded-full bg-[#28c840]" />
        </span>
        {s.title}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export type OptionState = "idle" | "selected" | "correct" | "wrong";

export function OptionButton({
  label,
  index,
  state,
  disabled,
  onClick,
}: {
  label: string;
  index?: number;
  state: OptionState;
  disabled?: boolean;
  onClick: () => void;
}) {
  const style = {
    idle: "border-line bg-surface text-ink hover:border-amber",
    selected: "border-amber bg-amber-soft text-ink",
    correct: "border-ok bg-ok-soft text-ink",
    wrong: "border-bad bg-bad-soft text-ink",
  }[state];
  const icon = state === "correct" ? "✓ " : state === "wrong" ? "✗ " : "";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`w-full rounded-md border-2 px-3 py-2 text-left text-base transition-colors disabled:cursor-default ${style}`}
    >
      {index !== undefined && <span className="text-muted mr-2 text-xs">{index + 1}</span>}
      {icon}
      {label}
    </button>
  );
}
