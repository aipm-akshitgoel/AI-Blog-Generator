"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getEntrySections, normalizeDirectoryEntry } from "@/lib/contentDirectorySections";
import type { ContentH2Section } from "@/lib/contentDirectorySections";
import type { ContentDirectoryEntry } from "@/lib/types/strategy";
import { parseKeywordList } from "@/lib/types/contentSpec";
import { TocKeywordList } from "@/components/TocKeywordList";

const PAGE_SIZE = 4;

interface ContentDirectoryListProps {
    entries: ContentDirectoryEntry[];
    variant?: "review" | "dashboard";
    editable?: boolean;
    onEntriesChange?: (entries: ContentDirectoryEntry[]) => void;
}

function listToText(items: string[] | undefined): string {
    return (items ?? []).join("\n");
}

function keywordsDraftFromEntry(entry: ContentDirectoryEntry) {
    return {
        primaryKeyword: entry.primaryKeyword ?? "",
        secondaryText: listToText(entry.secondaryKeywords),
        tertiaryText: listToText(entry.tertiaryKeywords),
    };
}

function outlineDraftFromEntry(entry: ContentDirectoryEntry) {
    const sections = getEntrySections(entry);
    return {
        h1: entry.h1,
        sections: sections.map((s) => ({ h2: s.h2, h3Text: listToText(s.h3s) })),
    };
}

function keywordDraftEquals(
    draft: ReturnType<typeof keywordsDraftFromEntry>,
    entry: ContentDirectoryEntry,
): boolean {
    const secondary = parseKeywordList(draft.secondaryText, 20);
    const tertiary = parseKeywordList(draft.tertiaryText, 20);
    const entrySecondary = entry.secondaryKeywords ?? [];
    const entryTertiary = entry.tertiaryKeywords ?? [];
    return (
        draft.primaryKeyword.trim() === (entry.primaryKeyword?.trim() ?? "") &&
        secondary.join("\0") === entrySecondary.join("\0") &&
        tertiary.join("\0") === entryTertiary.join("\0")
    );
}

function OutlineTree({ sections }: { sections: ContentH2Section[] }) {
    if (sections.length === 0) {
        return <p className="text-xs text-neutral-600 italic">No H2 sections in plan</p>;
    }
    return (
        <ul className="space-y-3 text-xs">
            {sections.map((section) => (
                <li key={section.h2}>
                    <p className="font-bold text-neutral-300 leading-snug">{section.h2}</p>
                    {section.h3s.length > 0 && (
                        <ul className="mt-1.5 space-y-0.5 pl-3 border-l border-neutral-800">
                            {section.h3s.map((h3) => (
                                <li key={`${section.h2}-${h3}`} className="text-neutral-500">
                                    {h3}
                                </li>
                            ))}
                        </ul>
                    )}
                </li>
            ))}
        </ul>
    );
}

interface DirectoryEntryCardProps {
    entry: ContentDirectoryEntry;
    index?: number;
    variant: "review" | "dashboard";
    editable?: boolean;
    onPatch?: (id: string, patch: Partial<ContentDirectoryEntry>) => void;
}

function DirectoryEntryCard({ entry, index, variant, editable, onPatch }: DirectoryEntryCardProps) {
    const sections = getEntrySections(entry);
    const [tocOpen, setTocOpen] = useState(false);
    const [outlineEditOpen, setOutlineEditOpen] = useState(false);
    const [keywordDraft, setKeywordDraft] = useState(() => keywordsDraftFromEntry(entry));
    const [outlineDraft, setOutlineDraft] = useState(() => outlineDraftFromEntry(entry));
    const skipKeywordSave = useRef(true);
    const entryIdRef = useRef(entry.id);

    const inputClass =
        "w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500/60";

    useEffect(() => {
        if (entry.id !== entryIdRef.current) {
            entryIdRef.current = entry.id;
            skipKeywordSave.current = true;
        }
        if (tocOpen || outlineEditOpen) return;
        setKeywordDraft(keywordsDraftFromEntry(entry));
        setOutlineDraft(outlineDraftFromEntry(entry));
    }, [entry, tocOpen, outlineEditOpen]);

    const buildKeywordPatch = useCallback(() => {
        const secondaryKeywords = parseKeywordList(keywordDraft.secondaryText, 20);
        const tertiaryKeywords = parseKeywordList(keywordDraft.tertiaryText, 20);
        return normalizeDirectoryEntry({
            ...entry,
            primaryKeyword: keywordDraft.primaryKeyword.trim() || undefined,
            secondaryKeywords: secondaryKeywords.length ? secondaryKeywords : undefined,
            tertiaryKeywords: tertiaryKeywords.length ? tertiaryKeywords : undefined,
        });
    }, [entry, keywordDraft]);

    const saveKeywordsIfChanged = useCallback(() => {
        if (!editable || !onPatch || keywordDraftEquals(keywordDraft, entry)) return;
        const patch = buildKeywordPatch();
        onPatch(entry.id, patch);
    }, [editable, onPatch, keywordDraft, entry, buildKeywordPatch]);

    const saveOutlineIfChanged = useCallback(() => {
        if (!editable || !onPatch) return;
        const sectionRows: ContentH2Section[] = outlineDraft.sections
            .map((s) => ({
                h2: s.h2.trim(),
                h3s: parseKeywordList(s.h3Text, 12),
            }))
            .filter((s) => s.h2.length > 0);

        const patch = normalizeDirectoryEntry({
            ...entry,
            h1: outlineDraft.h1.trim() || entry.h1,
            sections: sectionRows,
            h2s: sectionRows.map((s) => s.h2),
            primaryKeyword: entry.primaryKeyword,
            secondaryKeywords: entry.secondaryKeywords,
            tertiaryKeywords: entry.tertiaryKeywords,
        });

        const prev = normalizeDirectoryEntry(entry);
        const unchanged =
            patch.h1 === prev.h1 &&
            JSON.stringify(patch.sections) === JSON.stringify(prev.sections);
        if (!unchanged) onPatch(entry.id, patch);
    }, [editable, onPatch, outlineDraft, entry]);

    useEffect(() => {
        if (!editable || !tocOpen) return;
        if (skipKeywordSave.current) {
            skipKeywordSave.current = false;
            return;
        }
        if (keywordDraftEquals(keywordDraft, entry)) return;
        const timer = window.setTimeout(() => saveKeywordsIfChanged(), 500);
        return () => window.clearTimeout(timer);
    }, [keywordDraft, editable, tocOpen, entry, saveKeywordsIfChanged]);

    const closeOutlineEdit = () => {
        saveOutlineIfChanged();
        setOutlineEditOpen(false);
    };

    const closeToc = () => {
        if (outlineEditOpen) closeOutlineEdit();
        else saveKeywordsIfChanged();
        setTocOpen(false);
    };

        return (
                        <div
                            role="listitem"
                            className={`rounded-2xl border p-5 ${
                                entry.completed
                    ? variant === "dashboard"
                        ? "border-emerald-500/30 bg-emerald-950/20"
                        : "border-emerald-500/30 bg-emerald-950/15"
                    : variant === "dashboard"
                      ? "border-neutral-800/50 bg-neutral-950/40"
                                    : "border-neutral-800 bg-neutral-950"
                            }`}
                        >
            <div className={variant === "dashboard" ? "flex items-start gap-3" : ""}>
                {variant === "dashboard" && index != null && (
                    <span
                        className="mt-0.5 w-7 shrink-0 text-right text-[11px] font-mono tabular-nums text-neutral-600 select-none"
                        aria-hidden
                    >
                        {index + 1}
                    </span>
                )}
                <div className="min-w-0 flex-1">
                    <div className="mb-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500/80 mb-1">
                            Primary keyword
                        </p>
                        {editable ? (
                            <input
                                type="text"
                                value={keywordDraft.primaryKeyword}
                                onChange={(e) => {
                                    setKeywordDraft((d) => ({ ...d, primaryKeyword: e.target.value }));
                                }}
                                onBlur={saveKeywordsIfChanged}
                                className={`${inputClass} text-emerald-400 border-emerald-900/40`}
                                placeholder="e.g. online degree programs in India"
                            />
                        ) : (
                            <p className="text-xs font-semibold text-emerald-400">
                                {entry.primaryKeyword?.trim() || "—"}
                            </p>
                        )}
                    </div>

                    <div className="mb-1">
                        <p className="text-[10px] font-mono text-neutral-600 mb-1">H1</p>
                        {editable ? (
                            <textarea
                                value={outlineDraft.h1}
                                onChange={(e) =>
                                    setOutlineDraft((d) => ({ ...d, h1: e.target.value }))
                                }
                                onBlur={saveOutlineIfChanged}
                                rows={2}
                                className={`${inputClass} resize-y min-h-[52px] font-black uppercase tracking-tight leading-snug`}
                                placeholder="Blog post title (H1)"
                            />
                        ) : (
                            <h4
                                className={`text-sm font-black uppercase tracking-tight pr-6 ${
                                    entry.completed ? "text-emerald-400/90" : "text-neutral-200"
                                }`}
                            >
                                {entry.h1}
                                {entry.completed && (
                                    <span className="ml-2 text-[9px] font-bold text-emerald-500/80 normal-case">
                                        Written
                                    </span>
                                )}
                            </h4>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            if (tocOpen) closeToc();
                            else setTocOpen(true);
                        }}
                        className="mt-3 flex w-full items-center justify-between gap-2 rounded-lg border border-neutral-800 bg-neutral-900/50 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-neutral-400 hover:border-neutral-700 hover:text-neutral-200 transition-colors"
                        aria-expanded={tocOpen}
                    >
                        <span>{tocOpen ? "Hide TOC" : "View TOC"}</span>
                        <svg
                            className={`w-4 h-4 shrink-0 text-neutral-500 transition-transform ${tocOpen ? "rotate-180" : ""}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {tocOpen && (
                        <div className="mt-3 space-y-3 border-t border-neutral-800/80 pt-3 animate-in fade-in duration-200">
                            <div className="space-y-2">
                                {editable ? (
                                    <>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">
                                                Secondary keywords
                                            </label>
                                            <textarea
                                                value={keywordDraft.secondaryText}
                                                onChange={(e) =>
                                                    setKeywordDraft((d) => ({
                                                        ...d,
                                                        secondaryText: e.target.value,
                                                    }))
                                                }
                                                onBlur={saveKeywordsIfChanged}
                                                rows={Math.max(2, keywordDraft.secondaryText.split("\n").length)}
                                                className={`${inputClass} resize-y min-h-[56px] leading-relaxed`}
                                                placeholder="One keyword per line"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">
                                                Tertiary keywords
                                            </label>
                                            <textarea
                                                value={keywordDraft.tertiaryText}
                                                onChange={(e) =>
                                                    setKeywordDraft((d) => ({
                                                        ...d,
                                                        tertiaryText: e.target.value,
                                                    }))
                                                }
                                                onBlur={saveKeywordsIfChanged}
                                                rows={Math.max(2, keywordDraft.tertiaryText.split("\n").length)}
                                                className={`${inputClass} resize-y min-h-[56px] leading-relaxed`}
                                                placeholder="One keyword per line"
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-3">
                                        <TocKeywordList
                                            keywords={entry.secondaryKeywords ?? []}
                                            label="Secondary keywords"
                                        />
                                        <TocKeywordList
                                            keywords={entry.tertiaryKeywords ?? []}
                                            label="Tertiary keywords"
                                        />
                                    </div>
                                )}
                            </div>

                            {!outlineEditOpen && (
                                <>
                                    <OutlineTree sections={sections} />
                                    {editable && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setOutlineDraft(outlineDraftFromEntry(entry));
                                                setOutlineEditOpen(true);
                                            }}
                                            className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 hover:text-emerald-400"
                                        >
                                            Edit outline
                                        </button>
                                    )}
                                </>
                            )}

                            {outlineEditOpen && editable && (
                                <div className="space-y-3">
                                    {outlineDraft.sections.map((sec, i) => (
                                        <div
                                            key={i}
                                            className="rounded-lg border border-neutral-800/80 bg-neutral-950/50 p-3 space-y-2"
                                        >
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500">
                                                H2 section {i + 1}
                                            </label>
                                            <input
                                                type="text"
                                                value={sec.h2}
                                                onChange={(e) => {
                                                    const next = [...outlineDraft.sections];
                                                    next[i] = { ...next[i], h2: e.target.value };
                                                    setOutlineDraft((d) => ({ ...d, sections: next }));
                                                }}
                                                className={inputClass}
                                            />
                                            <label className="block text-[10px] font-bold text-neutral-600">
                                                H3s under this H2{" "}
                                                <span className="font-normal">(one per line)</span>
                                            </label>
                                            <textarea
                                                value={sec.h3Text}
                                                onChange={(e) => {
                                                    const next = [...outlineDraft.sections];
                                                    next[i] = { ...next[i], h3Text: e.target.value };
                                                    setOutlineDraft((d) => ({ ...d, sections: next }));
                                                }}
                                                rows={2}
                                                className={`${inputClass} resize-y min-h-[48px]`}
                                            />
                                        </div>
                                    ))}
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setOutlineDraft((d) => ({
                                                    ...d,
                                                    sections: [...d.sections, { h2: "", h3Text: "" }],
                                                }))
                                            }
                                            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400 hover:text-white"
                                        >
                                            + H2 section
                                        </button>
                                        <button
                                            type="button"
                                            onClick={closeOutlineEdit}
                                            className="rounded-lg bg-neutral-800 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-300 hover:text-white"
                                        >
                                            Done
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {entry.completed && entry.completedSlug && (
                        <p className="mt-2 text-[10px] text-emerald-500/80 font-mono">/blog/{entry.completedSlug}</p>
                    )}
                </div>
                {variant === "dashboard" && entry.completed && (
                    <span className="shrink-0 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-400 select-none">
                        Written
                    </span>
                )}
            </div>
        </div>
    );
}

export function ContentDirectoryList({
    entries,
    variant = "review",
    editable = false,
    onEntriesChange,
}: ContentDirectoryListProps) {
    const [page, setPage] = useState(0);
    const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));

    useEffect(() => {
        setPage(0);
    }, [entries.length]);

    useEffect(() => {
        if (page > totalPages - 1) setPage(Math.max(0, totalPages - 1));
    }, [page, totalPages]);

    const patchEntry = (id: string, patch: Partial<ContentDirectoryEntry>) => {
        if (!onEntriesChange) return;
        onEntriesChange(
            entries.map((e) => (e.id === id ? normalizeDirectoryEntry({ ...e, ...patch }) : e)),
        );
    };

    const pageEntries = entries.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

    if (variant === "review") {
        return (
            <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4" role="list" aria-label="Content directory">
                    {pageEntries.map((entry) => (
                        <DirectoryEntryCard
                            key={entry.id}
                            entry={entry}
                            variant="review"
                            editable={editable}
                            onPatch={patchEntry}
                        />
                    ))}
                </div>
                {entries.length > PAGE_SIZE && (
                    <DirectoryPagination
                        page={page}
                        totalPages={totalPages}
                        totalItems={entries.length}
                        onPageChange={setPage}
                    />
                )}
            </div>
        );
    }

    return (
        <div>
            <div className="space-y-3" role="list" aria-label="Content directory">
                {pageEntries.map((entry, i) => {
                    const index = page * PAGE_SIZE + i;
                    return (
                        <DirectoryEntryCard
                            key={entry.id}
                            entry={entry}
                            index={index}
                            variant="dashboard"
                            editable={editable}
                            onPatch={patchEntry}
                        />
                    );
                })}
            </div>
            {entries.length > PAGE_SIZE && (
                <DirectoryPagination
                    page={page}
                    totalPages={totalPages}
                    totalItems={entries.length}
                    onPageChange={setPage}
                />
            )}
        </div>
    );
}

function DirectoryPagination({
    page,
    totalPages,
    totalItems,
    onPageChange,
}: {
    page: number;
    totalPages: number;
    totalItems: number;
    onPageChange: (updater: (p: number) => number) => void;
}) {
    return (
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-neutral-800/80 mt-4">
            <button
                type="button"
                onClick={() => onPageChange((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-lg border border-neutral-800 px-3 py-1.5 text-xs font-bold text-neutral-400 hover:text-white hover:border-neutral-600 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
                Previous
            </button>
            <span className="text-xs text-neutral-500 font-medium tabular-nums">
                Page {page + 1} of {totalPages}
                <span className="text-neutral-600"> · </span>
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalItems)} of {totalItems}
            </span>
            <button
                type="button"
                onClick={() => onPageChange((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="rounded-lg border border-neutral-800 px-3 py-1.5 text-xs font-bold text-neutral-400 hover:text-white hover:border-neutral-600 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
                Next
            </button>
        </div>
    );
}
