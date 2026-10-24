import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, JetBrains_Mono } from "next/font/google";
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
const mono = JetBrains_Mono({
  variable: "--font-mono-code",
  subsets: ["latin"],
  weight: ["500"],
});

const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: "DevQuest English · Tiếng Anh cho lập trình viên", template: "%s" },
  description:
    "Lộ trình tiếng Anh cho lập trình viên Việt Nam (A2 → B2): standup, code review, bug report, email, phỏng vấn và kiến thức kỹ thuật bằng tiếng Anh. Mỗi ngày 15 phút.",
  keywords: [
    "tiếng Anh cho lập trình viên",
    "IT English",
    "tiếng Anh giao tiếp công việc",
    "lộ trình tiếng Anh IT",
    "developer English",
  ],
  openGraph: {
    type: "website",
    siteName: "DevQuest English",
    locale: "vi_VN",
    title: "DevQuest English · Tiếng Anh cho lập trình viên",
    description:
      "Standup, code review, bug report, phỏng vấn… lộ trình tiếng Anh IT rõ ràng, mỗi ngày 15 phút.",
  },
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.png", apple: "/apple-icon.png" },
};

export const viewport: Viewport = { themeColor: "#f3f5f8", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body className={`${beVietnam.variable} ${mono.variable} antialiased`}>
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
