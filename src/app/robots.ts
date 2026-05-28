import type { MetadataRoute } from "next";
import { getPublicSiteUrl } from "@/lib/publicSiteUrl";
import { NOINDEX_PATH_PREFIXES } from "@/lib/siteSeo";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getPublicSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          ...NOINDEX_PATH_PREFIXES.map((p) => `${p}/`),
          "/api/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
