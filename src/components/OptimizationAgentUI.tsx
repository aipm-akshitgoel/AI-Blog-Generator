import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import type { OptimizedContent } from "@/lib/types/optimization";
import type { BlogPost } from "@/lib/types/content";

interface OptimizationAgentProps {
    post: BlogPost;
    onComplete?: (optimized: OptimizedContent) => void;
}

function deriveInsights(scores: { overall: number; contentStructure: number; readability: number }): string[] {
    const tips: string[] = [];
    if (scores.readability < 90) tips.push("Improve readability: use shorter sentences, simpler words, and more subheadings.");
    if (scores.contentStructure < 90) tips.push("Improve structure: add clearer H2/H3 hierarchy and balance section lengths.");
    if (scores.overall < 90) tips.push("Review keyword placement in title, intro, and headings for better SEO.");
    if (tips.length === 0) tips.push("All metrics look good. You can still use 'Edit content' to make manual tweaks.");
    return tips;
}

export function OptimizationAgentUI({ post, onComplete }: OptimizationAgentProps) {
    const [optimizedData, setOptimizedData] = useState<OptimizedContent | null>(null);
    const [loading, setLoading] = useState(true);
    const [isRefining, setIsRefining] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState("");

    useEffect(() => {
        const fetchOptimization = async () => {
            setLoading(true);
            try {
                const res = await fetch("/api/optimize-content", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ blogPost: post }),
                });

                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.error || "Failed to optimize content.");
                }

                const data = await res.json();
                setOptimizedData(data.optimized);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Unknown error occurred.");
            } finally {
                setLoading(false);
            }
        };

        fetchOptimization();
    }, [post]);

    const handleRefine = async () => {
        if (!optimizedData) return;
        setLoading(true);
        setIsRefining(true);
        setError(null);
        try {
            const refinePayload: BlogPost = {
                ...post,
                title: optimizedData.title,
                slug: optimizedData.slug,
                metaDescription: optimizedData.metaDescription,
                contentMarkdown: optimizedData.contentMarkdown,
                faqs: optimizedData.faqs,
            };

            const res = await fetch("/api/optimize-content", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ blogPost: refinePayload, isRefining: true }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to refine content.");
            }

            const data = await res.json();
            setOptimizedData(data.optimized);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error occurred.");
        } finally {
            setLoading(false);
            setIsRefining(false);
        }
    };

    if (loading) {
        return (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-8 shadow-xl text-center">
                <div className="mb-6 inline-flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-indigo-900/20 text-indigo-500">
                    <svg className="w-8 h-8 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                </div>
                <h3 className="text-lg font-medium text-neutral-200">
                    {isRefining ? "Applying Fixes & Refining..." : "Optimizing Content..."}
                </h3>
                <p className="mt-2 text-sm text-neutral-500">
                    {isRefining ? "Running secondary LLM pass to improve low scores." : "Refining flow, adding internal links, and balancing sections."}
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-6 text-center shadow-xl">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-900/30 text-red-500">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h3 className="text-lg font-medium text-neutral-100 mb-2">Optimization Failed</h3>
                <p className="text-red-400 text-sm mb-4">{error}</p>
                <div className="inline-block rounded-lg bg-neutral-900 border border-neutral-800 p-3">
                    <p className="text-neutral-300 text-sm font-medium">✨ Nudge: If this is an API rate limit issue, please wait 1 minute and try again.</p>
                </div>
            </div>
        );
    }

    if (!optimizedData) return null;

    // Render optimized markdown with internal links (markdown already contains links)
    return (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 shadow-xl animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mb-6 border-b border-neutral-800 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-900/30 text-indigo-400 border border-indigo-800/50">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M4.804 21.644A6.707 6.707 0 006 21.75a6.721 6.721 0 003.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543-.11.554-.334 1.258-.694 2.19-.089.231-.225.598-.41.97l-.017.032c-.066.12-.132.241-.197.362a.75.75 0 00.933 1.054 13.924 13.924 0 003.111-1.706zM9.75 9.75a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-4.5zm0 3a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-4.5z" clipRule="evenodd" />
                    </svg>
                </div>
                <div>
                    <h2 className="text-xl font-semibold text-neutral-100">Optimized Content</h2>
                    <p className="text-xs text-neutral-400">Refined article with internal links and balanced sections</p>
                </div>
            </div>

            {/* SEO Analyzer Module (Matches User Screenshot) */}
            {optimizedData.seoScores && (
                <div className="mb-6 rounded-xl border border-neutral-800 bg-[#FAFAFA] text-neutral-900 p-6 md:p-8">
                    <div className="flex items-center gap-2 mb-6 text-neutral-800">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                        </svg>
                        <h2 className="text-xl font-bold">SEO Analyzer</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Overall Circular Score */}
                        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm flex flex-col items-center justify-center">
                            <div className="relative w-32 h-32 mb-4">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                    {/* Background Circle */}
                                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" strokeWidth="12" />
                                    {/* Progress Circle (Green #22c55e) */}
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="40"
                                        fill="transparent"
                                        stroke="#22c55e"
                                        strokeWidth="12"
                                        strokeDasharray={`${(optimizedData.seoScores.overall / 100) * 251.2} 251.2`}
                                        strokeLinecap="round"
                                        className="transition-all duration-1000 ease-out"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-3xl font-bold text-neutral-800">{Math.min(100, Math.max(0, optimizedData.seoScores.overall))}</span>
                                </div>
                            </div>
                            <span className="text-sm font-semibold text-neutral-500">Overall SEO Score</span>
                        </div>

                        <div className="flex flex-col gap-6">
                            {/* Detailed Metric Bars */}
                            <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm flex flex-col justify-center space-y-6">
                                <div>
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-sm font-semibold text-[#4A5568]">Content Structure</span>
                                        <span className="text-sm font-bold text-[#2D3748]">{Math.min(100, optimizedData.seoScores.contentStructure)}/100</span>
                                    </div>
                                    <div className="h-3 w-full bg-neutral-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-[#22c55e] transition-all duration-1000 ease-out rounded-full" style={{ width: `${Math.min(100, optimizedData.seoScores.contentStructure)}%` }}></div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-sm font-semibold text-[#4A5568]">Readability</span>
                                        <span className="text-sm font-bold text-[#2D3748]">{Math.min(100, Math.max(0, optimizedData.seoScores.readability))}/100</span>
                                    </div>
                                    <div className="h-3 w-full bg-neutral-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-[#eab308] transition-all duration-1000 ease-out rounded-full" style={{ width: `${Math.min(100, Math.max(0, optimizedData.seoScores.readability))}%` }}></div>
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-neutral-100">
                                    <div className="flex justify-between items-end mb-2">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-sm font-semibold text-[#4A5568]">Originality Score</span>
                                            {optimizedData.plagiarismReport.isSafe && (
                                                <span className="text-[10px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded uppercase">Safe</span>
                                            )}
                                        </div>
                                        <span className="text-sm font-bold text-[#2D3748]">{100 - optimizedData.plagiarismReport.overallSimilarity}%</span>
                                    </div>
                                    <div className="h-3 w-full bg-neutral-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-[#3b82f6] transition-all duration-1000 ease-out rounded-full" style={{ width: `${100 - optimizedData.plagiarismReport.overallSimilarity}%` }}></div>
                                    </div>
                                </div>
                            </div>

                            {/* Target Keywords */}
                            <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
                                <h3 className="text-sm font-bold tracking-wider text-[#718096] uppercase mb-4">Target Keywords</h3>
                                {optimizedData.seoScores.targetKeywords && optimizedData.seoScores.targetKeywords.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {optimizedData.seoScores.targetKeywords.map((kw, i) => (
                                            <span key={i} className="inline-flex items-center rounded-md bg-[#EDF2F7] px-2.5 py-1 text-xs font-semibold text-[#4A5568]">
                                                {kw}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-[#A0AEC0]">No primary keywords set yet.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Insights & Action Items - always visible */}
                    <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-4 text-amber-800">
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <h3 className="font-bold">
                                {optimizedData.seoScores.actionableInsights?.length ? "Actionable Insights" : "Insights & Tips"}
                            </h3>
                        </div>
                        <ul className="list-disc list-inside space-y-2 text-sm text-amber-900 mb-5">
                            {(optimizedData.seoScores.actionableInsights?.length
                                ? optimizedData.seoScores.actionableInsights
                                : deriveInsights(optimizedData.seoScores)
                            ).map((insight, i) => (
                                <li key={i}>{insight}</li>
                            ))}
                        </ul>
                        <div className="flex flex-wrap gap-3">
                            {optimizedData.seoScores.actionableInsights?.length ? (
                                <button
                                    onClick={handleRefine}
                                    disabled={loading}
                                    className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-500 disabled:opacity-50 shadow-md shadow-amber-600/20"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                    </svg>
                                    {loading ? "Refining..." : "Auto-Fix Issues"}
                                </button>
                            ) : null}
                            <span className="text-sm text-amber-700">Use &quot;Edit content&quot; below to make manual corrections.</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Inline Editor for manual corrections */}
            {isEditing && (
                <div className="mb-8 rounded-xl border border-amber-900/50 bg-amber-950/10 p-4 animate-in fade-in duration-300">
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-medium text-amber-500">Edit content (Markdown)</h3>
                        <button
                            type="button"
                            onClick={() => { setEditedContent(optimizedData.contentMarkdown); setIsEditing(false); }}
                            className="text-xs text-neutral-500 hover:text-neutral-300"
                        >
                            Cancel
                        </button>
                    </div>
                    <textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        className="w-full h-64 rounded-lg bg-neutral-950 border border-neutral-800 p-4 text-sm text-neutral-300 font-mono focus:border-amber-700 focus:ring-1 focus:ring-amber-700 outline-none resize-y"
                    />
                    <div className="mt-3 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setOptimizedData((prev) => prev ? { ...prev, contentMarkdown: editedContent } : prev);
                                setIsEditing(false);
                            }}
                            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500"
                        >
                            Save & Apply
                        </button>
                    </div>
                </div>
            )}

            {/* Optimized Article Body */}
            {!isEditing && (
                <div className="mb-8 rounded-lg border border-neutral-800 bg-neutral-950 p-6 md:p-8 overflow-y-auto max-h-[600px]">
                    <article className="prose prose-neutral prose-invert w-full max-w-none prose-headings:font-bold prose-a:text-indigo-400">
                        <ReactMarkdown>{optimizedData.contentMarkdown}</ReactMarkdown>
                    </article>
                </div>
            )}

            {/* Internal Links List (optional) */}
            {optimizedData.internalLinks && optimizedData.internalLinks.length > 0 && (
                <div className="mt-6 border-t border-neutral-800 pt-4">
                    <h3 className="text-neutral-100 mb-2">Internal Links Added</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-neutral-300">
                        {optimizedData.internalLinks.map((link, idx) => (
                            <li key={idx}>
                                <a href={link.href} className="text-indigo-400 underline" target="_blank" rel="noopener noreferrer">
                                    {link.anchorText}
                                </a>{" "}({link.target})
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Action Buttons - Edit + Continue */}
            <div className="flex flex-wrap justify-between items-center gap-3 pt-4 border-t border-neutral-800">
                {!isEditing && (
                    <button
                        type="button"
                        onClick={() => { setEditedContent(optimizedData.contentMarkdown); setIsEditing(true); }}
                        className="rounded-lg border border-neutral-600 px-4 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-800"
                    >
                        Edit content
                    </button>
                )}
                <button
                    onClick={() => {
                        if (onComplete) onComplete(optimizedData);
                    }}
                    className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-500 ml-auto transition-colors hover:bg-neutral-800 hover:text-white"
                >
                    Continue
                </button>
            </div>
        </div>
    );
}
