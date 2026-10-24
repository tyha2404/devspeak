import { ImageResponse } from "next/og";

export const alt = "DevQuest English — Ngữ pháp và từ vựng theo lộ trình";
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
      <div style={{ fontSize: 32, color: "#27c4b5", letterSpacing: 6 }}>DEVQUEST ENGLISH</div>
      <div style={{ fontSize: 72, fontWeight: 700, marginTop: 24, lineHeight: 1.1 }}>
        Học theo từng chặng, nhớ theo từng bài.
      </div>
      <div style={{ fontSize: 36, marginTop: 24, color: "#cde7e3" }}>
        Ngữ pháp A1 → C2 · Từ vựng theo chủ đề · Bài kiểm tra 16 câu
      </div>
    </div>,
    size,
  );
}
