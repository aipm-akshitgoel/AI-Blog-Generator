"use client";

import { useState, useEffect } from "react";
import type { OptimizedContent } from "@/lib/types/optimization";
import type { BusinessContext } from "@/lib/types/businessContext";
import type { CTAData } from "@/lib/types/cta";

interface CtaAgentProps {
    optimizedContent: OptimizedContent;
    businessContext: BusinessContext;
    /** H1 from topic picker — ensures CTA matches the post topic when title differs slightly */
    topicTitle?: string;
    onComplete?: (finalizedContent: OptimizedContent, cta: CTAData) => void;
}

export function CtaAgentUI({
    optimizedContent,
    businessContext,
    topicTitle,
    onComplete,
}: CtaAgentProps) {
    const [finalContent, setFinalContent] = useState<OptimizedContent | null>(null);
    const [ctaData, setCtaData] = useState<CTAData | null>(null);
    const [ctaHeadline, setCtaHeadline] = useState("");
    const [ctaCopy, setCtaCopy] = useState("");
    const [ctaButtonText, setCtaButtonText] = useState("");
    const [ctaLink, setCtaLink] = useState("");
    const [parseWarning, setParseWarning] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const injectCta = async () => {
            setLoading(true);
            setError(null);
            setParseWarning(null);
            try {
                const res = await fetch("/api/cta-agent", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        optimizedContent,
                        businessContext,
                        topicTitle,
                    }),
                });

                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.error || "Failed to process CTA injection");
                }

                setCtaHeadline(data.cta.ctaHeadline || "");
                setCtaCopy(data.cta.ctaCopy || "");
                setCtaButtonText(data.cta.ctaButtonText || "Learn More");
                setCtaLink(data.cta.ctaLink || "");
                setParseWarning(typeof data.parseWarning === "string" ? data.parseWarning : null);
                setFinalContent(optimizedContent);
                setCtaData(data.cta);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Unknown error occurred.");
            } finally {
                setLoading(false);
            }
        };

        injectCta();
    }, [optimizedContent, businessContext, topicTitle]);

    const handleContinue = () => {
        if (!finalContent || !ctaData || !onComplete) return;

        const finalCta: CTAData = {
            ...ctaData,
            ctaHeadline,
            ctaCopy,
            ctaButtonText,
            ctaLink,
        };

        onComplete(finalContent, finalCta);
    };

    if (loading) {
        return (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                    <span className="text-sm font-medium text-neutral-300">
                        Generating CTA for your article…
                    </span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-sm text-red-500">
                {error}
            </div>
        );
    }

    if (!finalContent || !ctaData) return null;

    return (
        <div className="rounded-xl border border-emerald-900/30 bg-emerald-950/10 p-6 shadow-sm animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                    </svg>
                    <h3 className="font-bold text-neutral-100">Conversion CTA</h3>
                </div>
                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    Editable
                </span>
            </div>

            {parseWarning && (
                <p className="mb-4 rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-xs text-amber-200/90">
                    {parseWarning}
                </p>
            )}

            <div className="bg-neutral-950 rounded-lg p-5 border border-neutral-800 space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase tracking-wider">
                        CTA Headline
                    </label>
                    <input
                        type="text"
                        value={ctaHeadline}
                        onChange={(e) => setCtaHeadline(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors placeholder:text-neutral-600 font-bold"
                        placeholder="Tied to your article topic"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase tracking-wider">
                        Supporting Text
                    </label>
                    <textarea
                        value={ctaCopy}
                        onChange={(e) => setCtaCopy(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors placeholder:text-neutral-600 resize-none"
                        rows={2}
                        placeholder="Mention your business and the post topic"
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase tracking-wider">
                            Button Text
                        </label>
                        <input
                            type="text"
                            value={ctaButtonText}
                            onChange={(e) => setCtaButtonText(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors uppercase placeholder:text-neutral-600 text-center font-semibold"
                            placeholder="e.g. Explore Programs"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase tracking-wider">
                            Destination Link
                        </label>
                        <input
                            type="url"
                            value={ctaLink}
                            onChange={(e) => setCtaLink(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-emerald-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors font-mono placeholder:text-emerald-800"
                            placeholder="https://yourdomain.com"
                        />
                    </div>
                </div>
                <p className="text-xs text-neutral-500 italic mt-2">
                    This CTA module will be rendered clearly and beautifully at the bottom of your post.
                </p>
            </div>

            <div className="flex justify-end mt-6 border-t border-neutral-800 pt-4">
                <button
                    type="button"
                    onClick={handleContinue}
                    className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 shadow-lg shadow-emerald-900/20 flex items-center gap-2"
                >
                    Continue
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
