import type { ContentH2Section } from "@/lib/contentDirectorySections";
import { getEntrySections } from "@/lib/contentDirectorySections";
import type { ContentDirectoryEntry } from "@/lib/types/strategy";
import type { TopicOption } from "@/lib/types/strategy";
import { parseKeywordList } from "@/lib/types/contentSpec";

export type TocSectionDraft = { h2: string; h3Text: string };

export type TopicTocDraft = {
    title: string;
    primaryKeyword: string;
    secondaryText: string;
    tertiaryText: string;
    sections: TocSectionDraft[];
};

function listToText(items: string[] | undefined): string {
    return (items ?? []).join("\n");
}

export function sectionsFromTopic(topic: TopicOption): ContentH2Section[] {
    if (topic.sections?.length) {
        return topic.sections.map((s) => ({
            h2: s.h2.trim(),
            h3s: (s.h3s ?? []).map((h) => h.trim()).filter(Boolean),
        }));
    }
    const h2s = topic.h2Titles ?? [];
    const h3s = topic.h3Titles ?? [];
    const fake: ContentDirectoryEntry = {
        id: "draft",
        order: 0,
        h1: topic.title,
        h2s,
        h3s: h3s.length ? h3s : undefined,
    };
    return getEntrySections(fake);
}

export function topicToTocDraft(topic: TopicOption): TopicTocDraft {
    const sections = sectionsFromTopic(topic);
    return {
        title: topic.title,
        primaryKeyword: topic.primaryKeyword?.trim() ?? "",
        secondaryText: listToText(topic.secondaryKeywords),
        tertiaryText: listToText(topic.tertiaryKeywords),
        sections: sections.map((s) => ({ h2: s.h2, h3Text: listToText(s.h3s) })),
    };
}

export function tocDraftToTopic(base: TopicOption, draft: TopicTocDraft): TopicOption {
    const sectionRows: ContentH2Section[] = draft.sections
        .map((s) => ({
            h2: s.h2.trim(),
            h3s: parseKeywordList(s.h3Text, 16),
        }))
        .filter((s) => s.h2.length > 0);

    const h2Titles = sectionRows.map((s) => s.h2);
    const h3Titles = sectionRows.flatMap((s) => s.h3s);
    const secondaryKeywords = parseKeywordList(draft.secondaryText, 20);
    const tertiaryKeywords = parseKeywordList(draft.tertiaryText, 20);
    const title = draft.title.trim() || base.title;

    return {
        ...base,
        title,
        primaryKeyword: draft.primaryKeyword.trim() || undefined,
        sections: sectionRows.length > 0 ? sectionRows : undefined,
        h2Titles: h2Titles.length > 0 ? h2Titles : undefined,
        h3Titles: h3Titles.length > 0 ? h3Titles : undefined,
        secondaryKeywords: secondaryKeywords.length > 0 ? secondaryKeywords : undefined,
        tertiaryKeywords: tertiaryKeywords.length > 0 ? tertiaryKeywords : undefined,
        description:
            h2Titles.length > 0
                ? `H2 outline: ${h2Titles.join(" · ")}`
                : "No H2s listed — add sections during drafting.",
    };
}
