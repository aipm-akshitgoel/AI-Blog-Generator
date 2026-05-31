import type { ApprovedLink } from "@/lib/interlinking";
import { normalizeDomain } from "@/lib/strategyInputs";
import { websiteFetchHeaders } from "@/lib/websiteFetch";

/** Turn a site-relative or absolute href into a full https URL for display. */
export function toAbsoluteSiteHref(href: string, domain?: string): string {
    const raw = String(href || "").trim();
    if (!raw) return raw;
    if (/^https?:\/\//i.test(raw)) return raw;
    const origin = siteOriginFromDomain(domain);
    if (!origin) return raw;
    const path = raw.startsWith("/") ? raw : `/${raw}`;
    try {
        return new URL(path, origin).href;
    } catch {
        return `${origin}${path}`;
    }
}

export function siteOriginFromDomain(domain: string | undefined): string | null {
    const host = normalizeDomain(domain || "");
    if (!host) return null;
    try {
        return new URL(`https://${host}`).origin;
    } catch {
        return null;
    }
}

function normalizeHostname(host: string): string {
    return host.replace(/^www\./i, "").toLowerCase();
}

/** True when href origin matches the configured site (www and non-www treated as same). */
export function isSameSiteOrigin(hrefOrigin: string, siteOrigin: string | null): boolean {
    if (!siteOrigin) return false;
    try {
        const a = new URL(hrefOrigin);
        const b = new URL(siteOrigin);
        return normalizeHostname(a.hostname) === normalizeHostname(b.hostname);
    } catch {
        return hrefOrigin === siteOrigin;
    }
}

/** Normalize to a site-relative path for comparison (e.g. `/blog/post`). */
export function normalizeSitePath(href: string, origin: string | null): string | null {
    const raw = String(href || "").trim();
    if (!raw || raw.startsWith("#") || raw.startsWith("mailto:") || raw.startsWith("tel:")) {
        return null;
    }

    if (/^https?:\/\//i.test(raw)) {
        if (!origin) return null;
        try {
            const u = new URL(raw);
            if (!isSameSiteOrigin(u.origin, origin)) return null;
            const path = u.pathname || "/";
            return path.endsWith("/") && path.length > 1 ? path.slice(0, -1) : path;
        } catch {
            return null;
        }
    }

    if (raw.startsWith("//")) {
        if (!origin) return null;
        try {
            const u = new URL(`${origin.startsWith("https") ? "https:" : "https:"}${raw}`);
            if (!isSameSiteOrigin(u.origin, origin)) return null;
            return u.pathname || "/";
        } catch {
            return null;
        }
    }

    const path = raw.startsWith("/") ? raw : `/${raw}`;
    const clean = path.split(/[?#]/)[0] || "/";
    return clean.endsWith("/") && clean.length > 1 ? clean.slice(0, -1) : clean;
}

export function isSameSiteHref(href: string, origin: string | null): boolean {
    return normalizeSitePath(href, origin) != null;
}

export function toApprovedLink(href: string, anchorText: string, origin: string | null): ApprovedLink | null {
    const path = normalizeSitePath(href, origin);
    if (!path) return null;
    const label = anchorText.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!label || label.length < 2) return null;
    const target: ApprovedLink["target"] = path.includes("/blog/") ? "blog" : "page";
    return { href: path, anchorText: label.slice(0, 120), target };
}

/** Parse anchor tags from HTML and keep same-origin links only. */
export function extractInternalLinksFromHtml(html: string, pageUrl: string): ApprovedLink[] {
    let origin: string;
    try {
        origin = new URL(pageUrl).origin;
    } catch {
        return [];
    }

    const seen = new Set<string>();
    const out: ApprovedLink[] = [];
    const re = /<a\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

    for (const match of html.matchAll(re)) {
        const href = match[1];
        const anchorHtml = match[2] || "";
        const link = toApprovedLink(href, anchorHtml, origin);
        if (!link || seen.has(link.href)) continue;
        seen.add(link.href);
        out.push(link);
        if (out.length >= 80) break;
    }

    return out;
}

export async function discoverDomainLinks(siteUrl: string): Promise<ApprovedLink[]> {
    let formatted = siteUrl.trim();
    if (!/^https?:\/\//i.test(formatted)) formatted = `https://${formatted}`;
    let parsed: URL;
    try {
        parsed = new URL(formatted);
    } catch {
        return [];
    }

    const origin = parsed.origin;
    const seen = new Set<string>();
    const out: ApprovedLink[] = [];

    const push = (link: ApprovedLink | null) => {
        if (!link || seen.has(link.href)) return;
        seen.add(link.href);
        out.push(link);
    };

    push({ href: "/", anchorText: "Home", target: "page" });

    try {
        const res = await fetch(parsed.toString(), {
            headers: websiteFetchHeaders(),
            redirect: "follow",
            signal: AbortSignal.timeout(12_000),
        });
        if (res.ok) {
            const html = await res.text();
            for (const link of extractInternalLinksFromHtml(html, parsed.toString())) {
                push(link);
            }
        }
    } catch {
        /* homepage fetch failed — keep home only */
    }

    return out.filter((l) => isSameSiteHref(l.href, origin));
}
