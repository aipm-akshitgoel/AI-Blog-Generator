"use client";

import { useState } from "react";
import type { TopicOption } from "@/lib/types/strategy";

interface ManualTopicEntryProps {
    onSelect: (topic: TopicOption) => void;
    onBack?: () => void;
}

export function ManualTopicEntry({ onSelect, onBack }: ManualTopicEntryProps) {
    const [suggestion, setSuggestion] = useState("");
    const [error, setError] = useState<string | null>(null);

    const handleContinue = () => {
        const text = suggestion.trim();
        if (text.length < 8) {
            setError("Enter a clear topic suggestion (at least a few words).");
            return;
        }
        setError(null);
        const title = text.length > 140 ? `${text.slice(0, 137)}…` : text;
        onSelect({
            title,
            description: text,
            cannibalizationRisk: false,
        });
    };

    return (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 shadow-xl animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-start justify-between gap-4 mb-6 border-b border-neutral-800 pb-6">
                <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-900/30 text-emerald-500 border border-emerald-800/50">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white uppercase tracking-tighter">Your Topic</h2>
                        <p className="text-xs text-neutral-400 font-medium max-w-md mt-1">
                            No strategy topics yet — describe what you want to write. This becomes your post direction for the AI.
                        </p>
                    </div>
                </div>
                {onBack && (
                    <button
                        type="button"
                        onClick={onBack}
                        className="text-[10px] font-black text-neutral-500 hover:text-white uppercase tracking-widest shrink-0"
                    >
                        ← Back
                    </button>
                )}
            </div>

            <label className="block text-sm font-bold text-neutral-400 uppercase tracking-widest mb-3">
                Topic suggestion
            </label>
            <textarea
                value={suggestion}
                onChange={(e) => setSuggestion(e.target.value)}
                placeholder="e.g. Best Online MBA Programs in India (2026): compare UGC-approved universities on fees, placements, and ROI for working professionals…"
                rows={4}
                className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-y min-h-[120px] mb-2"
            />
            {error && <p className="text-xs text-amber-400 mb-4">{error}</p>}

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-neutral-800">
                <button
                    type="button"
                    onClick={handleContinue}
                    className="flex-1 flex items-center justify-center gap-3 rounded-2xl bg-emerald-600 px-8 py-5 text-sm font-black text-white transition-all hover:bg-emerald-500 shadow-2xl shadow-emerald-900/40 active:scale-[0.98] uppercase tracking-widest"
                >
                    Continue
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                </button>
            </div>
            <p className="text-[10px] text-neutral-600 mt-3 text-center">
                <a href="/setup" className="text-emerald-500/80 hover:text-emerald-400 underline">
                    Set up business profile & strategy
                </a>{" "}
                anytime for AI-suggested topics.
            </p>
        </div>
    );
}
