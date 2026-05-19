"use client";

import { useState, useEffect, useMemo } from "react";
import type { TopicOption, StrategySession } from "@/lib/types/strategy";
import type { BusinessContext } from "@/lib/types/businessContext";
import { directoryToTopicOptions, getDirectoryFromSession, normalizeBlogStrategyResponse } from "@/lib/contentDirectory";
import { CtaButton } from "@/components/ui/CtaButton";

const PAGE_SIZE = 4;

interface TopicSelectorProps {
    strategy: StrategySession;
    onSelect: (topic: TopicOption) => void;
    businessContext?: BusinessContext | null;
    onAutoPublish?: (topics: TopicOption[], count: number) => any;
    mode?: "batch" | "manual";
    /** Focus review: hide posts already drafted or published */
    excludeCompleted?: boolean;
    onCustomTopic?: () => void;
}

export function TopicSelector({
    strategy,
    onSelect,
    businessContext,
    onAutoPublish,
    mode = "batch",
    excludeCompleted = false,
    onCustomTopic,
}: TopicSelectorProps) {
    const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
    const initialTopics = directoryToTopicOptions(getDirectoryFromSession(strategy));
    const [topics, setTopics] = useState<TopicOption[]>(
        initialTopics.length > 0 ? initialTopics : strategy.topicOptions ?? [],
    );
    const [editingIdx, setEditingIdx] = useState<number | null>(null);
    const [editDraft, setEditDraft] = useState<{ title: string; h2Text: string } | null>(null);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [customPrompt, setCustomPrompt] = useState("");
    const [page, setPage] = useState(0);

    // Batch selection state
    const [batchCount, setBatchCount] = useState(mode === "manual" ? 1 : 1);

    // Sync batch count if mode changes
    useEffect(() => {
        if (mode === "manual") {
            setBatchCount(1);
        }
    }, [mode]);

    // Sync selected indices when batch count changes (trim if needed)
    useEffect(() => {
        if (selectedIndices.length > batchCount) {
            setSelectedIndices(prev => prev.slice(0, batchCount));
        }
    }, [batchCount, selectedIndices.length]);

    const handleTopicClick = (i: number) => {
        if (editingIdx !== null) return;
        if (topics[i]?.completed) return;

        if (selectedIndices.includes(i)) {
            // Deselect
            setSelectedIndices(prev => prev.filter(idx => idx !== i));
        } else {
            // Select (with sliding window if at max)
            if (selectedIndices.length < batchCount) {
                setSelectedIndices(prev => [...prev, i]);
            } else {
                // Remove oldest, add new
                setSelectedIndices(prev => [...prev.slice(1), i]);
            }
        }
    };

    const handleStartEdit = (i: number, e: React.MouseEvent) => {
        e.stopPropagation(); // Don't select the card
        setEditingIdx(i);
        setEditDraft({
            title: topics[i].title,
            h2Text: (topics[i].h2Titles ?? []).join("\n"),
        });
        setSelectedIndices(prev => prev.filter(idx => idx !== i));
    };

    const handleSaveEdit = (i: number) => {
        if (!editDraft) return;
        const h2Titles = editDraft.h2Text
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);
        setTopics((prev) =>
            prev.map((t, idx) =>
                idx === i
                    ? {
                          ...t,
                          title: editDraft.title.trim(),
                          h2Titles: h2Titles.length > 0 ? h2Titles : undefined,
                          description:
                              h2Titles.length > 0
                                  ? `H2 outline: ${h2Titles.join(" · ")}`
                                  : "No H2s listed — add sections during drafting.",
                      }
                    : t,
            ),
        );
        setEditingIdx(null);
        setEditDraft(null);
    };

    const handleCancelEdit = () => {
        setEditingIdx(null);
        setEditDraft(null);
    };

    const handleRegenerate = async () => {
        if (!businessContext) return;
        setIsRegenerating(true);
        setSelectedIndices([]);
        setEditingIdx(null);
        try {
            const res = await fetch("/api/strategy-agent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ businessContext, customPrompt }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? "Failed to regenerate directory");
            const raw = json.data as Record<string, unknown>;
            const normalized = normalizeBlogStrategyResponse(raw);
            const next = directoryToTopicOptions(getDirectoryFromSession(normalized));
            if (next.length > 0) setTopics(next);
        } catch (e: any) {
            alert(e.message);
        } finally {
            setIsRegenerating(false);
        }
    };

    const canAutoGenerate = selectedIndices.length === batchCount;

    const topicRows = useMemo(() => {
        return topics
            .map((topic, index) => ({ topic, index }))
            .filter(({ topic }) => !excludeCompleted || !topic.completed);
    }, [topics, excludeCompleted]);

    const totalPages = Math.max(1, Math.ceil(topicRows.length / PAGE_SIZE));

    useEffect(() => {
        setPage(0);
    }, [topicRows.length, excludeCompleted]);

    useEffect(() => {
        if (page > totalPages - 1) setPage(Math.max(0, totalPages - 1));
    }, [page, totalPages]);

    const visibleRows = topicRows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

    return (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 shadow-xl animate-in slide-in-from-bottom-4 duration-500">
            {/* Header: Batch Selection Prioritized */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8 border-b border-neutral-800 pb-8">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-900/30 text-amber-500 border border-amber-800/50 shadow-inner">
                        {mode === "batch" ? (
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                            </svg>
                        ) : (
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        )}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white uppercase tracking-tighter">
                            {mode === "batch" ? "Content Pipeline Launchpad" : "Focus Content Studio"}
                        </h2>
                        <p className="text-xs text-neutral-400 font-medium max-w-sm">
                            {mode === "batch"
                                ? "Generate high-quality SEO drafts in bulk. Choose your volume, pick your topics, and let the AI build your queue."
                                : "Pick a topic to start your meticulous, step-by-step drafting and optimization process."
                            }
                        </p>
                    </div>
                </div>

                {mode === "batch" && (
                    <div className="flex flex-col items-end gap-2 shrink-0 bg-neutral-950 p-4 rounded-2xl border border-neutral-800/50">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-1">1. Batch Size</label>
                        <div className="flex items-center gap-1.5 flex-wrap justify-end max-w-[280px]">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                <button
                                    key={n}
                                    onClick={() => setBatchCount(n)}
                                    disabled={n > topics.length}
                                    className={`w-9 h-9 rounded-lg text-xs font-black transition-all ${batchCount === n
                                        ? 'bg-amber-500 text-neutral-900 shadow-lg shadow-amber-900/40 scale-105'
                                        : 'text-neutral-500 hover:text-white hover:bg-neutral-800'
                                        } disabled:opacity-20 active:scale-95`}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-3">
                    {mode === "batch" ? `2. Pick ${batchCount} post${batchCount > 1 ? "s" : ""} (H1)` : "Select a post (H1)"}
                    {selectedIndices.length > 0 && mode === "batch" && (
                        <span className="text-amber-500 font-black">({selectedIndices.length}/{batchCount} selected)</span>
                    )}
                </h3>
                {businessContext && (
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <input
                            type="text"
                            value={customPrompt}
                            onChange={(e) => setCustomPrompt(e.target.value)}
                            placeholder="Custom topic direction..."
                            className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder:text-neutral-600 flex-1 sm:w-80 transition-all"
                        />
                        <button
                            type="button"
                            onClick={handleRegenerate}
                            disabled={isRegenerating}
                            className="text-xs font-bold text-neutral-500 hover:text-emerald-400 flex items-center gap-2 transition-colors group shrink-0"
                        >
                            <svg className={`w-3.5 h-3.5 transition-transform group-hover:rotate-180 ${isRegenerating ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Refresh
                        </button>
                    </div>
                )}
            </div>

            {topicRows.length === 0 ? (
                <div className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-8 text-center mb-6">
                    <p className="text-sm text-neutral-300 mb-2">All posts in your directory are already drafted.</p>
                    <p className="text-xs text-neutral-500 mb-4">Add more H1s in keyword strategy, or write on a custom topic.</p>
                    {onCustomTopic && (
                        <button
                            type="button"
                            onClick={onCustomTopic}
                            className="text-sm font-bold text-emerald-500 hover:text-emerald-400 underline"
                        >
                            Enter a custom topic
                        </button>
                    )}
                </div>
            ) : (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {visibleRows.map(({ topic, index: i }) => {
                    const selectedOrder = selectedIndices.indexOf(i);
                    const isSelected = selectedOrder !== -1;
                    const isEditing = editingIdx === i;

                    if (isEditing && editDraft) {
                        return (
                            <div key={i} className="md:col-span-2 rounded-2xl border border-amber-700/60 bg-amber-950/10 p-5 animate-in zoom-in-95 duration-200">
                                <div className="space-y-3">
                                    <input
                                        autoFocus
                                        value={editDraft.title}
                                        onChange={e => setEditDraft(d => d ? { ...d, title: e.target.value } : d)}
                                        className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-amber-500 transition-colors"
                                    />
                                    <textarea
                                        value={editDraft.h2Text}
                                        onChange={e => setEditDraft(d => d ? { ...d, h2Text: e.target.value } : d)}
                                        placeholder="H2 headings, one per line"
                                        rows={3}
                                        className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-300 focus:outline-none focus:border-amber-500 resize-none"
                                    />
                                </div>
                                <div className="flex justify-end gap-4 mt-4">
                                    <button onClick={handleCancelEdit} className="text-xs text-neutral-500 font-bold hover:text-white uppercase tracking-widest">Discard</button>
                                    <button onClick={() => handleSaveEdit(i)} className="rounded-lg bg-amber-500 px-6 py-2 text-xs font-black text-neutral-900 uppercase tracking-widest hover:bg-amber-400">Save Topic</button>
                                </div>
                            </div>
                        );
                    }

                    const isDone = topic.completed;
                    return (
                        <div
                            key={topic.directoryId ?? i}
                            onClick={() => handleTopicClick(i)}
                            className={`group relative rounded-2xl border p-5 transition-all duration-300 ${
                                isDone
                                    ? "border-emerald-500/30 bg-emerald-950/15 opacity-80 cursor-default"
                                    : isSelected
                                      ? "cursor-pointer border-amber-500 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.1)] ring-1 ring-amber-500/50"
                                      : "cursor-pointer border-neutral-800 bg-neutral-950 hover:border-neutral-700 hover:bg-neutral-900/50"
                            }`}
                        >
                            {isDone && (
                                <div className="absolute -top-2 -left-2 flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-neutral-900 shadow-xl border border-emerald-400/50">
                                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            )}
                            {/* Selection order badge */}
                            {isSelected && !isDone && (
                                <div className="absolute -top-2 -left-2 flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-xs font-black text-neutral-900 shadow-xl border border-amber-400/50 animate-in zoom-in-50 duration-200">
                                    {selectedOrder + 1}
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={(e) => handleStartEdit(i, e)}
                                className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-neutral-600 hover:text-neutral-300 p-1"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5M16.586 3.586a2 2 0 112.828 2.828l-8.485 8.485-3 1-1-3 8.485-8.485z" />
                                </svg>
                            </button>

                            <h3 className={`text-sm font-black uppercase tracking-tight pr-6 transition-colors ${isDone ? 'text-emerald-400/90' : isSelected ? 'text-amber-400' : 'text-neutral-200 group-hover:text-white'}`}>
                                {topic.title}
                                {isDone && <span className="ml-2 text-[9px] font-bold text-emerald-500/80 normal-case">Written</span>}
                            </h3>
                            {topic.h2Titles && topic.h2Titles.length > 0 ? (
                                <ul className={`mt-2 space-y-0.5 text-xs leading-relaxed ${isSelected ? 'text-neutral-300' : 'text-neutral-500'}`}>
                                    {topic.h2Titles.slice(0, 4).map((h2) => (
                                        <li key={h2} className="pl-2 border-l border-neutral-800">{h2}</li>
                                    ))}
                                    {topic.h2Titles.length > 4 && (
                                        <li className="text-neutral-600">+{topic.h2Titles.length - 4} more</li>
                                    )}
                                </ul>
                            ) : (
                                <p className="mt-2 text-xs text-neutral-600 italic">No H2s in plan</p>
                            )}
                        </div>
                    );
                })}
            </div>

            {topicRows.length > PAGE_SIZE && (
                <div className="flex items-center justify-between gap-3 mb-8 border-t border-neutral-800/80 pt-4">
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
                        {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, topicRows.length)} of {topicRows.length}
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
            </>
            )}

            {topicRows.length > 0 && onCustomTopic && mode === "manual" && (
                <p className="text-center text-xs text-neutral-500 -mt-4 mb-6">
                    <button
                        type="button"
                        onClick={onCustomTopic}
                        className="text-emerald-500/80 hover:text-emerald-400 underline font-medium"
                    >
                        Enter a custom topic instead
                    </button>
                </p>
            )}

            <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-neutral-800">
                {mode === "batch" ? (
                    <>
                        <button
                            onClick={() => {
                                if (!canAutoGenerate) return;
                                const ordered = selectedIndices.map(idx => topics[idx]);
                                onAutoPublish?.(ordered, batchCount);
                            }}
                            disabled={!canAutoGenerate || editingIdx !== null}
                            className="w-full flex items-center justify-center gap-3 rounded-2xl bg-amber-500 px-8 py-5 text-sm font-black text-neutral-900 transition-all hover:bg-amber-400 disabled:opacity-20 disabled:grayscale uppercase tracking-widest active:scale-[0.98] shadow-2xl shadow-amber-900/40"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                            </svg>
                            Start Batch Generation ({selectedIndices.length}/{batchCount})
                        </button>
                    </>
                ) : (
                    <CtaButton
                        onClick={() => selectedIndices.length > 0 && onSelect(topics[selectedIndices[0]])}
                        disabled={selectedIndices.length === 0 || editingIdx !== null}
                        className="flex-1 rounded-2xl px-8 py-5 text-sm shadow-2xl shadow-emerald-900/40"
                        trailingIcon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        }
                    >
                        Continue
                    </CtaButton>
                )}
            </div>
        </div>
    );
}
