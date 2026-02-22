"use client";
import { useState, useEffect } from "react";
import type { OptimizedContent } from "@/lib/types/optimization";
import type { PlagiarismReport } from "@/lib/types/plagiarism";
import { HelpTip } from "./HelpTip";

interface PlagiarismAgentProps {
    optimized: OptimizedContent;
    onComplete: (updatedPost?: OptimizedContent) => void;
}

export function PlagiarismAgentUI({ optimized, onComplete }: PlagiarismAgentProps) {
    const [report, setReport] = useState<PlagiarismReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Manual editing state
    const [currentOptimized, setCurrentOptimized] = useState<OptimizedContent>(optimized);
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(optimized.contentMarkdown);

    useEffect(() => {
        const runCheck = async () => {
            setLoading(true);
            try {
                const res = await fetch("/api/plagiarism-check", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ optimizedContent: currentOptimized }),
                });

                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.error || "Failed to run plagiarism check.");
                }

                const data = await res.json();
                setReport(data.report);
            } catch (err) {
                setError(err instanceof Error ? err.message : "An error occurred.");
            } finally {
                setLoading(false);
            }
        };

        runCheck();
    }, [currentOptimized]);

    if (loading) {
        return (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-8 shadow-xl text-center">
                <div className="mb-6 inline-flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-rose-900/20 text-rose-500">
                    <svg className="w-8 h-8 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                </div>
                <h3 className="text-lg font-medium text-neutral-200">Scanning for Plagiarism...</h3>
                <p className="mt-2 text-sm text-neutral-500">Cross-referencing web sources (MCP integration).</p>
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
                <h3 className="text-lg font-medium text-neutral-100 mb-2">Check Failed</h3>
                <p className="text-red-400 text-sm mb-4">{error}</p>
                <div className="inline-block rounded-lg bg-neutral-900 border border-neutral-800 p-3">
                    <p className="text-neutral-300 text-sm font-medium">✨ Nudge: If this is an API rate limit issue, please wait 1 minute and try again.</p>
                </div>
            </div>
        );
    }

    if (!report) return null;

    return (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 shadow-xl animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mb-6 border-b border-neutral-800 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-900/30 text-rose-400 border border-rose-800/50">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                    </svg>
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl font-semibold text-neutral-100">Plagiarism &amp; Safety Agent</h2>
                        <HelpTip text="Scans your article against billions of web pages to check it's unique. Google penalises copied content, so originality is critical for ranking." />
                    </div>
                    <p className="text-xs text-neutral-400">Similarity Detection &amp; Content Originality</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-6 flex flex-col justify-center items-center">
                    <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-sm font-semibold text-neutral-500">Overall Match</span>
                        <HelpTip text="The percentage of your text that matches content found elsewhere online. Below 15% is ideal. Higher numbers suggest some phrases should be reworded." />
                    </div>
                    <div className="text-4xl font-bold text-neutral-100">{report.overallSimilarity}%</div>
                    {report.isSafe ? (
                        <span className="mt-2 text-xs font-semibold text-green-400 bg-green-400/10 px-2 py-1 rounded">SAFE</span>
                    ) : (
                        <span className="mt-2 text-xs font-semibold text-amber-500 bg-amber-500/10 px-2 py-1 rounded">REVIEW NEEDED</span>
                    )}
                </div>

                <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-6 flex flex-col justify-center">
                    <h3 className="text-sm font-semibold text-neutral-500 mb-4 tracking-wider uppercase">Flagged Sections</h3>
                    {report.flaggedSections.length > 0 ? (
                        <div className="space-y-4 max-h-40 overflow-y-auto pr-2">
                            {report.flaggedSections.map((sec, idx) => (
                                <div key={idx} className="bg-neutral-900 border border-neutral-800 p-3 rounded text-sm relative">
                                    <span className="absolute top-2 right-2 text-xs font-mono text-rose-400 bg-rose-400/10 px-1 rounded">{sec.similarityScore}% Match</span>
                                    <p className="text-neutral-300 mb-2 pr-12 line-clamp-2">"{sec.textSegment}"</p>
                                    {sec.sourceUrl && (
                                        <a href={sec.sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:underline">View Source &rarr;</a>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-neutral-400 text-sm">No significant matches found. Your content appears 100% original.</p>
                    )}
                </div>
            </div>

            {/* Inline Editor */}
            {isEditing && (
                <div className="mb-8 rounded-xl border border-amber-900/50 bg-amber-950/10 p-4 animate-in fade-in duration-300">
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-medium text-amber-500">Manual Edit Mode</h3>
                        <button
                            onClick={() => {
                                setEditedContent(currentOptimized.contentMarkdown);
                                setIsEditing(false);
                            }}
                            className="text-xs text-neutral-500 hover:text-neutral-300"
                        >
                            Cancel
                        </button>
                    </div>
                    <textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        className="w-full h-64 rounded-lg bg-neutral-950 border border-neutral-800 p-4 text-sm text-neutral-300 font-mono focus:border-amber-700 focus:ring-1 focus:ring-amber-700 outline-none"
                    />
                    <div className="mt-3 flex justify-end">
                        <button
                            onClick={() => {
                                setCurrentOptimized(prev => ({ ...prev, contentMarkdown: editedContent }));
                                setIsEditing(false);
                            }}
                            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-500"
                        >
                            Save & Re-Check
                        </button>
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            {!isEditing && (
                <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
                    {report.flaggedSections.length > 0 && (
                        <button
                            className="rounded-lg border border-amber-700 bg-amber-900/20 px-5 py-2.5 font-medium text-amber-400 transition-colors hover:bg-amber-900/40"
                            onClick={() => setIsEditing(true)}
                        >
                            Request Manual Edit
                        </button>
                    )}
                    <button
                        onClick={() => onComplete(currentOptimized !== optimized ? currentOptimized : undefined)}
                        className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white transition-colors hover:bg-indigo-500 shadow-lg shadow-indigo-900/20"
                    >
                        Accept & Continue
                    </button>
                </div>
            )}
        </div>
    );
}
