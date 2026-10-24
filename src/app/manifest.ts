import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DevQuest English",
    short_name: "DevQuest",
    description: "Ngữ pháp theo bậc CEFR A1 → C2 và từ vựng theo chủ đề.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f4ed",
    theme_color: "#f7f4ed",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
