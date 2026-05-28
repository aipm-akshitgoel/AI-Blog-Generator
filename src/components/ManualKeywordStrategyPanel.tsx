"use client";

import { useCallback, useEffect, useState } from "react";
import type { StrategySession } from "@/lib/types/strategy";
import { applyBlogCompletionToDirectory, buildManualStrategySession } from "@/lib/contentDirectory";
import { parseKeywordPlanFile } from "@/lib/parseKeywordPlanSpreadsheet";
import type { ContentDirectoryEntry } from "@/lib/types/strategy";
import { ContentDirectoryList } from "@/components/ContentDirectoryList";
import { CtaButton } from "@/components/ui/CtaButton";

interface ManualKeywordStrategyPanelProps {
    businessContextId?: string;
    onApprove: (session: StrategySession) => void;
    onBack?: () => void;
    onSkip?: () => void;
}

export function ManualKeywordStrategyPanel({
    businessContextId,
    onApprove,
    onBack,
    onSkip,
}: ManualKeywordStrategyPanelProps) {
    const [legacyPrimaryKeyword, setLegacyPrimaryKeyword] = useState("");
    const [entries, setEntries] = useState<ContentDirectoryEntry[]>([]);
    const [needsLegacyPrimary, setNeedsLegacyPrimary] = useState(false);
    const [fileError, setFileError] = useState<string | null>(null);
    const [isParsing, setIsParsing] = useState(false);
    const [blogsLoaded, setBlogsLoaded] = useState(false);

    const refreshCompletion = useCallback(async (list: ContentDirectoryEntry[]) => {
        try {
            const res = await fetch("/api/blog");
            if (!res.ok) return list;
            const json = await res.json();
            const blogs = Array.isArray(json.blogs)
                ? json.blogs.map((b: { title?: string; slug?: string }) => ({
                      title: String(b.title || ""),
                      slug: String(b.slug || ""),
                  }))
                : [];
            return applyBlogCompletionToDirectory(list, blogs);
        } catch {
            return list;
        }
    }, []);

    useEffect(() => {
        if (entries.length === 0 || blogsLoaded) return;
        void (async () => {
            const enriched = await refreshCompletion(entries);
            setEntries(enriched);
            setBlogsLoaded(true);
        })();
    }, [entries.length, blogsLoaded, refreshCompletion, entries]);

    const handleFile = async (fileList: FileList | null) => {
        if (!fileList?.length) return;
        const file = fileList[0];
        setFileError(null);
        setIsParsing(true);
        setBlogsLoaded(false);
        try {
            const parsed = await parseKeywordPlanFile(file);
            const legacy = parsed.some((e) => !e.primaryKeyword?.trim());
            setNeedsLegacyPrimary(legacy);
            const enriched = await refreshCompletion(parsed);
            setEntries(enriched);
            setBlogsLoaded(true);
        } catch (e) {
            setFileError(e instanceof Error ? e.message : "Could not read spreadsheet");
            setEntries([]);
            setNeedsLegacyPrimary(false);
        } finally {
            setIsParsing(false);
        }
    };

    const canSave =
        entries.length > 0 &&
        (!needsLegacyPrimary || legacyPrimaryKeyword.trim().length > 0);

    const handleApprove = () => {
        if (entries.length === 0) {
            setFileError("Upload a spreadsheet with at least one H1 topic.");
            return;
        }
        if (needsLegacyPrimary && !legacyPrimaryKeyword.trim()) {
            setFileError("Enter a primary keyword for legacy 2-column spreadsheets, or use the 6-column template with column B filled per row.");
            return;
        }
        const session = buildManualStrategySession({
            primaryKeyword: legacyPrimaryKeyword.trim(),
            directory: entries,
            businessContextId,
            platform: "blog",
        });
        onApprove({ ...session, status: "approved" });
    };

    const completedCount = entries.filter((e) => e.completed).length;

    return (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 shadow-xl animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-900/30 text-emerald-400 border border-emerald-800/50">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white uppercase tracking-tighter">Manual keyword strategy</h2>
                        <p className="text-xs text-neutral-400 font-medium max-w-lg mt-1 leading-relaxed">
                            Upload a spreadsheet with one row per blog topic. H1 and primary keyword are required per row; H2s, secondary keywords, H3s, and tertiary keywords are optional. Row order = publishing priority.
                        </p>
                    </div>
                </div>
                {onBack && (
                    <button
                        type="button"
                        onClick={onBack}
                        className="text-[10px] font-black text-neutral-500 hover:text-white uppercase tracking-widest shrink-0"
                    >
                        ← AI keyword strategy
                    </button>
                )}
            </div>

            <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">
                Content directory (.xlsx, .xls, .csv)
            </label>
            <label className="mb-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-700 bg-neutral-950/50 px-6 py-8 hover:border-emerald-500/50 transition-colors">
                <input
                    type="file"
                    accept=".xlsx,.xls,.csv,.tsv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                    className="hidden"
                    onChange={(e) => void handleFile(e.target.files)}
                />
                <svg className="w-8 h-8 text-neutral-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm font-medium text-neutral-300">
                    {isParsing ? "Reading file…" : "Drop Excel/CSV or click to upload"}
                </p>
                <p className="text-[11px] text-neutral-500 mt-2 text-center max-w-lg leading-relaxed">
                    <span className="text-neutral-400">Required:</span> A = H1 · B = primary keyword
                    <br />
                    <span className="text-neutral-400">Optional:</span> C = H2s · D = secondary · E = H3s per H2 · F = tertiary
                    <br />
                    <span className="text-neutral-600">C &amp; F: comma or semicolon. E: use | between H2 groups, ; within a group.</span>
                </p>
            </label>

            {needsLegacyPrimary && (
                <div className="mb-6">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">
                        Primary keyword (legacy 2-column file)
                    </label>
                    <input
                        type="text"
                        value={legacyPrimaryKeyword}
                        onChange={(e) => setLegacyPrimaryKeyword(e.target.value)}
                        placeholder="e.g. online MBA India"
                        className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500"
                    />
                    <p className="text-[10px] text-neutral-500 mt-1.5">
                        Your file uses the older A = H1, B = H2s layout. Add a single primary keyword here, or re-upload with column B as primary keyword per row.
                    </p>
                </div>
            )}

            {fileError && <p className="text-xs text-amber-400 mb-4">{fileError}</p>}

            {entries.length > 0 && (
                <div className="mb-6">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                            Official directory · {entries.length} topics
                        </span>
                        <span className="text-[10px] font-bold text-neutral-500">
                            {completedCount} published / draft matched
                        </span>
                    </div>
                    <ContentDirectoryList
                        entries={entries}
                        variant="review"
                    />
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-neutral-800">
                <CtaButton
                    type="button"
                    onClick={handleApprove}
                    loading={isParsing}
                    loadingLabel="Reading spreadsheet…"
                    disabled={!canSave}
                    className="flex-1 rounded-lg px-4 py-3 text-xs disabled:opacity-40"
                >
                    Save keyword strategy &amp; directory
                </CtaButton>
                {onSkip && (
                    <button
                        type="button"
                        onClick={onSkip}
                        className="rounded-lg border border-neutral-700 px-4 py-3 text-xs font-bold uppercase tracking-widest text-neutral-400 hover:text-white"
                    >
                        Skip
                    </button>
                )}
            </div>
        </div>
    );
}
