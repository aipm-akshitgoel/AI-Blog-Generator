import { DEFAULT_H3_PER_H2 } from "@/lib/types/contentSpec";
import type { ContentDirectoryEntry } from "@/lib/types/strategy";

/** One H2 section with nested H3 headings. */
export interface ContentH2Section {
    h2: string;
    h3s: string[];
}

function parseInlineList(raw: string): string[] {
    return String(raw || "")
        .split(/[;,\n]+/)
        .map((s) => s.trim())
        .filter(Boolean);
}

/**
 * Column E: H3s grouped by H2 — use `|` between H2 groups, `;` or `,` within a group.
 * Example: "Intro detail; Intro tip | Cost breakdown; ROI"
 */
export function parseH3GroupsForH2s(raw: string, h2Count: number): string[][] {
    if (h2Count <= 0) return [];
    if (!raw.trim()) return Array.from({ length: h2Count }, () => []);

    const groups = raw.split("|").map((g) => parseInlineList(g));
    return Array.from({ length: h2Count }, (_, i) => groups[i] ?? []);
}

/** Build sections from legacy flat h2s + h3s (sequential chunks of DEFAULT_H3_PER_H2). */
function sectionsFromFlatH2sAndH3s(h2s: string[], h3s: string[]): ContentH2Section[] {
    if (h2s.length === 0) return [];
    if (h3s.length === 0) return h2s.map((h2) => ({ h2, h3s: [] }));

    const sections: ContentH2Section[] = h2s.map((h2) => ({ h2, h3s: [] }));
    let h3Index = 0;
    for (let i = 0; i < sections.length && h3Index < h3s.length; i++) {
        const take = Math.min(DEFAULT_H3_PER_H2, h3s.length - h3Index);
        sections[i].h3s = h3s.slice(h3Index, h3Index + take);
        h3Index += take;
    }
    if (h3Index < h3s.length) {
        sections[sections.length - 1].h3s.push(...h3s.slice(h3Index));
    }
    return sections;
}

export function getEntrySections(entry: ContentDirectoryEntry): ContentH2Section[] {
    if (entry.sections?.length) {
        return entry.sections
            .map((s) => ({
                h2: s.h2.trim(),
                h3s: (s.h3s ?? []).map((h) => h.trim()).filter(Boolean),
            }))
            .filter((s) => s.h2.length > 0);
    }
    return sectionsFromFlatH2sAndH3s(entry.h2s ?? [], entry.h3s ?? []);
}

/** Keep sections, h2s, and flat h3s in sync on every read/write. */
export function normalizeDirectoryEntry(entry: ContentDirectoryEntry): ContentDirectoryEntry {
    const sections = getEntrySections(entry);
    const h2s = sections.map((s) => s.h2);
    const h3s = sections.flatMap((s) => s.h3s);
    return {
        ...entry,
        sections,
        h2s,
        h3s: h3s.length > 0 ? h3s : undefined,
    };
}

export function sectionsFromRaw(
    raw: unknown,
    fallbackH2s: string[],
): ContentH2Section[] {
    if (Array.isArray(raw) && raw.length > 0) {
        return raw
            .map((item) => {
                const r = item as Record<string, unknown>;
                const h2 = String(r.h2 ?? r.title ?? r.heading ?? "").trim();
                const h3s = Array.isArray(r.h3s)
                    ? r.h3s.map((h) => String(h ?? "").trim()).filter(Boolean)
                    : parseInlineList(String(r.h3 ?? ""));
                return { h2, h3s };
            })
            .filter((s) => s.h2.length > 0);
    }
    return sectionsFromFlatH2sAndH3s(fallbackH2s, []);
}
