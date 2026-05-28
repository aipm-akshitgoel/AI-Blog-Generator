import {
    getEntrySections,
    normalizeDirectoryEntry,
    sectionsFromRaw,
} from "@/lib/contentDirectorySections";
import type { ContentDirectoryEntry, KeywordStrategy, StrategySession, TopicOption } from "@/lib/types/strategy";

export type BlogTitleRef = { title: string; slug: string; status?: string };

function normalizeTitle(s: string): string {
    return s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/^-|-$/g, "");
}

/** Mark directory rows that already have a matching published or draft blog. */
export function applyBlogCompletionToDirectory(
    entries: ContentDirectoryEntry[],
    blogs: BlogTitleRef[],
): ContentDirectoryEntry[] {
    return entries.map((entry) => {
        const normalized = normalizeDirectoryEntry(entry);
        const entryNorm = normalizeTitle(normalized.h1);
        const entrySlug = slugify(entry.h1);
        const match = blogs.find((b) => {
            const t = normalizeTitle(b.title);
            return t === entryNorm || b.slug === entrySlug || normalizeTitle(b.slug.replace(/-/g, " ")) === entryNorm;
        });
        if (!match) return { ...normalized, completed: false, completedSlug: undefined, completedTitle: undefined };
        return {
            ...normalized,
            completed: true,
            completedSlug: match.slug,
            completedTitle: match.title,
        };
    });
}

export function directoryToTopicOptions(entries: ContentDirectoryEntry[]): TopicOption[] {
    return [...entries]
        .sort((a, b) => a.order - b.order)
        .map((entry) => {
            const normalized = normalizeDirectoryEntry(entry);
            const sections = getEntrySections(normalized);
            const h2Titles = sections.map((s) => s.h2);
            const h3Titles = sections.flatMap((s) => s.h3s);
            return {
                title: normalized.h1,
                description:
                    h2Titles.length > 0
                        ? `H2 outline: ${h2Titles.join(" · ")}`
                        : "No H2s listed — add sections during drafting.",
                primaryKeyword: normalized.primaryKeyword?.trim() || undefined,
                sections: sections.length > 0 ? sections : undefined,
                h2Titles: h2Titles.length > 0 ? h2Titles : undefined,
                secondaryKeywords: normalized.secondaryKeywords?.length
                    ? [...normalized.secondaryKeywords]
                    : undefined,
                h3Titles: h3Titles.length > 0 ? h3Titles : undefined,
                tertiaryKeywords: normalized.tertiaryKeywords?.length
                    ? [...normalized.tertiaryKeywords]
                    : undefined,
                directoryId: normalized.id,
                priority: normalized.order,
                completed: normalized.completed,
                completedSlug: normalized.completedSlug,
                cannibalizationRisk: false,
            };
        });
}

export function buildManualStrategySession(input: {
    primaryKeyword: string;
    directory: ContentDirectoryEntry[];
    businessContextId?: string;
    platform?: "blog" | "linkedin";
}): StrategySession {
    const directory = applyBlogCompletionToDirectory(input.directory, []);
    const topicOptions = directoryToTopicOptions(directory);
    const strategyPrimary =
        input.primaryKeyword.trim() ||
        directory.find((e) => e.primaryKeyword?.trim())?.primaryKeyword?.trim() ||
        "";

    return {
        businessContextId: input.businessContextId ?? "",
        platform: input.platform ?? "blog",
        keywordStrategy: {
            primaryKeyword: strategyPrimary,
            secondaryKeywords: [],
            searchIntent: "informational",
            strategySource: "manual",
            contentDirectory: directory,
        },
        topicOptions,
        status: "pending_review",
    };
}

export function enrichStrategyWithBlogProgress(
    session: StrategySession,
    blogs: BlogTitleRef[],
): StrategySession {
    const directory = session.keywordStrategy.contentDirectory;
    if (!directory?.length) {
        return {
            ...session,
            topicOptions: session.topicOptions.map((t) => {
                const match = blogs.find(
                    (b) =>
                        normalizeTitle(b.title) === normalizeTitle(t.title) ||
                        b.slug === slugify(t.title),
                );
                if (!match) return t;
                return { ...t, completed: true, completedSlug: match.slug };
            }),
        };
    }

    const updatedDirectory = applyBlogCompletionToDirectory(directory, blogs);
    return {
        ...session,
        keywordStrategy: {
            ...session.keywordStrategy,
            contentDirectory: updatedDirectory,
        },
        topicOptions: directoryToTopicOptions(updatedDirectory),
    };
}

export function getDirectoryFromSession(session: StrategySession | null | undefined): ContentDirectoryEntry[] {
    const dir = session?.keywordStrategy?.contentDirectory;
    if (Array.isArray(dir) && dir.length > 0) return dir;

    const topics = session?.topicOptions;
    if (!Array.isArray(topics) || topics.length === 0) return [];

    return topics.map((t, i) =>
        normalizeDirectoryEntry({
            id: t.directoryId ?? `legacy-${i}`,
            order: t.priority ?? i,
            h1: t.title,
            primaryKeyword: t.primaryKeyword?.trim() || undefined,
            sections: t.sections?.length ? t.sections : undefined,
            h2s: t.h2Titles?.length ? [...t.h2Titles] : parseH2FromDescription(t.description),
            secondaryKeywords: t.secondaryKeywords?.length ? [...t.secondaryKeywords] : undefined,
            h3s: t.h3Titles?.length ? [...t.h3Titles] : undefined,
            tertiaryKeywords: t.tertiaryKeywords?.length ? [...t.tertiaryKeywords] : undefined,
            completed: t.completed,
            completedSlug: t.completedSlug,
            completedTitle: t.title,
        }),
    );
}

export function isManualKeywordStrategy(session: StrategySession | null | undefined): boolean {
    return session?.keywordStrategy?.strategySource === "manual";
}

function parseH2List(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.map((h) => String(h ?? "").trim()).filter(Boolean).slice(0, 12);
}

function mapRawDirectoryRow(r: Record<string, unknown>, i: number): ContentDirectoryEntry {
    const secondaryKeywords = parseH2List(r.secondaryKeywords);
    const tertiaryKeywords = parseH2List(r.tertiaryKeywords);
    const h2s = parseH2List(r.h2s ?? r.h2Titles ?? r.h2);
    const flatH3s = parseH2List(r.h3s ?? r.h3Titles);
    const sections = sectionsFromRaw(r.sections, h2s);
    return normalizeDirectoryEntry({
        id: String(r.id ?? `ai-${i}`),
        order: typeof r.order === "number" ? r.order : i,
        h1: String(r.h1 ?? r.title ?? r.h1Title ?? "").trim(),
        primaryKeyword: String(r.primaryKeyword ?? "").trim() || undefined,
        sections: sections.length > 0 ? sections : undefined,
        h2s,
        h3s: flatH3s.length > 0 ? flatH3s : undefined,
        ...(secondaryKeywords.length ? { secondaryKeywords } : {}),
        ...(tertiaryKeywords.length ? { tertiaryKeywords } : {}),
    });
}

function parseH2FromDescription(description: string): string[] {
    const m = description.match(/H2 outline:\s*(.+)/i);
    if (!m) return [];
    return m[1]
        .split(/[·•|]/)
        .map((s) => s.trim())
        .filter(Boolean);
}

/** Normalize AI or legacy strategy JSON into primary keyword + H1/H2 directory. */
export function normalizeBlogStrategyResponse(
    raw: Record<string, unknown>,
    opts?: { businessContextId?: string; referenceDomain?: string },
): StrategySession {
    const ks = (raw.keywordStrategy as Record<string, unknown> | undefined) ?? {};
    const primaryKeyword = String(ks.primaryKeyword ?? raw.primaryKeyword ?? "").trim();
    const searchIntent = (ks.searchIntent as KeywordStrategy["searchIntent"]) || "informational";

    let directory: ContentDirectoryEntry[] = [];

    const fromKsDir = ks.contentDirectory;
    const fromRootDir = raw.contentDirectory;
    if (Array.isArray(fromKsDir) && fromKsDir.length > 0) {
        directory = fromKsDir.map((row, i) => {
            const r = row as Record<string, unknown>;
            return mapRawDirectoryRow(r, i);
        });
    } else if (Array.isArray(fromRootDir) && fromRootDir.length > 0) {
        directory = fromRootDir.map((row, i) => {
            const r = row as Record<string, unknown>;
            return mapRawDirectoryRow(r, i);
        });
    } else if (Array.isArray(raw.topicOptions)) {
        directory = (raw.topicOptions as Record<string, unknown>[]).map((t, i) => {
            const h2s = (() => {
                const fromTitles = parseH2List(t.h2Titles);
                if (fromTitles.length > 0) return fromTitles;
                return parseH2FromDescription(String(t.description ?? ""));
            })();
            return mapRawDirectoryRow(
                {
                    ...t,
                    h1: t.title,
                    h2s,
                    h3s: t.h3Titles,
                },
                i,
            );
        });
    }

    directory = directory
        .filter((e) => e.h1.length > 0)
        .map((e, i) =>
            normalizeDirectoryEntry({
                ...e,
                order: typeof e.order === "number" ? e.order : i,
                primaryKeyword: e.primaryKeyword?.trim() || primaryKeyword || undefined,
            }),
        );

    const resolvedPrimary =
        primaryKeyword ||
        directory.find((e) => e.primaryKeyword?.trim())?.primaryKeyword?.trim() ||
        "";

    const keywordStrategy: KeywordStrategy = {
        primaryKeyword: resolvedPrimary,
        secondaryKeywords: [],
        searchIntent,
        strategySource: "ai",
        contentDirectory: directory,
    };

    const topicOptions = directoryToTopicOptions(directory);

    return {
        businessContextId: opts?.businessContextId ?? String(raw.businessContextId ?? ""),
        platform: "blog",
        referenceDomain: opts?.referenceDomain,
        keywordStrategy,
        topicOptions,
        trendingTopics: Array.isArray(raw.trendingTopics) ? (raw.trendingTopics as string[]) : undefined,
        inspiration: Array.isArray(raw.inspiration) ? (raw.inspiration as StrategySession["inspiration"]) : undefined,
        status: "pending_review",
    };
}

/** Keep topicOptions in sync when persisting a session that has a content directory. */
export function syncSessionFromDirectory(session: StrategySession): StrategySession {
    const directory = getDirectoryFromSession(session);
    if (!directory.length) return session;
    return {
        ...session,
        keywordStrategy: {
            ...session.keywordStrategy,
            contentDirectory: directory,
        },
        topicOptions: directoryToTopicOptions(directory),
    };
}
