import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@/components/Analytics";
import { SettingsEffect } from "@/components/SettingsEffect";
import "./globals.css";

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "600", "700"],
});

const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: "DevQuest English · Tiếng Anh cho lập trình viên", template: "%s" },
  description:
    "Học tiếng Anh công việc IT qua game: nói chuyện với đồng nghiệp NPC, từ vựng mỗi ngày, ôn tập thông minh. Dành cho lập trình viên Việt Nam (A2–B2).",
  keywords: [
    "tiếng Anh cho lập trình viên",
    "IT English",
    "tiếng Anh giao tiếp công việc",
    "học tiếng Anh qua game",
    "developer English",
  ],
  openGraph: {
    type: "website",
    siteName: "DevQuest English",
    locale: "vi_VN",
    title: "DevQuest English · Tiếng Anh cho lập trình viên",
    description:
      "Standup, code review, bug report… học tiếng Anh IT bằng cách đi làm trong một văn phòng pixel-art.",
  },
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.png", apple: "/apple-icon.png" },
};

export const viewport: Viewport = { themeColor: "#1b1b28", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body className={`${beVietnam.variable} antialiased`}>
        <NextIntlClientProvider>
          <SettingsEffect />
          <Analytics />
          {children}
        </NextIntlClientProvider>
        {/* The Speed Insights script is served by Vercel's edge; it 404s anywhere else. */}
        {process.env.VERCEL && <SpeedInsights />}
      </body>
    </html>
  );
}
