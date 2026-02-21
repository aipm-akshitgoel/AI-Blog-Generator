import { useState, useEffect } from "react";
import type { OptimizedContent } from "@/lib/types/optimization";
import type { MetaOption, MetaSeoPayload } from "@/lib/types/meta";

interface MetaSeoAgentProps {
    optimized: OptimizedContent;
    onComplete: (selectedOption: MetaOption) => void;
}

export function MetaSeoAgentUI({ optimized, onComplete }: MetaSeoAgentProps) {
    const [payload, setPayload] = useState<MetaSeoPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

    useEffect(() => {
        const fetchMetaOptions = async () => {
            setLoading(true);
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
                setSelectedIdx(0); // pre-select first
            } catch (err) {
                setError(err instanceof Error ? err.message : "An error occurred.");
            } finally {
                setLoading(false);
            }
        };

        fetchMetaOptions();
    }, [optimized]);

    if (loading) {
        return (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-8 shadow-xl text-center">
                <div className="mb-6 inline-flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-cyan-900/20 text-cyan-500">
                    <svg className="w-8 h-8 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                </div>
                <h3 className="text-lg font-medium text-neutral-200">Crafting Meta Attributes...</h3>
                <p className="mt-2 text-sm text-neutral-500">Enforcing character limits and generating plain-English explanations.</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-6 text-center">
                <p className="text-red-400">{error}</p>
            </div>
        );
    }

    if (!payload || !payload.options) return null;

    return (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 shadow-xl animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mb-6 border-b border-neutral-800 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-900/30 text-cyan-400 border border-cyan-800/50">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.158 3.71 3.71 1.159-1.157a2.625 2.625 0 000-3.711z" />
                        <path d="M10.856 7.646a2.625 2.625 0 00-3.712 0l-5.64 5.64a2.625 2.625 0 000 3.711l1.158 1.158a2.625 2.625 0 003.71 0l5.64-5.64a2.625 2.625 0 000-3.711l-1.156-1.158zm-1.856 7.23a1.5 1.5 0 11-2.122-2.122 1.5 1.5 0 012.122 2.122z" />
                    </svg>
                </div>
                <div>
                    <h2 className="text-xl font-semibold text-neutral-100">Meta SEO Agent</h2>
                    <p className="text-xs text-neutral-400">Select the best Title & Description pair</p>
                </div>
            </div>

            <div className="space-y-4 mb-8">
                {payload.options.map((opt, i) => {
                    const titleColor = opt.title.length > 60 ? 'text-amber-500' : 'text-emerald-400';
                    const descColor = opt.description.length > 160 ? 'text-amber-500' : 'text-emerald-400';
                    const isSelected = selectedIdx === i;

                    return (
                        <div
                            key={i}
                            onClick={() => setSelectedIdx(i)}
                            className={`cursor-pointer rounded-xl border p-5 transition-colors ${isSelected ? 'border-cyan-500 bg-cyan-950/20' : 'border-neutral-800 bg-neutral-950 hover:bg-neutral-900'}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-semibold text-neutral-100">{opt.title}</h3>
                                <span className={`text-xs font-mono ml-4 shrink-0 ${titleColor}`}>
                                    {opt.title.length}/60 chars
                                </span>
                            </div>
                            <div className="flex justify-between items-start mb-4">
                                <p className="text-sm text-neutral-300 pr-4">{opt.description}</p>
                                <span className={`text-xs font-mono shrink-0 ${descColor}`}>
                                    {opt.description.length}/160 chars
                                </span>
                            </div>

                            <div className="mt-2 rounded bg-neutral-900 border border-neutral-800 p-3 flex items-start gap-2">
                                <svg className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-xs text-neutral-400 leading-relaxed italic">{opt.explanation}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
                <button
                    onClick={() => selectedIdx !== null && onComplete(payload.options[selectedIdx])}
                    disabled={selectedIdx === null}
                    className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white transition-colors hover:bg-indigo-500 shadow-lg shadow-indigo-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Apply Meta Tags
                </button>
            </div>
        </div>
    );
}
