import type { MetadataRoute } from "next";
import { getPublicSiteUrl } from "@/lib/publicSiteUrl";

/**
 * Production sitemap: marketing homepage only.
 * Published demo blogs live at /blog/[slug] but are omitted intentionally —
 * Bloggie AI is a SaaS landing site, not a content hub on bloggieai.com.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getPublicSiteUrl();

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
