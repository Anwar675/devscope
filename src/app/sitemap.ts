import type { MetadataRoute } from "next";

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://devscope.ai"
).replace(/\/$/, "");

const routes = [
  { path: "/", priority: 1 },
  { path: "/loadtest", priority: 0.9 },
  { path: "/metrics", priority: 0.8 },
  { path: "/aianalysis", priority: 0.8 },
  { path: "/overview", priority: 0.7 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return routes.map(({ path, priority }) => ({
    url: `${siteUrl}${path}`,
    lastModified,
    changeFrequency: "weekly",
    priority,
  }));
}
