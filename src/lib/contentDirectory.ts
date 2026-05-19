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
        const entryNorm = normalizeTitle(entry.h1);
        const entrySlug = slugify(entry.h1);
        const match = blogs.find((b) => {
            const t = normalizeTitle(b.title);
            return t === entryNorm || b.slug === entrySlug || normalizeTitle(b.slug.replace(/-/g, " ")) === entryNorm;
        });
        if (!match) return { ...entry, completed: false, completedSlug: undefined, completedTitle: undefined };
        return {
            ...entry,
            completed: true,
            completedSlug: match.slug,
            completedTitle: match.title,
        };
    });
}

export function directoryToTopicOptions(entries: ContentDirectoryEntry[]): TopicOption[] {
    return [...entries]
        .sort((a, b) => a.order - b.order)
        .map((entry) => ({
            title: entry.h1,
            description:
                entry.h2s.length > 0
                    ? `H2 outline: ${entry.h2s.join(" · ")}`
                    : "No H2s listed — add sections during drafting.",
            h2Titles: entry.h2s.length > 0 ? [...entry.h2s] : undefined,
            directoryId: entry.id,
            priority: entry.order,
            completed: entry.completed,
            completedSlug: entry.completedSlug,
            cannibalizationRisk: false,
        }));
}

export function buildManualStrategySession(input: {
    primaryKeyword: string;
    directory: ContentDirectoryEntry[];
    businessContextId?: string;
    platform?: "blog" | "linkedin";
}): StrategySession {
    const directory = applyBlogCompletionToDirectory(input.directory, []);
    const topicOptions = directoryToTopicOptions(directory);

    return {
        businessContextId: input.businessContextId ?? "",
        platform: input.platform ?? "blog",
        keywordStrategy: {
            primaryKeyword: input.primaryKeyword.trim(),
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

    return topics.map((t, i) => ({
        id: t.directoryId ?? `legacy-${i}`,
        order: t.priority ?? i,
        h1: t.title,
        h2s: t.h2Titles?.length ? [...t.h2Titles] : parseH2FromDescription(t.description),
        completed: t.completed,
        completedSlug: t.completedSlug,
        completedTitle: t.title,
    }));
}

export function isManualKeywordStrategy(session: StrategySession | null | undefined): boolean {
    return session?.keywordStrategy?.strategySource === "manual";
}

function parseH2List(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.map((h) => String(h ?? "").trim()).filter(Boolean).slice(0, 12);
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
            return {
                id: String(r.id ?? `ai-${i}`),
                order: typeof r.order === "number" ? r.order : i,
                h1: String(r.h1 ?? r.title ?? r.h1Title ?? "").trim(),
                h2s: parseH2List(r.h2s ?? r.h2Titles ?? r.h2),
            };
        });
    } else if (Array.isArray(fromRootDir) && fromRootDir.length > 0) {
        directory = fromRootDir.map((row, i) => {
            const r = row as Record<string, unknown>;
            return {
                id: String(r.id ?? `ai-${i}`),
                order: i,
                h1: String(r.h1 ?? r.title ?? "").trim(),
                h2s: parseH2List(r.h2s ?? r.h2Titles),
            };
        });
    } else if (Array.isArray(raw.topicOptions)) {
        directory = (raw.topicOptions as Record<string, unknown>[]).map((t, i) => ({
            id: String(t.directoryId ?? `legacy-${i}`),
            order: i,
            h1: String(t.title ?? "").trim(),
            h2s: (() => {
                const fromTitles = parseH2List(t.h2Titles);
                if (fromTitles.length > 0) return fromTitles;
                return parseH2FromDescription(String(t.description ?? ""));
            })(),
        }));
    }

    directory = directory.filter((e) => e.h1.length > 0);

    const keywordStrategy: KeywordStrategy = {
        primaryKeyword,
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
