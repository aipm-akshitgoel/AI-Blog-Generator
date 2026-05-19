"use client";

import { useEffect, useState } from "react";
import type { ContentDirectoryEntry } from "@/lib/types/strategy";

const PAGE_SIZE = 4;

interface ContentDirectoryListProps {
    entries: ContentDirectoryEntry[];
    /** Use compact cards (strategy review) vs dashboard spacing */
    variant?: "review" | "dashboard";
}

export function ContentDirectoryList({ entries, variant = "review" }: ContentDirectoryListProps) {
    const [page, setPage] = useState(0);
    const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));

    useEffect(() => {
        setPage(0);
    }, [entries.length]);

    useEffect(() => {
        if (page > totalPages - 1) setPage(Math.max(0, totalPages - 1));
    }, [page, totalPages]);

    const pageEntries = entries.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
    const cardClass =
        variant === "dashboard"
            ? "rounded-2xl border p-5"
            : "rounded-xl border p-4";

    return (
        <div>
            <div className="space-y-3" role="list" aria-label="Content directory">
                {pageEntries.map((entry, i) => {
                    const index = page * PAGE_SIZE + i;
                    return (
                        <div
                            key={entry.id}
                            role="listitem"
                            className={`${cardClass} ${
                                entry.completed
                                    ? "border-emerald-500/30 bg-emerald-950/20"
                                    : variant === "dashboard"
                                      ? "border-neutral-800/50 bg-neutral-950/40"
                                      : "border-neutral-900 bg-neutral-950/35"
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                <span
                                    className="mt-0.5 w-7 shrink-0 text-right text-[11px] font-mono tabular-nums text-neutral-600 select-none pointer-events-none"
                                    aria-hidden
                                >
                                    {index + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                    {variant === "dashboard" && (
                                        <p className="text-[10px] font-mono text-neutral-600 mb-1">H1</p>
                                    )}
                                    <h4
                                        className={
                                            variant === "dashboard"
                                                ? "text-sm font-black text-neutral-200 uppercase tracking-tight"
                                                : "font-bold text-neutral-200 text-sm"
                                        }
                                    >
                                        {entry.h1}
                                    </h4>
                                    {entry.h2s.length > 0 ? (
                                        <ul className="mt-2 space-y-1">
                                            {entry.h2s.map((h2) => (
                                                <li
                                                    key={h2}
                                                    className="text-xs text-neutral-400 font-medium pl-3 border-l border-neutral-800"
                                                >
                                                    {h2}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="mt-1 text-xs text-neutral-600 italic">No H2s listed</p>
                                    )}
                                    {entry.completed && entry.completedSlug && (
                                        <p className="mt-2 text-[10px] text-emerald-500/80 font-mono">
                                            /blog/{entry.completedSlug}
                                        </p>
                                    )}
                                </div>
                                {entry.completed && (
                                    <span className="shrink-0 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-400 select-none pointer-events-none">
                                        Written
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {entries.length > PAGE_SIZE && (
                <div className="flex items-center justify-between gap-3 pt-4 border-t border-neutral-800/80 mt-4">
                    <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={page === 0}
                        className="rounded-lg border border-neutral-800 px-3 py-1.5 text-xs font-bold text-neutral-400 hover:text-white hover:border-neutral-600 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    >
                        Previous
                    </button>
                    <span className="text-xs text-neutral-500 font-medium tabular-nums">
                        Page {page + 1} of {totalPages}
                        <span className="text-neutral-600"> · </span>
                        {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, entries.length)} of {entries.length}
                    </span>
                    <button
                        type="button"
                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1}
                        className="rounded-lg border border-neutral-800 px-3 py-1.5 text-xs font-bold text-neutral-400 hover:text-white hover:border-neutral-600 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}
