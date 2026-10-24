import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DevQuest English",
    short_name: "DevQuest",
    description: "Lộ trình tiếng Anh cho lập trình viên, A2 → B2.",
    start_url: "/learn",
    display: "standalone",
    background_color: "#f3f5f8",
    theme_color: "#f3f5f8",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
