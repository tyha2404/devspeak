"use client";

import { useEffect } from "react";
import { NPCS } from "@/game/data/npcs";
import { EventBus } from "@/game/EventBus";
import { useUiStore } from "@/stores/uiStore";

// Placeholder lines until the dialogue engine lands in M2.
const GREETINGS: Record<string, { en: string; vi: string }> = {
  linh: {
    en: "Welcome to the team! Can you introduce yourself?",
    vi: "Chào mừng bạn! Hãy giới thiệu bản thân nhé.",
  },
  tuan: {
    en: "Always pull before you push, or you'll get a merge conflict.",
    vi: "Luôn pull trước khi push, không thì sẽ bị merge conflict.",
  },
  sarah: {
    en: "Morning! What did you do yesterday? Any blockers?",
    vi: "Chào buổi sáng! Hôm qua bạn làm gì? Có vướng mắc gì không?",
  },
  dave: {
    en: "Big weekend? I finally binge-watched that series.",
    vi: "Cuối tuần vui không? Mình cày hết bộ phim đó rồi.",
  },
  emma: {
    en: "I can't reproduce it. Could you list the steps to reproduce?",
    vi: "Mình không tái hiện được lỗi. Bạn liệt kê các bước tái hiện nhé?",
  },
};

const OBJECT_TEXT: Record<string, { en: string; vi: string }> = {
  whiteboard: {
    en: "Word of the Day arrives in the next update.",
    vi: "Từ vựng hôm nay sẽ có ở bản cập nhật tới.",
  },
  sprintBoard: {
    en: "Sprint tickets (daily quests) are coming soon.",
    vi: "Sprint ticket (nhiệm vụ hằng ngày) sắp ra mắt.",
  },
  computer: {
    en: "Your notebook and reviews will live here.",
    vi: "Sổ tay và phần ôn tập sẽ nằm ở đây.",
  },
  coffeeMachine: { en: "The Coffee Beans shop opens soon.", vi: "Cửa hàng Coffee Beans sắp mở." },
  noticeBoard: { en: "Achievements will be posted here.", vi: "Thành tựu sẽ được dán ở đây." },
  demoScreen: {
    en: "Meetings and demos will be presented here.",
    vi: "Các buổi họp và demo sẽ chiếu ở đây.",
  },
};

export function DialogBox() {
  const overlay = useUiStore((s) => s.overlay);
  const close = useUiStore((s) => s.closeOverlay);

  useEffect(() => {
    if (!overlay) return;
    EventBus.emit("input:lock", { reason: "dialogue" });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      EventBus.emit("input:unlock");
    };
  }, [overlay, close]);

  if (!overlay) return null;
  let title: string;
  let line: { en: string; vi: string } | undefined;
  if (overlay.kind === "dialogue") {
    const npc = NPCS[overlay.npcId];
    title = npc ? `${npc.name} · ${npc.role.en}` : overlay.npcId;
    line = GREETINGS[overlay.npcId] ?? { en: "Hi there!", vi: "Chào bạn!" };
  } else {
    title = overlay.label;
    line = OBJECT_TEXT[overlay.objectKind] ?? { en: "Nothing here yet.", vi: "Chưa có gì ở đây." };
  }

  return (
    <div
      role="dialog"
      aria-label={title}
      className="pointer-events-auto fixed inset-x-4 bottom-4 mx-auto max-w-2xl rounded-lg border-4 border-[#5c5c7a] bg-[#f4f1de] p-4 text-[#1b1b28] shadow-xl"
    >
      <p className="mb-1 text-sm font-bold">{title}</p>
      <p aria-live="polite" className="text-lg">
        {line.en}
      </p>
      <p className="mt-1 text-sm text-[#5c5c7a]">{line.vi}</p>
      <button onClick={close} className="mt-3 rounded bg-[#1b1b28] px-3 py-1 text-sm text-white">
        Tiếp tục (Enter)
      </button>
    </div>
  );
}
