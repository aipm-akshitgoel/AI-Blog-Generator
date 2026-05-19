import type { FactSource } from "@/lib/types/factSource";
import { autoDetectFactSources } from "@/lib/factDetection";
import {
    enrichFactSourcesWithCatalog,
    isVagueSourceLabel,
    type ReferenceCatalogEntry,
} from "@/lib/referenceCatalog";

export function normalizeFactSourcesFromModel(
    raw: unknown,
    contentMarkdown: string,
    catalog: ReferenceCatalogEntry[] = [],
): FactSource[] {
    if (!Array.isArray(raw)) return [];

    const content = String(contentMarkdown || "");
    const out: FactSource[] = [];
    const seen = new Set<string>();

    for (const item of raw) {
        if (!item || typeof item !== "object") continue;
        const row = item as Record<string, unknown>;
        const excerpt = String(row.excerpt || "").trim();
        let source = String(row.source || "").trim();
        if (excerpt.length < 6 || !source) continue;
        if (isVagueSourceLabel(source)) {
            if (!catalog.length) continue;
            source = catalog[0].publisher;
        }

        const key = excerpt.toLowerCase();
        if (seen.has(key)) continue;

        const inContent =
            content.includes(excerpt) ||
            content.toLowerCase().includes(key);
        if (!inContent) continue;

        seen.add(key);
        out.push({
            id: String(row.id || `fact-${out.length + 1}`),
            excerpt,
            source,
            url: row.url ? String(row.url).trim() : undefined,
            startIndex:
                typeof row.startIndex === "number" ? row.startIndex : undefined,
            endIndex: typeof row.endIndex === "number" ? row.endIndex : undefined,
        });
    }

    return enrichFactSourcesWithCatalog(out, catalog);
}

/** Prefer citations created at draft generation; add optimizer-only extras. */
export function mergeFactSources(
    generationSources: FactSource[] | undefined,
    optimizedSources: FactSource[] | undefined,
    contentMarkdown: string,
): FactSource[] {
    const gen = (generationSources || []).filter((f) =>
        contentMarkdown.includes(f.excerpt),
    );
    const merged = [...gen];
    const seen = new Set(gen.map((f) => f.excerpt.toLowerCase()));

    for (const f of optimizedSources || []) {
        if (!f.excerpt || seen.has(f.excerpt.toLowerCase())) continue;
        if (!contentMarkdown.includes(f.excerpt)) continue;
        seen.add(f.excerpt.toLowerCase());
        merged.push({ ...f, id: f.id || `fact-${merged.length + 1}` });
    }

    return merged;
}

export function resolveFactSourcesForContent(
    contentMarkdown: string,
    options: {
        fromGeneration?: FactSource[];
        fromOptimizer?: FactSource[];
        allowHeuristicFallback?: boolean;
    },
): FactSource[] {
    const merged = mergeFactSources(
        options.fromGeneration,
        options.fromOptimizer,
        contentMarkdown,
    );
    if (merged.length > 0) return merged;
    if (options.allowHeuristicFallback) {
        return autoDetectFactSources(contentMarkdown);
    }
    return [];
}
