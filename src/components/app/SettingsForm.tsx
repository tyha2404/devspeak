"use client";

import { useSettings, type Theme, type TranslationMode } from "@/stores/settingsStore";

const row = "flex items-center justify-between gap-4 px-4 py-3";
const select = "rounded-md border border-line bg-surface px-2 py-1.5";

/** Device-local display and study preferences. */
export function SettingsForm() {
  const s = useSettings();
  return (
    <div className="divide-line border-line bg-surface divide-y rounded-xl border">
      <label className={row}>
        Giao diện
        <select
          value={s.theme}
          onChange={(e) => s.set({ theme: e.target.value as Theme })}
          className={select}
        >
          <option value="system">Theo hệ thống</option>
          <option value="light">Sáng</option>
          <option value="dark">Tối</option>
        </select>
      </label>
      <label className={row}>
        Dịch tiếng Việt trong hội thoại
        <select
          value={s.translation}
          onChange={(e) => s.set({ translation: e.target.value as TranslationMode })}
          className={select}
        >
          <option value="always">Luôn hiện</option>
          <option value="tap">Chạm để xem</option>
          <option value="never">Không hiện</option>
        </select>
      </label>
      <label className={row}>
        Tốc độ hiện chữ
        <select
          value={s.typewriterCps}
          onChange={(e) => s.set({ typewriterCps: Number(e.target.value) as 0 | 40 | 80 })}
          className={select}
        >
          <option value={40}>Bình thường</option>
          <option value={80}>Nhanh</option>
          <option value={0}>Hiện ngay</option>
        </select>
      </label>
      <label className={row}>
        <span>Tốc độ đọc mẫu: {s.ttsRate.toFixed(1)}×</span>
        <input
          type="range"
          min={0.6}
          max={1.2}
          step={0.1}
          value={s.ttsRate}
          onChange={(e) => s.set({ ttsRate: Number(e.target.value) })}
          className="accent-[var(--amber)]"
        />
      </label>
      <label className={row}>
        Cỡ chữ
        <select
          value={s.fontScale}
          onChange={(e) => s.set({ fontScale: e.target.value as "s" | "m" | "l" | "xl" })}
          className={select}
        >
          <option value="s">Nhỏ</option>
          <option value="m">Vừa</option>
          <option value="l">Lớn</option>
          <option value="xl">Rất lớn</option>
        </select>
      </label>
      <label className={row}>
        Giảm chuyển động
        <input
          type="checkbox"
          checked={s.reducedMotion}
          onChange={(e) => s.set({ reducedMotion: e.target.checked })}
          className="h-5 w-5 accent-[var(--amber)]"
        />
      </label>
      <label className={row}>
        <span>Âm thanh đúng/sai: {Math.round(s.sfxVolume * 100)}%</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={s.sfxVolume}
          onChange={(e) => s.set({ sfxVolume: Number(e.target.value) })}
          className="accent-[var(--amber)]"
        />
      </label>
    </div>
  );
}
