import type { BusinessContext } from "@/lib/types/businessContext";

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

export function hasUsableBusinessContext(ctx: BusinessContext | null | undefined): boolean {
    if (!ctx) return false;
    if (normalizeDomain(ctx.domain || "")) return true;
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
            businessName:
                base.businessName && base.businessName !== "Your Business"
                    ? base.businessName
                    : buildMinimalBusinessContext({ domain: host }).businessName,
        };
    }
    return base;
}

export function hasTopicSuggestions(strategy: { topicOptions?: unknown[] } | null | undefined): boolean {
    return Array.isArray(strategy?.topicOptions) && strategy.topicOptions.length > 0;
}
