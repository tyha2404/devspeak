import { ImageResponse } from "next/og";

export const alt = "DevQuest English — Tiếng Anh cho lập trình viên";
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
        background: "#1b1b28",
        color: "#f4f1de",
      }}
    >
      <div style={{ fontSize: 32, color: "#f2a65a", letterSpacing: 6 }}>DEVQUEST ENGLISH</div>
      <div style={{ fontSize: 72, fontWeight: 700, marginTop: 24, lineHeight: 1.1 }}>
        Workplace English for developers
      </div>
      <div style={{ fontSize: 36, marginTop: 24, color: "#c9c6b5" }}>
        Standup · Code review · Bug report · Interviews
      </div>
    </div>,
    size,
  );
}
