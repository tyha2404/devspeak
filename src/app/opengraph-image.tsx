import { ImageResponse } from "next/og";

export const alt = "DevSpeak — Ngữ pháp và từ vựng theo lộ trình";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 80,
        background: "#003838",
        color: "#f7f4ed",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <svg width="88" height="88" viewBox="0 0 64 64">
          <rect width="64" height="64" rx="14" fill="#004646" />
          <path
            d="M14 16h36a6 6 0 0 1 6 6v18a6 6 0 0 1-6 6H30l-10 8v-8h-6a6 6 0 0 1-6-6V22a6 6 0 0 1 6-6z"
            fill="#27c4b5"
          />
          <path
            d="M25 24l-7 7 7 7M39 24l7 7-7 7M35 22l-6 18"
            fill="none"
            stroke="#004646"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div style={{ fontSize: 32, color: "#27c4b5", letterSpacing: 6 }}>
          DEVSPEAK · ENGLISH FOR DEVELOPERS
        </div>
      </div>
      <div style={{ fontSize: 72, fontWeight: 700, marginTop: 24, lineHeight: 1.1 }}>
        Tiếng Anh cho developer, học theo từng chặng.
      </div>
      <div style={{ fontSize: 36, marginTop: 24, color: "#cde7e3" }}>
        Ngữ pháp A1 → C2 · Từ vựng theo chủ đề · Bài kiểm tra 16 câu
      </div>
    </div>,
    size,
  );
}
