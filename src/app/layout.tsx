import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "DevQuest English · Tiếng Anh cho lập trình viên",
  description:
    "Học tiếng Anh công việc IT qua game: nói chuyện với đồng nghiệp NPC, từ vựng mỗi ngày, ôn tập thông minh.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body className={`${beVietnam.variable} antialiased`}>{children}</body>
    </html>
  );
}
