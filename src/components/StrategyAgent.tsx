"use client";

import { useEffect, useState } from "react";
import { type BusinessContext } from "@/lib/types/businessContext";
import { type StrategySession } from "@/lib/types/strategy";
import {
    buildMinimalBusinessContext,
    canRunStrategyAgent,
    mergeContextWithReference,
    resolveStrategyReferenceDomain,
} from "@/lib/strategyInputs";
import { formatApiError } from "@/lib/formatApiError";
import {
    isAzureContentFilterError,
    isAzureRateLimitError,
    userFacingContentFilterMessage,
    userFacingRateLimitMessage,
} from "@/lib/azureContentFilter";
import { ManualKeywordStrategyPanel } from "@/components/ManualKeywordStrategyPanel";
import {
    enrichStrategyWithBlogProgress,
    getDirectoryFromSession,
    normalizeBlogStrategyResponse,
    syncSessionFromDirectory,
} from "@/lib/contentDirectory";
import { ContentDirectoryList } from "@/components/ContentDirectoryList";
import { CtaButton } from "@/components/ui/CtaButton";

interface StrategyAgentProps {
    businessContext: BusinessContext | null;
    onApprove: (session: StrategySession) => void | Promise<void>;
    onModify: () => void;
    onSkip?: () => void;
    platform?: "blog" | "linkedin";
    /** Parent-driven save in progress (shows spinner on Save keyword strategy). */
    saving?: boolean;
}

type KeywordInputMode = "ai" | "manual";

export function StrategyAgentUI({
    businessContext,
    onApprove,
    onModify,
    onSkip,
    platform = "blog",
    saving = false,
}: StrategyAgentProps) {
    const [strategy, setStrategy] = useState<StrategySession | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingStep, setLoadingStep] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [customPrompt, setCustomPrompt] = useState("");
    const [inputMode, setInputMode] = useState<KeywordInputMode>("ai");

    const readyToGenerate = canRunStrategyAgent(businessContext, customPrompt);

    useEffect(() => {
        if (!strategy) return;
        let cancelled = false;
        void (async () => {
            try {
                const res = await fetch("/api/blog");
                if (!res.ok || cancelled) return;
                const json = await res.json();
                const blogs = Array.isArray(json.blogs)
                    ? json.blogs.map((b: { title?: string; slug?: string; status?: string }) => ({
                          title: String(b.title || ""),
                          slug: String(b.slug || ""),
                          status: b.status,
                      }))
                    : [];
                if (cancelled) return;
                setStrategy((prev) => (prev ? enrichStrategyWithBlogProgress(prev, blogs) : prev));
            } catch {
                /* keep strategy as-is */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [strategy?.id, strategy?.keywordStrategy?.strategySource]);

    const generateStrategy = async () => {
        if (!readyToGenerate) {
            setError("Add a short direction below (industry, audience, or website to mirror).");
            return;
        }

        const referenceDomain = resolveStrategyReferenceDomain(businessContext, customPrompt);

        setLoading(true);
        setError(null);
        setLoadingStep(1);

        // Platform-specific loading messages
        const step2 = platform === "linkedin" ? "Probing LinkedIn Viral Trends..." : "Querying Google Ads Keyword Planner...";
        const step3 = platform === "linkedin" ? "Aggregating High-Engagement Inspiration..." : "Reviewing reference-site topics...";

        // Faking a tool sequence for UI feel
        setTimeout(() => setLoadingStep(2), 1500);
        setTimeout(() => setLoadingStep(3), 3500);

        try {
            const baseContext =
                businessContext ?? buildMinimalBusinessContext({ domain: referenceDomain, platform });
            const ctxForStrategy = mergeContextWithReference(baseContext, referenceDomain);
            const res = await fetch("/api/strategy-agent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    businessContext: ctxForStrategy,
                    referenceDomain,
                    customPrompt,
                    platform,
                }),
            });

            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                const apiErr = formatApiError(json?.error, "Failed to generate strategy");
                if (res.status === 429 || isAzureRateLimitError(apiErr)) {
                    throw new Error(userFacingRateLimitMessage());
                }
                if (res.status === 422 || isAzureContentFilterError(apiErr)) {
                    throw new Error(userFacingContentFilterMessage());
                }
                throw new Error(apiErr);
            }

            const raw = json.data as Record<string, unknown>;
            const normalized =
                platform === "blog"
                    ? normalizeBlogStrategyResponse(raw, {
                          businessContextId: businessContext?.id,
                          referenceDomain,
                      })
                    : (raw as unknown as StrategySession);
            setStrategy(
                platform === "blog"
                    ? normalized
                    : {
                          ...normalized,
                          keywordStrategy: {
                              ...normalized.keywordStrategy,
                              strategySource: "ai",
                          },
                      },
            );
        } catch (e) {
            setError(
                isAzureRateLimitError(e)
                    ? userFacingRateLimitMessage()
                    : isAzureContentFilterError(e)
                      ? userFacingContentFilterMessage()
                      : formatApiError(e, "Unknown error occurred"),
            );
        } finally {
            setLoading(false);
            setLoadingStep(0);
        }
    };

    if (!strategy && !loading && platform === "blog" && inputMode === "manual") {
        return (
            <ManualKeywordStrategyPanel
                businessContextId={businessContext?.id}
                onApprove={(session) => onApprove(session)}
                onBack={() => setInputMode("ai")}
                onSkip={onSkip}
            />
        );
    }

    if (!strategy && !loading) {
        return (
            <div className={`rounded-xl border ${platform === 'linkedin' ? 'border-blue-900/30 bg-blue-950/5' : 'border-neutral-800 bg-neutral-900/50'} p-6 shadow-xl animate-in fade-in duration-300`}>
                <div className="flex items-center gap-3 mb-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${platform === 'linkedin' ? 'bg-blue-900/30 text-blue-400 border-blue-800/50' : 'bg-emerald-900/30 text-emerald-400 border-emerald-800/50'}`}>
                        {platform === 'linkedin' ? (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.433 4.433 0 002.771 2.77c1.651.567 3.502.19 4.305-1.758M12.5 22.5A2.5 2.5 0 0110 20M12 2A10 10 0 1022 12A10 10 0 0012 2z" />
                            </svg>
                        )}
                    </div>
                    <h2 className="text-xl font-bold text-white uppercase tracking-tighter">
                        {platform === 'linkedin' ? "LinkedIn Growth Strategy Agent" : "Keyword Strategy Agent"}
                    </h2>
                </div>
                <p className="mb-6 text-sm text-neutral-400 leading-relaxed">
                    {platform === 'linkedin'
                        ? "Describe your audience and content goals. Mention a profile or site to mirror in your notes if helpful."
                        : "Describe your niche and audience for AI-suggested topics, or upload your own H1/H2 directory."}
                </p>

                {platform === "blog" && (
                    <div className="mb-6 flex gap-2 p-1 rounded-xl bg-neutral-950 border border-neutral-800">
                        <button
                            type="button"
                            onClick={() => setInputMode("ai")}
                            className={`flex-1 rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${inputMode === "ai" ? "bg-emerald-600 text-white" : "text-neutral-500 hover:text-white"}`}
                        >
                            AI keyword strategy
                        </button>
                        <button
                            type="button"
                            onClick={() => setInputMode("manual")}
                            className={`flex-1 rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${inputMode === "manual" ? "bg-emerald-600 text-white" : "text-neutral-500 hover:text-white"}`}
                        >
                            Manual directory (Excel)
                        </button>
                    </div>
                )}

                <div className="mb-6 relative group">
                    <label className={`text-xs font-black uppercase tracking-widest ${platform === 'linkedin' ? 'text-blue-500' : 'text-emerald-500'} mb-2 flex items-center gap-2`}>
                        Custom direction
                    </label>
                    <textarea
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder={platform === 'linkedin'
                            ? "E.g., B2B founders in India; mirror thought-leadership style from linkedin.com/in/example…"
                            : "E.g., B2B SaaS for mid-market teams in the US. Optional: mention a reference site URL for topic inspiration (not copied verbatim)…"}
                        rows={3}
                        className={`w-full bg-neutral-950/50 border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none placeholder:text-neutral-600 resize-none transition-all ${platform === 'linkedin' ? 'focus:border-blue-500 focus:ring-1 focus:ring-blue-500' : 'focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'}`}
                    />
                </div>

                {error && (
                    <div className="mb-6 rounded-lg bg-red-900/20 p-4 border border-red-900/50 flex flex-col items-center text-center">
                        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-900/30 text-red-500">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h4 className="font-semibold text-red-400 mb-1">Strategy Generation Failed</h4>
                        <p className="text-sm text-red-300/80 mb-3">{error}</p>
                        <div className="rounded bg-neutral-900/80 border border-neutral-800 p-2.5 w-full space-y-2">
                            {error.includes("rate limit") || error.includes("temporarily busy") ? (
                                <p className="text-neutral-300 text-xs font-medium">
                                    Wait about one minute, then click Generate again.
                                </p>
                            ) : error.includes("blocked") ? (
                                <>
                                    <p className="text-neutral-300 text-xs font-medium">
                                        Try shorter, neutral wording in Custom direction, or switch to{" "}
                                        <strong className="text-emerald-400">Manual directory (Excel)</strong> to
                                        upload your H1/keyword plan.
                                    </p>
                                </>
                            ) : (
                                <p className="text-neutral-300 text-xs font-medium">
                                    Try again, or use Manual directory (Excel) to upload your plan.
                                </p>
                            )}
                        </div>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                    <CtaButton
                        type="button"
                        onClick={generateStrategy}
                        loading={loading}
                        loadingLabel="Generating…"
                        disabled={!readyToGenerate}
                        variant={platform === "linkedin" ? "blue" : "primary"}
                        className="flex-1 rounded-lg px-4 py-3 text-xs shadow-lg disabled:opacity-40"
                    >
                        Generate keyword strategy
                    </CtaButton>
                    {onSkip && (
                        <button
                            type="button"
                            onClick={onSkip}
                            className="rounded-lg border border-neutral-700 px-4 py-3 text-xs font-bold uppercase tracking-widest text-neutral-400 hover:text-white hover:border-neutral-500 transition-colors"
                        >
                            Skip
                        </button>
                    )}
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-8 shadow-xl text-center">
                <div className={`mb-6 inline-flex h-16 w-16 animate-pulse items-center justify-center rounded-full ${platform === 'linkedin' ? 'bg-blue-900/20 text-blue-500' : 'bg-emerald-900/20 text-emerald-500'}`}>
                    <svg className="w-8 h-8 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
                <h3 className="text-lg font-bold text-white uppercase tracking-tight">
                    {loadingStep === 1 && "Connecting to AI Agents..."}
                    {loadingStep === 2 && (platform === "linkedin" ? "Probing LinkedIn Viral Trends..." : "Querying Keyword Planner...")}
                    {loadingStep === 3 && (platform === "linkedin" ? "Aggregating Content Inspiration..." : "Analyzing Local SERP Signals...")}
                    {loadingStep === 0 && "Finalizing Strategy..."}
                </h3>
                <p className="mt-2 text-sm text-neutral-500">Cross-referencing live data pulses... just a second.</p>

                <div className="mt-8 h-1.5 w-full bg-neutral-800 overflow-hidden rounded-full">
                    <div
                        className="h-full bg-emerald-500 transition-all duration-1000 ease-out"
                        style={{ width: `${(loadingStep / 3) * 100}%` }}
                    />
                </div>
            </div>
        );
    }

    if (strategy) {
        return (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* LinkedIn Specific: Inspiration Section */}
                {platform === "linkedin" && strategy.inspiration && (
                    <div className="mb-8 p-4 rounded-xl border border-blue-900/30 bg-blue-950/10">
                        <h3 className="mb-4 text-[10px] font-black uppercase tracking-widest text-blue-400">Market Inspiration (Top Performing Posts)</h3>
                        <div className="space-y-4">
                            {strategy.inspiration.map((item, i) => (
                                <div key={i} className="bg-neutral-900/80 p-4 rounded-lg border border-neutral-800">
                                    <div className="flex justify-between items-start gap-4">
                                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="font-bold text-white hover:text-blue-400 text-sm transition-colors decoration-blue-500/30 underline-offset-4 hover:underline">
                                            {item.title}
                                        </a>
                                        <span className="text-[10px] font-black uppercase text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 whitespace-nowrap">
                                            {item.engagement}
                                        </span>
                                    </div>
                                    <p className="mt-2 text-xs text-neutral-400 italic font-medium leading-relaxed">
                                        <span className="text-blue-500 font-black not-italic mr-1">WHY IT WORKS:</span> {item.insights}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* LinkedIn Specific: Trending Topics */}
                {platform === "linkedin" && strategy.trendingTopics && (
                    <div className="mb-8">
                        <h3 className="mb-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">LinkedIn Trending #Hashtags</h3>
                        <div className="flex flex-wrap gap-2">
                            {strategy.trendingTopics.map((topic, i) => (
                                <span key={i} className="rounded-lg bg-blue-500/5 border border-blue-500/20 px-3 py-1.5 text-xs text-blue-300 font-bold">
                                    #{topic.replace(/\s+/g, '')}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Shared: Pillars / Keywords Section */}
                <div className="mb-8">
                    <h3 className="mb-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">
                        {platform === 'linkedin' ? "Content Pillars" : "Target SEO Keywords"}
                    </h3>
                    <div className={platform === "linkedin" ? "grid gap-4 md:grid-cols-2" : ""}>
                        <div className={`rounded-xl border p-4 ${platform === 'linkedin' ? 'border-blue-900/50 bg-blue-950/20' : 'border-emerald-900/50 bg-emerald-950/20'}`}>
                            <span className="mb-1 block text-[10px] font-black uppercase text-neutral-500">North Star {platform === 'linkedin' ? 'Theme' : 'Keyword'}</span>
                            <p className={`text-lg font-black ${platform === 'linkedin' ? 'text-blue-400' : 'text-emerald-400'}`}>{strategy.keywordStrategy.primaryKeyword}</p>
                        </div>
                        {platform === "linkedin" && (strategy.keywordStrategy.secondaryKeywords?.length ?? 0) > 0 && (
                        <div className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-4">
                            <span className="mb-2 block text-[10px] font-black uppercase text-neutral-500">Supporting angles</span>
                            <div className="flex flex-wrap gap-2">
                                {strategy.keywordStrategy.secondaryKeywords.map((kw, i) => (
                                    <span key={i} className="rounded-md bg-neutral-800 px-2 py-1 text-xs font-bold text-neutral-400">
                                        {kw}
                                    </span>
                                ))}
                            </div>
                        </div>
                        )}
                    </div>
                </div>

                {platform === "blog" && getDirectoryFromSession(strategy).length > 0 && (
                <div className="mb-8">
                    <h3 className="mb-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">
                        Content directory
                        <span className="text-neutral-600 font-bold normal-case tracking-normal">
                            {" "}
                            · {getDirectoryFromSession(strategy).filter((e) => e.completed).length}/
                            {getDirectoryFromSession(strategy).length} written
                        </span>
                    </h3>
                    <ContentDirectoryList
                        entries={getDirectoryFromSession(strategy)}
                        variant="review"
                    />
                </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-6 border-t border-neutral-800">
                    <button
                        onClick={generateStrategy}
                        className="text-xs font-black uppercase tracking-widest text-neutral-500 hover:text-white transition-colors"
                    >
                        Re-Scrape & Regenerate
                    </button>
                    <CtaButton
                        type="button"
                        variant={platform === "linkedin" ? "blue" : "primary"}
                        loading={saving}
                        loadingLabel="Saving…"
                        onClick={() =>
                            void onApprove(
                                syncSessionFromDirectory({
                                    ...strategy,
                                    platform,
                                    businessContextId: businessContext?.id ?? "",
                                    referenceDomain: resolveStrategyReferenceDomain(businessContext, customPrompt),
                                    status: "approved",
                                }),
                            )
                        }
                        className="rounded-lg px-6 py-2.5 text-xs shadow-lg"
                    >
                        Save keyword strategy
                    </CtaButton>
                </div>
            </div>
        );
    }

    return null;
}
