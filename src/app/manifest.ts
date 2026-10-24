import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DevQuest English",
    short_name: "DevQuest",
    description: "Tiếng Anh cho lập trình viên, học qua game.",
    start_url: "/play",
    display: "fullscreen",
    orientation: "landscape",
    background_color: "#1b1b28",
    theme_color: "#1b1b28",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
