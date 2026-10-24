import type { ReactNode } from "react";

/** Shared chrome for full overlays opened from in-world objects. */
export function Panel({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-label={title}
      className="pointer-events-auto fixed inset-x-2 top-16 bottom-2 mx-auto flex max-w-2xl flex-col rounded-lg border-4 border-[#5c5c7a] bg-[#f4f1de] p-4 text-[#1b1b28] shadow-xl"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">{title}</h2>
        <button onClick={onClose} aria-label="Đóng (Esc)" className="px-2 text-lg">
          ✕
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
