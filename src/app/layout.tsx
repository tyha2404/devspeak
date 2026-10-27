import type { Metadata, Viewport } from "next";
import { Alexandria, Cal_Sans, JetBrains_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@/components/Analytics";
import { SettingsEffect } from "@/components/SettingsEffect";
import "./globals.css";

const body = Alexandria({
  variable: "--font-body",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});
const heading = Cal_Sans({
  variable: "--font-heading",
  subsets: ["latin", "vietnamese"],
  weight: "400",
  // next/font has no metrics for Cal Sans to size a fallback with.
  adjustFontFallback: false,
});
const mono = JetBrains_Mono({
  variable: "--font-mono-code",
  subsets: ["latin"],
  weight: ["500"],
});

const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: "DevSpeak · Ngữ pháp và từ vựng theo lộ trình", template: "%s" },
  description:
    "Ngữ pháp theo bậc CEFR A1 → C2, từ vựng theo chủ đề và lộ trình tiếng Anh công việc cho lập trình viên Việt Nam. Mỗi bài gồm phần học và bài kiểm tra.",
  keywords: [
    "học ngữ pháp tiếng Anh",
    "từ vựng tiếng Anh theo chủ đề",
    "tiếng Anh cho lập trình viên",
    "tiếng Anh giao tiếp công việc",
    "lộ trình tiếng Anh IT",
    "developer English",
  ],
  openGraph: {
    type: "website",
    siteName: "DevSpeak",
    locale: "vi_VN",
    title: "DevSpeak · Ngữ pháp và từ vựng theo lộ trình",
    description:
      "Học theo từng chặng, nhớ theo từng bài: ngữ pháp A1 → C2, từ vựng theo chủ đề, tiếng Anh công việc.",
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/brand/mark.svg", type: "image/svg+xml" },
      { url: "/icon.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = { themeColor: "#f7f4ed", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before the first paint, including before React loads. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{const theme=JSON.parse(localStorage.getItem("dq:settings")||"null")?.state?.theme;if(theme==="light"||theme==="dark")document.documentElement.dataset.theme=theme;}catch{}`,
          }}
        />
      </head>
      <body className={`${body.variable} ${heading.variable} ${mono.variable} antialiased`}>
        <SettingsEffect />
        <Analytics />
        {children}
        {/* The Speed Insights script is served by Vercel's edge; it 404s anywhere else. */}
        {process.env.VERCEL && <SpeedInsights />}
      </body>
    </html>
  );
}
