"use client";

import { useState } from "react";
import type { InterlinkingRules } from "@/lib/types/contentSpec";
import { normalizeInterlinkingRules } from "@/lib/types/contentSpec";
import { NumberInput } from "@/components/ui/NumberInput";

interface InterlinkingRulesPanelProps {
    onContinue: (rules: InterlinkingRules) => void;
    onBack?: () => void;
}

export function InterlinkingRulesPanel({ onContinue, onBack }: InterlinkingRulesPanelProps) {
    const [instructions, setInstructions] = useState("");
    const [minLinks, setMinLinks] = useState("");
    const [maxLinks, setMaxLinks] = useState("");

    const handleContinue = () => {
        const rules = normalizeInterlinkingRules({
            instructions,
            minLinks: minLinks ? Number(minLinks) : undefined,
            maxLinks: maxLinks ? Number(maxLinks) : undefined,
        });
        onContinue(rules);
    };

    return (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 shadow-xl animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 border-b border-neutral-800 pb-6">
                <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-900/30 text-emerald-400 border border-emerald-800/50">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white uppercase tracking-tighter">Internal linking rules</h2>
                        <p className="text-xs text-neutral-400 font-medium max-w-md mt-1">
                            Set how many internal links to add in the article body (your services, blog posts, and key on-site URLs). Min/max are enforced after optimization. Only same-site links — no external URLs.
                        </p>
                    </div>
                </div>
                {onBack && (
                    <button
                        type="button"
                        onClick={onBack}
                        className="text-[10px] font-black text-neutral-500 hover:text-white uppercase tracking-widest shrink-0"
                    >
                        ← Back to draft
                    </button>
                )}
            </div>

            <label className="block text-sm font-bold text-neutral-400 uppercase tracking-widest mb-3">
                Internal linking instructions
            </label>
            <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g. Add 4–6 internal links to /services, /pricing, and related blog posts; use descriptive anchor text; never link inside H2 headings…"
                rows={5}
                className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-y min-h-[120px] mb-6"
            />

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">
                        Min internal links (in body)
                    </label>
                    <NumberInput
                        min={0}
                        max={20}
                        value={minLinks}
                        onChange={setMinLinks}
                        placeholder="e.g. 3"
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">
                        Max internal links (in body)
                    </label>
                    <NumberInput
                        min={0}
                        max={20}
                        value={maxLinks}
                        onChange={setMaxLinks}
                        placeholder="e.g. 6"
                    />
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-neutral-800">
                <button
                    type="button"
                    onClick={handleContinue}
                    className="flex-1 flex items-center justify-center gap-3 rounded-2xl bg-emerald-600 px-8 py-5 text-sm font-black text-white transition-all hover:bg-emerald-500 shadow-2xl shadow-emerald-900/40 active:scale-[0.98] uppercase tracking-widest"
                >
                    Run internal linking &amp; optimization
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
