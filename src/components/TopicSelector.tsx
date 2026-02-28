"use client";

import { useState, useEffect } from "react";
import type { TopicOption, StrategySession } from "@/lib/types/strategy";
import type { BusinessContext } from "@/lib/types/businessContext";

interface TopicSelectorProps {
    strategy: StrategySession;
    onSelect: (topic: TopicOption) => void;
    businessContext?: BusinessContext | null;
    onAutoPublish?: (topics: TopicOption[], count: number) => any;
    mode?: "batch" | "manual";
}

export function TopicSelector({ strategy, onSelect, businessContext, onAutoPublish, mode = "batch" }: TopicSelectorProps) {
    const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
    const [topics, setTopics] = useState<TopicOption[]>(strategy.topicOptions ?? []);
    const [editingIdx, setEditingIdx] = useState<number | null>(null);
    const [editDraft, setEditDraft] = useState<{ title: string; description: string } | null>(null);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [customPrompt, setCustomPrompt] = useState("");

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
        setEditDraft({ title: topics[i].title, description: topics[i].description });
        setSelectedIndices(prev => prev.filter(idx => idx !== i));
    };

    const handleSaveEdit = (i: number) => {
        if (!editDraft) return;
        setTopics(prev => prev.map((t, idx) =>
            idx === i ? { ...t, title: editDraft.title, description: editDraft.description } : t
        ));
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
            if (!res.ok) throw new Error(json.error ?? "Failed to regenerate topics");
            setTopics(json.data?.topicOptions ?? topics);
        } catch (e: any) {
            alert(e.message);
        } finally {
            setIsRegenerating(false);
        }
    };

    const canAutoGenerate = selectedIndices.length === batchCount;

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

            <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-3">
                    {mode === "batch" ? `2. Pick Your ${batchCount} Topic${batchCount > 1 ? 's' : ''}` : "Select Your Topic"}
                    {selectedIndices.length > 0 && mode === "batch" && (
                        <span className="text-amber-500 font-black">({selectedIndices.length}/{batchCount} selected)</span>
                    )}
                </h3>
                {businessContext && (
                    <div className="flex items-center gap-4">
                        <input
                            type="text"
                            value={customPrompt}
                            onChange={(e) => setCustomPrompt(e.target.value)}
                            placeholder="Custom topic direction..."
                            className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder:text-neutral-600 w-48 transition-all"
                        />
                        <button
                            type="button"
                            onClick={handleRegenerate}
                            disabled={isRegenerating}
                            className="text-xs font-bold text-neutral-500 hover:text-emerald-400 flex items-center gap-2 transition-colors group"
                        >
                            <svg className={`w-3.5 h-3.5 transition-transform group-hover:rotate-180 ${isRegenerating ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Refresh
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 mb-8">
                {topics.map((topic, i) => {
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
                                        value={editDraft.description}
                                        onChange={e => setEditDraft(d => d ? { ...d, description: e.target.value } : d)}
                                        rows={2}
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

                    return (
                        <div
                            key={i}
                            onClick={() => handleTopicClick(i)}
                            className={`cursor-pointer group relative rounded-2xl border p-5 transition-all duration-300 ${isSelected
                                ? 'border-amber-500 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.1)] ring-1 ring-amber-500/50'
                                : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700 hover:bg-neutral-900/50'
                                }`}
                        >
                            {/* Selection order badge */}
                            {isSelected && (
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

                            <h3 className={`text-sm font-black uppercase tracking-tight pr-6 transition-colors ${isSelected ? 'text-amber-400' : 'text-neutral-200 group-hover:text-white'}`}>
                                {topic.title}
                            </h3>
                            <p className={`mt-2 text-xs line-clamp-2 leading-relaxed font-medium transition-colors ${isSelected ? 'text-neutral-300' : 'text-neutral-500 group-hover:text-neutral-400'}`}>
                                {topic.description}
                            </p>
                        </div>
                    );
                })}
            </div>

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
                    <button
                        onClick={() => selectedIndices.length > 0 && onSelect(topics[selectedIndices[0]])}
                        disabled={selectedIndices.length === 0 || editingIdx !== null}
                        className="flex-1 flex items-center justify-center gap-3 rounded-2xl bg-emerald-600 px-8 py-5 text-sm font-black text-white transition-all hover:bg-emerald-500 shadow-2xl shadow-emerald-900/40 active:scale-[0.98] uppercase tracking-widest"
                    >
                        Start Writing
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
}
