import { useState, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import type { OptimizedContent } from "@/lib/types/optimization";
import type { BlogPost } from "@/lib/types/content";
import { RichTextEditor } from "./RichTextEditor";
import { HelpTip } from "./HelpTip";

interface OptimizationAgentProps {
    post: BlogPost;
    businessContext: import("@/lib/types/businessContext").BusinessContext;
    onComplete?: (optimized: OptimizedContent) => void;
}

function deriveInsights(scores: { overall: number; contentStructure: number; readability: number }, plagiarismReport?: any): string[] {
    const tips: string[] = [];
    if (scores.readability < 90) tips.push("Improve readability: use shorter sentences, simpler words, and more subheadings.");
    if (scores.contentStructure < 90) tips.push("Improve structure: add clearer H2/H3 hierarchy and balance section lengths.");
    if (scores.overall < 90) tips.push("Review keyword placement in title, intro, and headings for better SEO.");
    if (plagiarismReport && !plagiarismReport.isSafe) {
        tips.push(`🚨 Plagiarism Alert: ${plagiarismReport.flaggedSections?.length || 0} phrases matched external sources. Reword the highlighted text below.`);
    }
    if (tips.length === 0) tips.push("All metrics look good. You can still use 'Open Rich Text Editor' to make manual tweaks.");
    return tips;
}

function getHeuristic(markdown: string) {
    const sentences = markdown.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = markdown.split(/\s+/).filter(w => w.trim().length > 0);
    const headings = markdown.split('\n').filter(line => line.trim().startsWith('#'));

    const avgWordsPerSentence = sentences.length > 0 ? words.length / sentences.length : 15;
    const wordsPerHeading = headings.length > 0 ? words.length / headings.length : words.length;

    let read = 100;
    if (avgWordsPerSentence > 20) read -= (avgWordsPerSentence - 20) * 2;
    if (avgWordsPerSentence < 8) read -= 5;

    let struct = 100;
    if (headings.length === 0) struct -= 50;
    if (wordsPerHeading > 300) struct -= (wordsPerHeading - 300) * 0.1;

    return { read, struct };
}

export function OptimizationAgentUI({ post, businessContext, onComplete }: OptimizationAgentProps) {
    const [optimizedData, setOptimizedData] = useState<OptimizedContent | null>(null);
    const [loading, setLoading] = useState(true);
    const [isRefining, setIsRefining] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState("");
    const [liveScores, setLiveScores] = useState<any>(null);

    // Compute highlighted markdown for plagiarism safely
    const highlightedMarkdown = useMemo(() => {
        if (!optimizedData) return "";
        let md = isEditing ? editedContent : optimizedData.contentMarkdown;

        if (optimizedData.plagiarismReport && !optimizedData.plagiarismReport.isSafe) {
            optimizedData.plagiarismReport.flaggedSections?.forEach((sec: any) => {
                if (sec.textSegment && md.includes(sec.textSegment)) {
                    md = md.replace(sec.textSegment, `**🚩 ${sec.textSegment}**`);
                }
            });
        }
        return md;
    }, [isEditing, editedContent, optimizedData]);

    // Initialize liveScores when optimizedData loads
    useEffect(() => {
        if (optimizedData && !liveScores) {
            setLiveScores(optimizedData.seoScores);
        }
    }, [optimizedData, liveScores]);

    // Live update scores as user types
    useEffect(() => {
        if (!isEditing || !optimizedData?.seoScores) return;

        const baseH = getHeuristic(optimizedData.contentMarkdown);
        const currH = getHeuristic(editedContent);

        const deltaRead = currH.read - baseH.read;
        const deltaStruct = currH.struct - baseH.struct;

        const newRead = Math.min(100, Math.max(0, Math.round(optimizedData.seoScores.readability + deltaRead)));
        const newStruct = Math.min(100, Math.max(0, Math.round(optimizedData.seoScores.contentStructure + deltaStruct)));

        const lowerMarkdown = editedContent.toLowerCase();
        const keywords = optimizedData.seoScores.targetKeywords || [];
        let kwScore = 100;
        if (keywords.length > 0) {
            const foundCount = keywords.filter((kw: string) => lowerMarkdown.includes(kw.toLowerCase())).length;
            kwScore = (foundCount / keywords.length) * 100;
        }

        const deltaOverall = Math.round((deltaRead + deltaStruct + (kwScore - 100) * 0.5) / 3);
        const newOverall = Math.min(100, Math.max(0, Math.round(optimizedData.seoScores.overall + deltaOverall)));

        setLiveScores({
            ...optimizedData.seoScores,
            readability: newRead,
            contentStructure: newStruct,
            overall: newOverall
        });
    }, [editedContent, isEditing, optimizedData]);

    useEffect(() => {
        const fetchOptimization = async () => {
            setLoading(true);
            try {
                // Build enriched context: start with existing links then append sister blog posts
                let enrichedContext = { ...businessContext };
                try {
                    const blogsRes = await fetch("/api/blog");
                    if (blogsRes.ok) {
                        const { blogs } = await blogsRes.json();
                        const blogLinks = (blogs || [])
                            .filter((b: any) => b.status === "published" && b.slug)
                            .map((b: any) => ({
                                href: `/blog/${b.slug}`,
                                anchorText: b.title,
                                target: "blog" as const,
                            }));
                        enrichedContext = {
                            ...enrichedContext,
                            internalLinks: [...(enrichedContext.internalLinks || []), ...blogLinks],
                        };
                    }
                } catch { /* non-blocking — proceed without blog links */ }

                const res = await fetch("/api/optimize-content", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ blogPost: post, businessContext: enrichedContext }),
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
                body: JSON.stringify({ blogPost: refinePayload, businessContext, isRefining: true }),
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
                <div className="mb-6 inline-flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-emerald-900/20 text-emerald-500">
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
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-900/30 text-emerald-400 border border-emerald-800/50">
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
            {liveScores && (
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
                                        strokeDasharray={`${(liveScores.overall / 100) * 251.2} 251.2`}
                                        strokeLinecap="round"
                                        className="transition-all duration-1000 ease-out"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-3xl font-bold text-neutral-800">{liveScores.overall}</span>
                                </div>
                            </div>
                            <div className="text-center mt-2">
                                <div className="flex items-center justify-center gap-1.5">
                                    <span className="text-sm font-semibold text-neutral-500">Overall SEO Score</span>
                                    <HelpTip text="A combined score (0–100) of how well-optimised this post is for Google. 80+ is good, 90+ is excellent." />
                                </div>
                                <span className="text-[10px] text-neutral-400">Aim for 80+ to rank well on Google.</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-6">
                            {/* Detailed Metric Bars */}
                            <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm flex flex-col justify-center space-y-6">
                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-sm font-semibold text-[#4A5568] block">Content Structure</span>
                                                <HelpTip text="How well the post uses headings (H2, H3) to organise information — making it easier for both readers and Google to follow." />
                                            </div>
                                            <span className="text-[10px] text-neutral-400">Proper use of headings (H2/H3) for Google.</span>
                                        </div>
                                        <span className="text-sm font-bold text-[#2D3748] mt-1">{liveScores.contentStructure}/100</span>
                                    </div>
                                    <div className="h-3 w-full bg-neutral-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-[#22c55e] transition-all duration-1000 ease-out rounded-full" style={{ width: `${liveScores.contentStructure}%` }}></div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-sm font-semibold text-[#4A5568] block">Readability</span>
                                                <HelpTip text="How easy the post is to read. Higher = more visitors read to the end, which signals quality to Google." />
                                            </div>
                                            <span className="text-[10px] text-neutral-400">How easy your content is for humans to read.</span>
                                        </div>
                                        <span className="text-sm font-bold text-[#2D3748] mt-1">{liveScores.readability}/100</span>
                                    </div>
                                    <div className="h-3 w-full bg-neutral-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-[#eab308] transition-all duration-1000 ease-out rounded-full" style={{ width: `${liveScores.readability}%` }}></div>
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-neutral-100">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-sm font-semibold text-[#4A5568]">Originality Score</span>
                                                <HelpTip text="The inverse of plagiarism — 100% means fully original. Duplicate content can hurt your Google ranking, so aim for 90%+." />
                                                {optimizedData.plagiarismReport.isSafe && (
                                                    <span className="text-[10px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded uppercase">Safe</span>
                                                )}
                                            </div>
                                            <span className="text-[10px] text-neutral-400">Checks for copied content to avoid penalties.</span>
                                        </div>
                                        <span className="text-sm font-bold text-[#2D3748] mt-1">{100 - optimizedData.plagiarismReport.overallSimilarity}%</span>
                                    </div>
                                    <div className="h-3 w-full bg-neutral-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-[#3b82f6] transition-all duration-1000 ease-out rounded-full" style={{ width: `${100 - optimizedData.plagiarismReport.overallSimilarity}%` }}></div>
                                    </div>
                                </div>
                            </div>

                            {/* Target Keywords */}
                            <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
                                <div className="mb-4">
                                    <h3 className="text-sm font-bold tracking-wider text-[#718096] uppercase">Target Keywords</h3>
                                    <p className="text-[10px] text-neutral-400 mt-0.5">Words you want to rank for. Green means they are included.</p>
                                </div>
                                {liveScores.targetKeywords && liveScores.targetKeywords.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {liveScores.targetKeywords.map((kw: string, i: number) => {
                                            const isFound = isEditing ? editedContent.toLowerCase().includes(kw.toLowerCase()) : optimizedData.contentMarkdown.toLowerCase().includes(kw.toLowerCase());
                                            return (
                                                <span key={i} className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ${isFound ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-[#EDF2F7] text-[#4A5568]'}`}>
                                                    {kw}
                                                </span>
                                            );
                                        })}
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
                                {liveScores.actionableInsights?.length ? "Actionable Insights" : "Insights & Tips"}
                            </h3>
                        </div>
                        <ul className="list-disc list-inside space-y-2 text-sm text-amber-900 mb-5">
                            {(liveScores.actionableInsights?.length
                                ? liveScores.actionableInsights
                                : deriveInsights(liveScores, optimizedData.plagiarismReport)
                            ).map((insight: string, i: number) => (
                                <li key={i}>{insight}</li>
                            ))}
                        </ul>
                        <div className="flex flex-wrap gap-3">
                            {liveScores.actionableInsights?.length ? (
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
                            {!isEditing && (
                                <button
                                    type="button"
                                    onClick={() => { setEditedContent(optimizedData.contentMarkdown); setIsEditing(true); }}
                                    className="inline-flex items-center gap-2 rounded-lg border-2 border-amber-600 bg-amber-500/10 px-5 py-2.5 text-sm font-bold text-amber-800 transition-colors hover:bg-amber-500/20 shadow-sm"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                    Edit Content
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Inline Editor for manual corrections */}
            {isEditing && (
                <div className="fixed inset-0 z-[100] flex flex-col bg-neutral-950 p-4 md:p-8 animate-in fade-in duration-300">
                    <div className="mx-auto flex h-full w-full max-w-5xl flex-col rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950/50 px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-white uppercase tracking-tighter">Edit Content</h3>
                                    <p className="text-xs text-neutral-400">Make manual adjustments before publishing.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="hidden md:flex items-center gap-4 mr-6 pr-6 border-r border-neutral-800">
                                    <div className="flex flex-col items-center">
                                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">SEO Score</span>
                                        <div className="flex items-center gap-1.5">
                                            <div className={`h-2 w-2 rounded-full ${liveScores.overall >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                            <span className="text-lg font-black text-white leading-none">{liveScores.overall}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">Structure</span>
                                        <span className="text-sm font-bold text-neutral-300">{liveScores.contentStructure}%</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">Readability</span>
                                        <span className="text-sm font-bold text-neutral-300">{liveScores.readability}%</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setEditedContent(optimizedData.contentMarkdown); setIsEditing(false); }}
                                    className="rounded-lg px-4 py-2 text-sm font-bold text-neutral-400 transition-colors hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        setOptimizedData((prev) => prev ? { ...prev, contentMarkdown: editedContent, seoScores: liveScores } : prev);
                                        setIsEditing(false);
                                    }}
                                    className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 transition-all hover:bg-emerald-500 active:scale-95"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-hidden p-6">
                            <RichTextEditor
                                value={editedContent}
                                onChange={setEditedContent}
                                internalLinks={businessContext.internalLinks}
                            />
                        </div>

                        <div className="border-t border-neutral-800 bg-neutral-950/50 px-6 py-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-2">
                                        <div className={`h-1.5 w-1.5 rounded-full ${liveScores.overall >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                        <span className="text-[10px] font-black uppercase text-neutral-500">Overall:</span>
                                        <span className="text-xs font-black text-white">{liveScores.overall}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black uppercase text-neutral-500">Struct:</span>
                                        <span className="text-xs font-black text-white">{liveScores.contentStructure}%</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black uppercase text-neutral-500">Read:</span>
                                        <span className="text-xs font-black text-white">{liveScores.readability}%</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase text-neutral-600 hidden md:flex">
                                    Analylzer Active
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Optimized Article Body */}
            {!isEditing && (
                <div className="relative mb-8 rounded-lg border border-neutral-800 bg-neutral-950 overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-neutral-950 to-transparent z-10 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-neutral-950 to-transparent z-10 pointer-events-none" />
                    <div className="p-6 md:p-8 overflow-y-auto max-h-[500px] custom-scrollbar relative z-0">
                        <article className="prose prose-neutral prose-invert w-full max-w-none prose-headings:font-bold prose-a:text-emerald-400">
                            <ReactMarkdown
                                components={{
                                    strong: ({ node, children, ...props }) => {
                                        const text = String(children);
                                        if (text.startsWith("🚩")) {
                                            return <strong className="bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded border border-red-500/30" {...props}>{children}</strong>;
                                        }
                                        return <strong {...props}>{children}</strong>;
                                    }
                                }}
                            >
                                {highlightedMarkdown}
                            </ReactMarkdown>
                        </article>
                    </div>
                </div>
            )}

            {/* Internal Links List (optional) */}
            {optimizedData.internalLinks && optimizedData.internalLinks.length > 0 && (
                <div className="mt-6 border-t border-neutral-800 pt-4">
                    <h3 className="text-neutral-100 mb-2">Internal Links Added</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-neutral-300">
                        {optimizedData.internalLinks.map((link, idx) => (
                            <li key={idx}>
                                <a href={link.href} className="text-emerald-400 underline" target="_blank" rel="noopener noreferrer">
                                    {link.anchorText}
                                </a>{" "}({link.target})
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Action Buttons - Continue */}
            <div className="flex flex-wrap justify-end items-center gap-3 pt-4 border-t border-neutral-800">
                <button
                    onClick={() => {
                        if (onComplete) onComplete(optimizedData);
                    }}
                    className="rounded-lg bg-emerald-600 px-5 py-2.5 font-medium text-white transition-colors hover:bg-emerald-500 ml-auto"
                >
                    Finalize Content &amp; Proceed
                </button>
            </div>
        </div>
    );
}
