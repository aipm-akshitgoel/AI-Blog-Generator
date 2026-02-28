"use client";

import { useState } from "react";
import { type BusinessContext } from "@/lib/types/businessContext";
import { type KeywordStrategy, type TopicOption, type StrategySession } from "@/lib/types/strategy";

interface StrategyAgentProps {
    businessContext: BusinessContext;
    onApprove: (session: StrategySession) => void;
    onModify: () => void;
    platform?: "blog" | "linkedin";
}

export function StrategyAgentUI({ businessContext, onApprove, onModify, platform = "blog" }: StrategyAgentProps) {
    const [strategy, setStrategy] = useState<{ keywordStrategy: KeywordStrategy, topicOptions: TopicOption[] } | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingStep, setLoadingStep] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [customPrompt, setCustomPrompt] = useState("");

    const generateStrategy = async () => {
        setLoading(true);
        setError(null);
        setLoadingStep(1); // "Initializing MCP tools..."

        // Faking a tool sequence for UI feel
        setTimeout(() => setLoadingStep(2), 1500); // "Querying Google Ads Keyword Planner..."
        setTimeout(() => setLoadingStep(3), 3500); // "Probing local SERPs..."

        try {
            const res = await fetch("/api/strategy-agent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ businessContext, customPrompt, platform }),
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? "Failed to generate strategy");

            setStrategy(json.data);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Unknown error occurred");
        } finally {
            setLoading(false);
            setLoadingStep(0);
        }
    };

    const mapIntentColor = (intent: string) => {
        switch (intent) {
            case "commercial": return "bg-blue-900/40 text-blue-300 border-blue-800";
            case "transactional": return "bg-green-900/40 text-green-300 border-green-800";
            case "informational": return "bg-purple-900/40 text-purple-300 border-purple-800";
            case "navigational": return "bg-yellow-900/40 text-yellow-300 border-yellow-800";
            default: return "bg-neutral-800 text-neutral-300 border-neutral-700";
        }
    };

    if (!strategy && !loading) {
        return (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 shadow-xl animate-in fade-in duration-300">
                <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-900/30 text-emerald-400 border border-emerald-800/50">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.433 4.433 0 002.771 2.77c1.651.567 3.502.19 4.305-1.758M12.5 22.5A2.5 2.5 0 0110 20M12 2A10 10 0 1022 12A10 10 0 0012 2z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-neutral-100">Keyword & Topic Strategy Agent</h2>
                </div>
                <p className="mb-6 text-sm text-neutral-400 leading-relaxed">
                    Now that your business context is established, this agent will use Google Ads Keyword Planner and analyze local SERPs to generate a highly-targeted topic strategy.
                </p>

                <div className="mb-6 relative group">
                    <label className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-2 flex items-center gap-2">
                        Custom Direction <span className="text-neutral-500 font-medium normal-case">(Optional)</span>
                    </label>
                    <textarea
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder="E.g., I want to focus only on wedding makeup topics right now..."
                        rows={2}
                        className="w-full bg-neutral-950/50 border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder:text-neutral-600 resize-none transition-all"
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
                        <div className="rounded bg-neutral-900/80 border border-neutral-800 p-2.5 w-full">
                            <p className="text-neutral-300 text-xs font-medium">✨ Nudge: If this is an API rate limit issue, please wait 1 minute and try again.</p>
                        </div>
                    </div>
                )}

                <button
                    onClick={generateStrategy}
                    className="w-full rounded-lg bg-emerald-600 px-4 py-3 font-medium text-white transition-colors hover:bg-emerald-500 shadow-lg shadow-emerald-900/20"
                >
                    Initialize Strategy Agent
                </button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-8 shadow-xl text-center">
                <div className="mb-6 inline-flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-emerald-900/20 text-emerald-500">
                    <svg className="w-8 h-8 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
                <h3 className="text-lg font-medium text-neutral-200">
                    {loadingStep === 1 && "Connecting to Strategy Agent..."}
                    {loadingStep === 2 && "Querying Google Ads Keyword Planner (via MCP)..."}
                    {loadingStep === 3 && "Probing local competitor SERPs..."}
                    {loadingStep === 0 && "Finalizing strategy..."}
                </h3>
                <p className="mt-2 text-sm text-neutral-500">This deterministic flow takes a few moments to aggregate data.</p>

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
                <div className="mb-6 border-b border-neutral-800 pb-4">
                    <h2 className="text-xl font-semibold text-neutral-100">Review Recommended Strategy</h2>
                    <p className="mt-1 text-sm text-neutral-400">Human-in-the-loop review: Please verify the targeted keywords and topics before proceeding to drafting.</p>
                </div>

                {/* Keyword Strategy Section */}
                <div className="mb-8">
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">Target Keywords</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/20 p-4">
                            <span className="mb-1 block text-xs text-neutral-500">Primary Keyword</span>
                            <p className="text-lg font-bold text-emerald-400">{strategy.keywordStrategy.primaryKeyword}</p>
                            <div className="mt-3 flex items-center gap-2 text-xs">
                                <span className="text-neutral-500">Intent:</span>
                                <span className={`px-2 py-0.5 rounded border capitalize font-medium ${mapIntentColor(strategy.keywordStrategy.searchIntent)}`}>
                                    {strategy.keywordStrategy.searchIntent}
                                </span>
                            </div>
                        </div>
                        <div className="rounded-lg border border-neutral-800 bg-neutral-950/50 p-4">
                            <span className="mb-2 block text-xs text-neutral-500">Secondary Keywords</span>
                            <div className="flex flex-wrap gap-2">
                                {strategy.keywordStrategy.secondaryKeywords.map((kw, i) => (
                                    <span key={i} className="rounded bg-neutral-800 px-2 py-1 text-sm text-neutral-300">
                                        {kw}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Topic Options Section */}
                <div className="mb-8">
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">Topics</h3>
                    <div className="space-y-3">
                        {strategy.topicOptions.map((topic, i) => (
                            <div key={i} className={`relative rounded-lg border p-4 ${topic.cannibalizationRisk ? 'border-amber-900/50 bg-amber-950/10' : 'border-neutral-800 bg-neutral-950/50'}`}>
                                {topic.cannibalizationRisk && (
                                    <div className="absolute -top-3 right-4 rounded-full bg-amber-900/40 border border-amber-800 px-3 py-0.5 text-xs font-semibold text-amber-500 flex items-center gap-1.5 shadow-sm">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                        </svg>
                                        Cannibalization Risk
                                    </div>
                                )}
                                <h4 className="font-medium text-neutral-200">{topic.title}</h4>
                                <p className="mt-1 text-sm text-neutral-400">{topic.description}</p>
                                {topic.cannibalizationRisk && (
                                    <p className="mt-3 text-xs text-amber-400 leading-relaxed border-t border-amber-900/30 pt-2">
                                        <span className="font-semibold text-amber-500">Reason:</span> {topic.cannibalizationReason}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Call to action */}
                <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
                    <button
                        onClick={() => {
                            onModify();
                            generateStrategy();
                        }}
                        className="rounded-lg border border-neutral-700 bg-neutral-900 px-5 py-2.5 font-medium text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white"
                    >
                        Reject & Regenerate
                    </button>
                    <button
                        onClick={() => onApprove({
                            businessContextId: businessContext.id ?? String(businessContext.businessName),
                            keywordStrategy: strategy.keywordStrategy,
                            topicOptions: strategy.topicOptions,
                            status: "approved"
                        })}
                        className="rounded-lg bg-emerald-600 px-5 py-2.5 font-medium text-white transition-colors hover:bg-emerald-500 shadow-lg shadow-emerald-900/20"
                    >
                        Approve Strategy
                    </button>
                </div>
            </div>
        );
    }

    return null;
}
