/** Canonical public origin for absolute URLs (OG, schema, persisted images). */
export function getPublicSiteUrl(): string {
    const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    if (explicit) return explicit.replace(/\/$/, "");
    const vercel = process.env.VERCEL_URL?.trim();
    if (vercel) return `https://${vercel.replace(/\/$/, "")}`;
    return "https://bloggieai.com";
}

/** Normalize user input like `bloggieai.com` or `https://blog.example.com/` to origin. */
export function normalizeSiteOrigin(input?: string | null): string | null {
    const raw = input?.trim();
    if (!raw) return null;
    const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
        const u = new URL(withProto);
        return `${u.protocol}//${u.host}`;
    } catch {
        return null;
    }
}

/** Canonical URL for a published blog post on this deployment. */
export function buildBlogCanonicalUrl(slug: string): string {
    const cleanSlug = slug.trim().replace(/^\/+|\/+$/g, "");
    return `${getPublicSiteUrl()}/blog/${cleanSlug}`;
}

/** HTTPS URL suitable for og:image / Twitter cards (not data: URIs). */
export function isCrawlerFriendlyImageUrl(url: string): boolean {
    const u = url.trim();
    return u.startsWith("https://") && !u.startsWith("data:");
}

/** Resolve relative paths (e.g. `/uploads/...`) to an absolute HTTPS URL. */
export function toAbsolutePublicUrl(url: string): string {
    const u = url.trim();
    if (!u) return u;
    if (u.startsWith("http://") || u.startsWith("https://")) return u;
    if (u.startsWith("/")) return `${getPublicSiteUrl()}${u}`;
    return u;
}
