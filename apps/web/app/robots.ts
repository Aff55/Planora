import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * The public site is indexable. Everything behind the session is not — /app
 * and /auth describe one person's records and must never be crawled.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/app", "/app/", "/auth"]
      }
    ],
    sitemap: `${siteUrl}/sitemap.xml`
  };
}
