import type { MetadataRoute } from "next";

const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/learn",
        "/lesson",
        "/exam",
        "/onboarding",
        "/review",
        "/words",
        "/profile",
        "/admin",
        "/api",
        "/login",
        "/auth",
      ],
    },
    sitemap: `${site}/sitemap.xml`,
  };
}
