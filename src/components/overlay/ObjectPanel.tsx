"use client";

const OBJECT_TEXT: Record<string, { en: string; vi: string }> = {
  whiteboard: {
    en: "Word of the Day arrives in the next update.",
    vi: "Từ vựng hôm nay sẽ có ở bản cập nhật tới.",
  },
  sprintBoard: {
    en: "Sprint tickets (daily quests) are coming soon.",
    vi: "Sprint ticket (nhiệm vụ hằng ngày) sắp ra mắt.",
  },
  coffeeMachine: { en: "The Coffee Beans shop opens soon.", vi: "Cửa hàng Coffee Beans sắp mở." },
  noticeBoard: { en: "Achievements will be posted here.", vi: "Thành tựu sẽ được dán ở đây." },
  demoScreen: {
    en: "Meetings and demos will be presented here.",
    vi: "Các buổi họp và demo sẽ chiếu ở đây.",
  },
};

/** Fallback panel for interactables whose feature isn't wired yet. */
export function ObjectPanel({
  kind,
  label,
  onClose,
}: {
  kind: string;
  label: string;
  onClose: () => void;
}) {
  const line = OBJECT_TEXT[kind] ?? { en: "Nothing here yet.", vi: "Chưa có gì ở đây." };
  return (
    <div
      role="dialog"
      aria-label={label}
      className="pointer-events-auto fixed inset-x-4 bottom-4 mx-auto max-w-2xl rounded-lg border-4 border-[#5c5c7a] bg-[#f4f1de] p-4 text-[#1b1b28] shadow-xl"
    >
      <p className="mb-1 text-sm font-bold">{label}</p>
      <p className="text-lg">{line.en}</p>
      <p className="mt-1 text-sm text-[#5c5c7a]">{line.vi}</p>
      <button onClick={onClose} className="mt-3 rounded bg-[#1b1b28] px-3 py-1 text-sm text-white">
        Đóng (Esc)
      </button>
    </div>
  );
}
