import { isCrawlerFriendlyImageUrl, toAbsolutePublicUrl } from "@/lib/publicSiteUrl";

export const SITE_NAME = "Bloggie AI";
export const SITE_LOCALE = "en_US";
export const DEFAULT_OG_IMAGE_PATH = "/opengraph-image";
export const DEFAULT_OG_IMAGE_ALT = "Bloggie AI — AI content for organic search";

export const DEFAULT_OG_IMAGE = {
  url: DEFAULT_OG_IMAGE_PATH,
  width: 1200,
  height: 630,
  alt: DEFAULT_OG_IMAGE_ALT,
} as const;

/** App routes that should never appear in search results. */
export const NOINDEX_PATH_PREFIXES = [
  "/dashboard",
  "/setup",
  "/test",
  "/test-dashboard",
  "/sign-in",
  "/sign-up",
  "/sign-out",
  "/onboarding",
  "/feedback",
  "/linkedin",
  "/ai-faq",
  "/ai-faq-test",
] as const;

/** Accessible alt for hero/banner images (stored on payload.images.altText). */
export function resolveBannerAltText(
  altText?: string | null,
  fallbackTitle?: string,
): string {
  const alt = altText?.trim();
  if (alt) return alt;
  const title = fallbackTitle?.trim();
  if (title) return title;
  return "Blog post illustration";
}

export function resolveOgImageList(
  bannerUrl?: string | null,
  alt?: string,
): { url: string; width: number; height: number; alt: string }[] {
  const banner = bannerUrl?.trim();
  if (banner && isCrawlerFriendlyImageUrl(toAbsolutePublicUrl(banner))) {
    return [
      {
        url: toAbsolutePublicUrl(banner),
        width: 1600,
        height: 900,
        alt: alt?.trim() || DEFAULT_OG_IMAGE_ALT,
      },
    ];
  }
  return [
    {
      url: toAbsolutePublicUrl(DEFAULT_OG_IMAGE_PATH),
      width: DEFAULT_OG_IMAGE.width,
      height: DEFAULT_OG_IMAGE.height,
      alt: DEFAULT_OG_IMAGE_ALT,
    },
  ];
}
