import type { MetadataRoute } from "next";

const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/credits", "/privacy", "/terms"].map((p) => ({
    url: `${site}${p}`,
    changeFrequency: "monthly",
    priority: p ? 0.3 : 1,
  }));
}
