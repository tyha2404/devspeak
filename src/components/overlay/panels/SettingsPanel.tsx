"use client";

import { useSettings, type TranslationMode } from "@/stores/settingsStore";
import { Panel } from "./Panel";

export function SettingsForm() {
  const s = useSettings();
  const row = "flex items-center justify-between gap-3 rounded bg-white p-3";
  return (
    <div className="space-y-2 text-sm">
      <label className={row}>
        Dịch tiếng Việt
        <select
          value={s.translation}
          onChange={(e) => s.set({ translation: e.target.value as TranslationMode })}
          className="rounded border px-2 py-1"
        >
          <option value="always">Luôn hiện</option>
          <option value="tap">Chạm để xem</option>
          <option value="never">Không (Immersion)</option>
        </select>
      </label>
      <label className={row}>
        Tốc độ chữ chạy
        <select
          value={s.typewriterCps}
          onChange={(e) => s.set({ typewriterCps: Number(e.target.value) as 0 | 40 | 80 })}
          className="rounded border px-2 py-1"
        >
          <option value={40}>Bình thường</option>
          <option value={80}>Nhanh</option>
          <option value={0}>Hiện ngay</option>
        </select>
      </label>
      <label className={row}>
        Tốc độ đọc (TTS): {s.ttsRate.toFixed(1)}
        <input
          type="range"
          min={0.6}
          max={1.2}
          step={0.1}
          value={s.ttsRate}
          onChange={(e) => s.set({ ttsRate: Number(e.target.value) })}
        />
      </label>
      <label className={row}>
        Cỡ chữ
        <select
          value={s.fontScale}
          onChange={(e) => s.set({ fontScale: e.target.value as "s" | "m" | "l" | "xl" })}
          className="rounded border px-2 py-1"
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
        />
      </label>
      <label className={row}>
        Âm thanh hiệu ứng: {Math.round(s.sfxVolume * 100)}%
        <input
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={s.sfxVolume}
          onChange={(e) => s.set({ sfxVolume: Number(e.target.value) })}
        />
      </label>
    </div>
  );
}

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  return (
    <Panel title="⚙️ Cài đặt" onClose={onClose}>
      <SettingsForm />
    </Panel>
  );
}
