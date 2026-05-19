import type { BusinessContext } from "@/lib/types/businessContext";
import type { StrategySession, TopicOption } from "@/lib/types/strategy";
import type { TopicBrief } from "@/lib/types/topicBrief";

export type ReferenceCatalogEntry = {
    id: string;
    publisher: string;
    url: string;
};

const VAGUE_SOURCE_LABELS = new Set(
    [
        "approved topic",
        "reference",
        "program data",
        "program / industry reference",
        "topic brief",
        "seo strategy",
        "generated draft",
    ].map((s) => s.toLowerCase()),
);

/** Well-known authorities for Indian online MBA / higher-ed facts (used when no URLs in brief). */
const EDUCATION_AUTHORITY_SEEDS: ReferenceCatalogEntry[] = [
    { id: "ugc", publisher: "UGC India", url: "https://www.ugc.gov.in/" },
    { id: "aicte", publisher: "AICTE", url: "https://www.aicte-india.org/" },
    { id: "naac", publisher: "NAAC", url: "https://www.naac.gov.in/" },
];

export function extractUrlsFromText(text: string): string[] {
    const found: string[] = [];
    const re = /https?:\/\/[^\s<>"')\]]+/gi;
    for (const match of String(text || "").matchAll(re)) {
        const url = match[0].replace(/[.,;]+$/, "");
        try {
            const u = new URL(url);
            if (!found.includes(u.href)) found.push(u.href);
        } catch {
            /* skip */
        }
    }
    return found;
}

export function publisherFromUrl(url: string): string {
    try {
        const host = new URL(url).hostname.replace(/^www\./i, "");
        const base = host.split(".")[0];
        return base.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    } catch {
        return "Source";
    }
}

export function faviconUrl(url: string, size = 32): string {
    try {
        const host = new URL(url).hostname;
        return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${size}`;
    } catch {
        return "";
    }
}

export function buildReferenceCatalog(opts: {
    businessContext: BusinessContext;
    topic: TopicOption;
    topicBrief?: TopicBrief;
    strategySession?: StrategySession | null;
}): ReferenceCatalogEntry[] {
    const seen = new Set<string>();
    const out: ReferenceCatalogEntry[] = [];

    const push = (publisher: string, url: string, idPrefix: string) => {
        const normalized = url.trim();
        if (!normalized || !/^https?:\/\//i.test(normalized)) return;
        const key = normalized.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        try {
            const href = new URL(normalized).href;
            out.push({
                id: `${idPrefix}-${out.length + 1}`,
                publisher: publisher.trim() || publisherFromUrl(href),
                url: href,
            });
        } catch {
            /* skip invalid */
        }
    };

    const domain = String(opts.businessContext.domain || "").trim();
    if (domain) {
        const href = /^https?:\/\//i.test(domain) ? domain : `https://${domain}`;
        push(
            opts.businessContext.businessName?.trim() || publisherFromUrl(href),
            href,
            "business",
        );
    }

    for (const item of opts.strategySession?.inspiration || []) {
        if (item.url) push(item.title || publisherFromUrl(item.url), item.url, "inspiration");
    }

    const notes = opts.topicBrief?.userNotes || "";
    for (const url of extractUrlsFromText(notes)) {
        push(publisherFromUrl(url), url, "brief-url");
    }

    for (const file of opts.topicBrief?.supplementaryFiles || []) {
        for (const url of extractUrlsFromText(file.content || "")) {
            push(publisherFromUrl(url), url, "file-url");
        }
        const name = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
        if (file.name && !extractUrlsFromText(file.content).length) {
            /* file without URL — label only, no catalog URL */
        }
    }

    for (const seed of EDUCATION_AUTHORITY_SEEDS) {
        push(seed.publisher, seed.url, seed.id);
    }

    return out;
}

export function isVagueSourceLabel(source: string): boolean {
    return VAGUE_SOURCE_LABELS.has(source.trim().toLowerCase());
}

export function enrichFactSourcesWithCatalog(
    sources: import("@/lib/types/factSource").FactSource[],
    catalog: ReferenceCatalogEntry[],
): import("@/lib/types/factSource").FactSource[] {
    if (!catalog.length) return sources;

    const defaultEntry = catalog[0];

    return sources.map((f) => {
        let source = f.source.trim();
        let url = f.url?.trim();

        if (isVagueSourceLabel(source) || !url) {
            const byPublisher = catalog.find(
                (c) => c.publisher.toLowerCase() === source.toLowerCase(),
            );
            const match =
                byPublisher ||
                catalog.find((c) =>
                    f.excerpt.toLowerCase().includes(c.publisher.toLowerCase().split(" ")[0]),
                ) ||
                defaultEntry;
            source = match.publisher;
            url = match.url;
        }

        if (!url && defaultEntry) {
            source = defaultEntry.publisher;
            url = defaultEntry.url;
        }

        return { ...f, source, url };
    });
}

export function formatCatalogForPrompt(catalog: ReferenceCatalogEntry[]): string {
    if (!catalog.length) return "No reference URLs provided — use only facts you can tie to Author brief or Uploaded files; include url when a URL appears in those inputs.";
    return catalog
        .map((c) => `- ${c.publisher}: ${c.url}`)
        .join("\n");
}
