import type { ReactNode } from "react";

/** Shared window chrome (title bar + scrolling body) for overlays opened from the world. */
export function Panel({
  title,
  onClose,
  children,
  label,
  placement = "full",
}: {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** Accessible name when `title` is not plain text. */
  label?: string;
  /** "full": tall centred window; "bottom": compact sheet above the bottom edge. */
  placement?: "full" | "bottom";
}) {
  const box =
    placement === "full"
      ? "inset-x-2 top-16 bottom-2 sm:top-20 sm:bottom-6"
      : "inset-x-2 bottom-2 max-h-[85dvh] sm:inset-x-4 sm:bottom-4";
  return (
    <div
      role="dialog"
      aria-label={label ?? (typeof title === "string" ? title : undefined)}
      className={`dq-window pointer-events-auto fixed mx-auto flex max-w-2xl flex-col ${box}`}
    >
      <div className="dq-titlebar">
        <h2 className="min-w-0 flex-1 truncate">{title}</h2>
        <button
          onClick={onClose}
          aria-label="Đóng (Esc)"
          className="rounded px-2 text-[#f4f1de]/80 hover:bg-white/10 hover:text-white"
        >
          ✕ <span className="hidden text-[10px] font-normal sm:inline">Esc</span>
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
    </div>
  );
}
