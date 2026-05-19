import type { BlogPost } from "@/lib/types/content";
import type { OptimizedContent } from "@/lib/types/optimization";
import type { InterlinkingRules } from "@/lib/types/contentSpec";
import type { BusinessContext } from "@/lib/types/businessContext";
import { applyInterlinkingToContent, deriveApprovedLinks } from "@/lib/interlinking";

/** Server `maxDuration` for `/api/optimize-content` (seconds). */
export const OPTIMIZE_SERVER_MAX_DURATION_SEC = 300;

/** Azure completion race on the server — stay under maxDuration. */
export const OPTIMIZE_MODEL_TIMEOUT_MS = 280_000;

/** Browser fetch — slightly above model timeout so the client does not abort first. */
export const OPTIMIZE_REQUEST_TIMEOUT_MS = OPTIMIZE_MODEL_TIMEOUT_MS + 15_000;

export const BLOG_LINKS_FETCH_TIMEOUT_MS = 6_000;
const DOMAIN_LINKS_FETCH_TIMEOUT_MS = 15_000;

export function buildLocalOptimizedFallback(post: BlogPost): OptimizedContent {
    return {
        title: post.title,
        slug: post.slug,
        metaDescription: post.metaDescription,
        contentMarkdown: post.contentMarkdown,
        faqs: Array.isArray(post.faqs) ? post.faqs : [],
        internalLinks: [],
        seoScores: {
            readability: 75,
            grammar: 75,
            aiContentPercent: 20,
            originality: 96,
            actionableInsights: [
                "Optimization did not complete — review the draft manually before publishing.",
            ],
        },
        plagiarismReport: {
            isSafe: true,
            overallSimilarity: 0,
            flaggedSections: [],
        },
    };
}

export function slimBlogPostForOptimize(post: BlogPost): Pick<
    BlogPost,
    | "title"
    | "slug"
    | "metaDescription"
    | "contentMarkdown"
    | "faqs"
    | "h1Title"
    | "h2Suggestions"
    | "factSources"
> {
    return {
        title: post.title,
        slug: post.slug,
        metaDescription: post.metaDescription,
        contentMarkdown: post.contentMarkdown?.slice(0, 48_000) ?? "",
        faqs: post.faqs,
        h1Title: post.h1Title,
        h2Suggestions: post.h2Suggestions,
        factSources: post.factSources,
    };
}

async function fetchWithTimeout(
    input: RequestInfo | URL,
    init: RequestInit,
    timeoutMs: number,
    signal?: AbortSignal,
): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const onAbort = () => controller.abort();
    signal?.addEventListener("abort", onAbort);

    try {
        return await fetch(input, {
            ...init,
            signal: controller.signal,
        });
    } finally {
        clearTimeout(timeoutId);
        signal?.removeEventListener("abort", onAbort);
    }
}

export async function fetchDiscoveredDomainLinks(
    domain: string,
    signal?: AbortSignal,
): Promise<{ href: string; anchorText: string; target: "blog" | "service" | "page" }[]> {
    const trimmed = domain.trim();
    if (!trimmed) return [];
    try {
        const res = await fetchWithTimeout(
            "/api/discover-domain-links",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: trimmed }),
            },
            DOMAIN_LINKS_FETCH_TIMEOUT_MS,
            signal,
        );
        if (!res.ok) return [];
        const json = await res.json();
        return Array.isArray(json.links) ? json.links : [];
    } catch {
        return [];
    }
}

export async function fetchPublishedBlogLinks(signal?: AbortSignal): Promise<
    { href: string; anchorText: string; target: "blog" }[]
> {
    try {
        const res = await fetchWithTimeout("/api/blog", { method: "GET" }, BLOG_LINKS_FETCH_TIMEOUT_MS, signal);
        if (!res.ok) return [];
        const { blogs } = await res.json();
        return (blogs || [])
            .filter((b: { status?: string; slug?: string }) => b.status === "published" && b.slug)
            .map((b: { slug: string; title: string }) => ({
                href: `/blog/${b.slug}`,
                anchorText: b.title,
                target: "blog" as const,
            }));
    } catch {
        return [];
    }
}

export type OptimizeContentResult = {
    optimized: OptimizedContent;
    parseWarning?: string;
};

export async function requestContentOptimization(
    post: BlogPost,
    businessContext: BusinessContext,
    interlinkingRules: InterlinkingRules | null,
    options?: { isRefining?: boolean; signal?: AbortSignal },
): Promise<OptimizeContentResult> {
    const blogLinks = await fetchPublishedBlogLinks(options?.signal);
    let discoveredLinks: { href: string; anchorText: string; target: "blog" | "service" | "page" }[] = [];
    if (
        (!businessContext.internalLinks || businessContext.internalLinks.length === 0) &&
        businessContext.domain?.trim()
    ) {
        discoveredLinks = await fetchDiscoveredDomainLinks(businessContext.domain, options?.signal);
    }
    const mergedInternalLinks = [...(businessContext.internalLinks || []), ...discoveredLinks];
    const derivedLinks = deriveApprovedLinks(
        { ...businessContext, internalLinks: mergedInternalLinks },
        blogLinks,
    );
    const enrichedContext: BusinessContext = {
        ...businessContext,
        internalLinks: derivedLinks,
    };

    const res = await fetchWithTimeout(
        "/api/optimize-content",
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                blogPost: slimBlogPostForOptimize(post),
                businessContext: {
                    internalLinks: enrichedContext.internalLinks,
                    businessName: enrichedContext.businessName,
                    businessType: enrichedContext.businessType,
                    domain: enrichedContext.domain,
                    services: enrichedContext.services,
                },
                isRefining: options?.isRefining ?? false,
                interlinkingRules,
            }),
        },
        OPTIMIZE_REQUEST_TIMEOUT_MS,
        options?.signal,
    );

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(
            typeof data?.error === "string" ? data.error : `Optimization failed (${res.status})`,
        );
    }
    if (!data?.optimized) {
        throw new Error("No optimized content returned from the server.");
    }

    if (interlinkingRules?.minLinks != null && interlinkingRules.minLinks > 0) {
        const { contentMarkdown, injected } = applyInterlinkingToContent(
            data.optimized.contentMarkdown,
            enrichedContext,
            interlinkingRules,
        );
        data.optimized.contentMarkdown = contentMarkdown;
        if (injected.length > 0) {
            const existing = data.optimized.internalLinks || [];
            const seen = new Set(existing.map((l: { href: string }) => l.href));
            for (const link of injected) {
                if (!seen.has(link.href)) {
                    existing.push(link);
                    seen.add(link.href);
                }
            }
            data.optimized.internalLinks = existing;
        }
    }

    return data as OptimizeContentResult;
}

export function optimizationErrorMessage(err: unknown): string {
    if (err instanceof Error) {
        if (err.name === "AbortError") {
            return "Optimization was cancelled or took too long. Retry, or continue with your draft.";
        }
        return err.message;
    }
    return "Optimization failed. Please retry.";
}
