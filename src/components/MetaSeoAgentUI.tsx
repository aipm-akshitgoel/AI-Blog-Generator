import { useState, useEffect } from "react";
import type { OptimizedContent } from "@/lib/types/optimization";
import type { MetaOption, MetaSeoPayload } from "@/lib/types/meta";
import { HelpTip } from "./HelpTip";

interface MetaSeoAgentProps {
    optimized: OptimizedContent;
    onComplete: (selectedOption: MetaOption) => void;
}

const CATEGORIES = [
    "Tips",
    "Guide",
    "Trends",
    "How-To",
    "Case Study",
    "Opinion",
    "News",
    "Checklist",
    "Listicle",
    "Review"
];

export function MetaSeoAgentUI({ optimized, onComplete }: MetaSeoAgentProps) {
    const [payload, setPayload] = useState<MetaSeoPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedIdx, setSelectedIdx] = useState<number>(0);
    const [selectedCategory, setSelectedCategory] = useState<string>(CATEGORIES[0]);

    // Manual editing states
    const [editedTitle, setEditedTitle] = useState("");
    const [editedDesc, setEditedDesc] = useState("");

    const fetchMetaOptions = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/meta-seo", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ optimizedContent: optimized }),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to generate Meta SEO options.");
            }

            const data = await res.json();
            setPayload(data.payload);
            setSelectedIdx(0);

            const firstOption = data.payload.options[0];
            setEditedTitle(firstOption.title);
            setEditedDesc(firstOption.description);

            // Set category based on AI suggestion if it's in our valid list
            if (firstOption.category && CATEGORIES.includes(firstOption.category)) {
                setSelectedCategory(firstOption.category);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMetaOptions();
    }, [optimized]);

    const handleSelectOption = (idx: number) => {
        setSelectedIdx(idx);
        const opt = payload?.options[idx];
        setEditedTitle(opt?.title || "");
        setEditedDesc(opt?.description || "");

        // Update category if this option has a specific one recommended
        if (opt?.category && CATEGORIES.includes(opt.category)) {
            setSelectedCategory(opt.category);
        }
    };

    const handleApply = () => {
        if (!payload) return;

        const baseOption = payload.options[selectedIdx];
        const finalOption: MetaOption = {
            ...baseOption,
            title: editedTitle,
            description: editedDesc,
            category: selectedCategory,
        };

        onComplete(finalOption);
    };

    if (loading) {
        return (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-8 shadow-xl text-center">
                <div className="mb-6 inline-flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-emerald-900/20 text-emerald-500">
                    <svg className="w-8 h-8 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                </div>
                <h3 className="text-lg font-medium text-neutral-200">Crafting Meta Attributes...</h3>
                <p className="mt-2 text-sm text-neutral-500">Enforcing character limits and generating search-friendly tags.</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-6 text-center">
                <p className="text-red-400 mb-4">{error}</p>
                <button onClick={fetchMetaOptions} className="text-xs font-bold text-red-400 underline uppercase tracking-widest">Retry Generation</button>
            </div>
        );
    }

    if (!payload || !payload.options) return null;

    return (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 shadow-xl animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-6 border-b border-neutral-800 pb-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-900/30 text-emerald-400 border border-emerald-800/50">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                            <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.158 3.71 3.71 1.159-1.157a2.625 2.625 0 000-3.711z" />
                            <path d="M10.856 7.646a2.625 2.625 0 00-3.712 0l-5.64 5.64a2.625 2.625 0 000 3.711l1.158 1.158a2.625 2.625 0 003.71 0l5.64-5.64a2.625 2.625 0 000-3.711l-1.156-1.158zm-1.856 7.23a1.5 1.5 0 11-2.122-2.122 1.5 1.5 0 012.122 2.122z" />
                        </svg>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-semibold text-neutral-100">Meta SEO Agent</h2>
                            <HelpTip text="Control how your post appears in Google. Choose an AI option or write your own." />
                        </div>
                        <p className="text-xs text-neutral-400">Optimize search snippets & tagging</p>
                    </div>
                </div>
                <button
                    onClick={fetchMetaOptions}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[10px] font-black text-neutral-300 uppercase tracking-widest transition-all border border-neutral-700"
                >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Regenerate
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Options List */}
                <div className="space-y-4">
                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block mb-1 px-1">AI Recommendations</label>
                    {payload.options.map((opt, i) => {
                        const isSelected = selectedIdx === i;
                        return (
                            <div
                                key={i}
                                onClick={() => handleSelectOption(i)}
                                className={`cursor-pointer rounded-xl border p-4 transition-all relative ${isSelected ? 'border-emerald-500 bg-emerald-500/[0.03]' : 'border-neutral-800 bg-neutral-950/30 hover:bg-neutral-900 border-dashed'}`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-1">
                                        <h3 className={`text-xs font-bold ${isSelected ? 'text-emerald-400' : 'text-neutral-400'}`}>{opt.title}</h3>
                                        <p className="text-[10px] text-neutral-500 line-clamp-1">{opt.description}</p>
                                    </div>
                                    {isSelected && (
                                        <div className="h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                                            <svg className="w-3 h-3 text-neutral-900" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Editor & Settings */}
                <div className="space-y-6 bg-neutral-950/40 rounded-2xl border border-neutral-800 p-6">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Active Metadata</label>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between items-center mb-1.5 px-1">
                                    <span className="text-[10px] font-bold text-neutral-400">SEO Title</span>
                                    <span className={`text-[10px] font-mono ${editedTitle.length > 60 ? 'text-amber-500' : 'text-emerald-500/60'}`}>{editedTitle.length}/60</span>
                                </div>
                                <input
                                    type="text"
                                    value={editedTitle}
                                    onChange={e => setEditedTitle(e.target.value)}
                                    className="w-full bg-neutral-900 border border-neutral-700/50 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-500 transition-all font-medium"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1.5 px-1">
                                    <span className="text-[10px] font-bold text-neutral-400">Description</span>
                                    <span className={`text-[10px] font-mono ${editedDesc.length > 160 ? 'text-amber-500' : 'text-emerald-500/60'}`}>{editedDesc.length}/160</span>
                                </div>
                                <textarea
                                    rows={3}
                                    value={editedDesc}
                                    onChange={e => setEditedDesc(e.target.value)}
                                    className="w-full bg-neutral-900 border border-neutral-700/50 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-500 transition-all font-medium resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-neutral-800/60">
                        <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block mb-2 px-1">Post Category</label>
                        <select
                            value={selectedCategory}
                            onChange={e => setSelectedCategory(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition-all cursor-pointer hover:bg-neutral-800"
                        >
                            {CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <p className="text-[9px] text-neutral-600 mt-2 px-1 italic italic">Ensures your post is grouped correctly in the blog index.</p>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-neutral-800">
                <button
                    onClick={handleApply}
                    className="rounded-lg bg-emerald-600 px-8 py-3 text-xs font-black text-white uppercase tracking-widest transition-all hover:bg-emerald-500 shadow-xl shadow-emerald-900/30 active:scale-95 flex items-center gap-2"
                >
                    Apply Meta & Tags
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
