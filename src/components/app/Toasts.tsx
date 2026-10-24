"use client";

import { useToasts } from "@/stores/toastStore";

export function Toasts() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="bg-ink text-paper rounded-lg px-4 py-2 text-sm font-medium shadow-lg"
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
