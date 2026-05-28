import { getDirectoryFromSession } from "@/lib/contentDirectory";
import type { BusinessContext } from "@/lib/types/businessContext";
import type { StrategySession } from "@/lib/types/strategy";

export function normalizeDomain(input: string): string {
    const raw = String(input || "").trim();
    if (!raw) return "";
    let url = raw;
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    try {
        return new URL(url).hostname.replace(/^www\./i, "");
    } catch {
        return raw
            .replace(/^https?:\/\//i, "")
            .replace(/^www\./i, "")
            .split("/")[0]
            .trim();
    }
}

const DOMAIN_LABEL = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;

/** Public hostname with a TLD (e.g. example.com, brand.co.in, site.io). */
export function isValidPublicDomain(input: string): boolean {
    const host = normalizeDomain(input);
    if (!host || /\s/.test(host)) return false;
    if (/^(localhost|127\.|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(host)) return false;

    const labels = host.split(".").filter(Boolean);
    if (labels.length < 2) return false;

    const tld = labels[labels.length - 1];
    if (!/^[a-zA-Z]{2,63}$/.test(tld)) return false;

    return labels.every((label) => label.length <= 63 && DOMAIN_LABEL.test(label));
}

/** Saved profile includes a website domain (required for publish + internal linking). */
export function hasBusinessDomain(ctx: BusinessContext | null | undefined): boolean {
    return isValidPublicDomain(ctx?.domain || "");
}

export function hasUsableBusinessContext(ctx: BusinessContext | null | undefined): boolean {
    if (!ctx) return false;
    if (hasBusinessDomain(ctx)) return true;
    const name = ctx.businessName?.trim();
    if (name && name !== "My Business") return true;
    if (ctx.services?.length) return true;
    if (ctx.targetAudience?.trim() && ctx.targetAudience !== "Prospective customers searching online") return true;
    if (ctx.positioning?.trim() && ctx.positioning !== "Helpful and trustworthy") return true;
    return false;
}

export function canGenerateStrategy(
    ctx: BusinessContext | null | undefined,
    referenceDomain?: string,
): boolean {
    return hasUsableBusinessContext(ctx) || Boolean(normalizeDomain(referenceDomain || ""));
}

/** Pull a hostname from free text when the user mentions a site in custom direction. */
export function extractDomainFromText(text: string): string {
    const raw = String(text || "").trim();
    if (!raw) return "";
    const urlMatch = raw.match(/https?:\/\/([^\s/]+)/i);
    if (urlMatch?.[1]) return normalizeDomain(urlMatch[1]);
    const domainMatch = raw.match(/\b([a-z0-9][-a-z0-9]*\.)+[a-z]{2,}\b/i);
    if (domainMatch?.[0]) return normalizeDomain(domainMatch[0]);
    return "";
}

export function resolveStrategyReferenceDomain(
    ctx: BusinessContext | null | undefined,
    customPrompt?: string,
): string {
    const fromPrompt = extractDomainFromText(customPrompt || "");
    if (fromPrompt) return fromPrompt;
    return normalizeDomain(ctx?.domain || "");
}

export function canRunStrategyAgent(
    ctx: BusinessContext | null | undefined,
    customPrompt?: string,
): boolean {
    if (String(customPrompt || "").trim().length > 0) return true;
    return canGenerateStrategy(ctx, resolveStrategyReferenceDomain(ctx, customPrompt));
}

export function buildMinimalBusinessContext(opts: {
    domain?: string;
    businessName?: string;
    platform?: "blog" | "linkedin";
}): BusinessContext {
    const host = normalizeDomain(opts.domain || "");
    const label = host
        ? host.split(".")[0].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
        : opts.businessName?.trim() || "Your Business";

    return {
        businessName: opts.businessName?.trim() || label,
        domain: host ? `https://${host}` : opts.domain,
        businessType: "General",
        location: {},
        services: [],
        targetAudience: "Readers searching for information online",
        brandTone: "Professional and helpful",
        positioning: "Informative and trustworthy",
        platform: opts.platform ?? "blog",
    };
}

export function mergeContextWithReference(
    ctx: BusinessContext | null | undefined,
    referenceDomain?: string,
): BusinessContext {
    const host = normalizeDomain(referenceDomain || ctx?.domain || "");
    const base = ctx ?? buildMinimalBusinessContext({ domain: host });
    if (host) {
        return {
            ...base,
            domain: `https://${host}`,
        };
    }
    return base;
}

export function hasTopicSuggestions(strategy: StrategySession | null | undefined): boolean {
    if (!strategy) return false;
    return getDirectoryFromSession(strategy).length > 0;
}

/** Minimal profile payload when saving strategy without a completed business setup step. */
export function businessContextPayloadFromStrategy(
    session: StrategySession,
    existing?: BusinessContext | null,
): Record<string, unknown> {
    const primary = session.keywordStrategy?.primaryKeyword?.trim();

    if (hasUsableBusinessContext(existing)) {
        const payload: Record<string, unknown> = {
            platform: existing!.platform ?? session.platform ?? "blog",
            businessName: existing!.businessName,
            businessType: existing!.businessType === "General" ? "other" : existing!.businessType || "other",
            location: existing!.location ?? {},
            services: existing!.services ?? [],
            targetAudience: existing!.targetAudience,
            brandTone: existing!.brandTone,
            positioning: existing!.positioning,
        };
        if (existing!.domain) payload.domain = existing!.domain;
        return payload;
    }

    const host = normalizeDomain(existing?.domain || session.referenceDomain || "");
    if (host) {
        return {
            platform: session.platform ?? "blog",
            businessName: existing?.businessName?.trim() || primary || "My Business",
            businessType: "other",
            domain: `https://${host}`,
            location: existing?.location ?? {},
            services: existing?.services ?? [],
            targetAudience: existing?.targetAudience?.trim() || "Readers searching for information online",
            brandTone: existing?.brandTone?.trim() || "Professional and helpful",
            positioning: existing?.positioning?.trim() || "Informative and trustworthy",
        };
    }

    // Never name the profile after a reference/competitor domain — use niche/keyword or a neutral default.
    return {
        platform: session.platform ?? "blog",
        businessName: primary || "My Business",
        businessType: "other",
        location: {},
        services: [],
        targetAudience: "Readers searching for information online",
        brandTone: "Professional and helpful",
        positioning: "Informative and trustworthy",
    };
}

export type WriterSetupInput = {
    hasBusinessDomain: boolean;
    hasSavedStrategy: boolean;
    hasAnyBlogOrDraft: boolean;
    /** Same browser session only — after skipping optional keyword strategy. */
    writerUnlockedSession?: boolean;
};

/** Domain + saved keyword strategy (uploaded or AI-generated). */
export function hasCompletedWriterSetup(input: WriterSetupInput): boolean {
    return input.hasBusinessDomain && input.hasSavedStrategy;
}

/** @deprecated Use hasCompletedWriterSetup — blogs alone do not bypass strategy. */
export function hasWriterProgress(input: WriterSetupInput): boolean {
    return hasCompletedWriterSetup(input);
}

/** Both domain and strategy are required before writing or batch-generating posts. */
export function canEnterBlogWriter(input: WriterSetupInput): boolean {
    return hasCompletedWriterSetup(input);
}

/** Route new-blog flow: full onboarding only for brand-new accounts; returning users repair domain client-side. */
export function resolveWriterSetupPath(input: WriterSetupInput): string {
    if (!input.hasBusinessDomain) {
        if (!input.hasSavedStrategy && !input.hasAnyBlogOrDraft) {
            return "/setup?onboarding=first";
        }
        if (!input.hasSavedStrategy) return "/setup";
        return "/setup?mode=blog";
    }
    if (!input.hasSavedStrategy) return "/setup";
    return "/setup?mode=blog";
}

/** @deprecated Prefer resolveWriterSetupPath with strategy + blog checks. */
export function getNewBlogSetupPath(hasExistingBlogs: boolean): string {
    return hasExistingBlogs ? "/setup?mode=blog" : "/setup?onboarding=first";
}
