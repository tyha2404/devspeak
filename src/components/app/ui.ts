// Shared class recipes. Amber is reserved for the single primary action on a screen.
export const btn = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-lg bg-amber px-5 py-3 font-semibold text-[#1d1405] hover:brightness-105 disabled:opacity-40",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 py-2.5 font-medium text-ink hover:bg-paper disabled:opacity-40",
  ghost: "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted hover:text-ink",
};

export const LESSON_KIND_VI: Record<string, string> = {
  vocab: "Từ vựng",
  dialogue: "Hội thoại",
  focus: "Mẫu câu",
  practice: "Luyện tập",
  reading: "Đọc",
  listening: "Nghe",
  mistakes: "Lỗi hay gặp",
  task: "Nhiệm vụ",
};
