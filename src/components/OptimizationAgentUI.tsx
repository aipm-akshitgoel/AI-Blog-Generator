import { useState, useEffect, useRef } from "react";
import { ButtonSpinner } from "@/components/ui/ButtonSpinner";
import type { OptimizedContent } from "@/lib/types/optimization";
import type { BlogPost } from "@/lib/types/content";
import { ArticleContentEditor, type ArticleContentEditorHandle } from "./ArticleContentEditor";
import type { ContentEditMode } from "@/lib/types/contentEdit";
import { HelpTip } from "./HelpTip";
import type { FactSource } from "@/lib/types/factSource";
import {
    optimizationErrorMessage,
    requestContentOptimization,
} from "@/lib/optimizeContentClient";
import {
    OPTIMIZATION_LINKS_PHASE,
    OPTIMIZATION_LOADING_STEPS,
    OPTIMIZATION_LOADING_TITLE,
    OPTIMIZATION_TIMING_NOTE,
    OPTIMIZED_CONTENT_SUBTITLE,
    REFINE_LOADING_DETAIL,
    REFINE_LOADING_TITLE,
    optimizationLoadingStepIndex,
} from "@/lib/optimizationCopy";
import { normalizeInterlinkingRules, type InterlinkingRules } from "@/lib/types/contentSpec";
import { DEFAULT_INTERLINKING_RULES } from "@/lib/types/topicBrief";
import { linkCountSummary, rewriteMarkdownInternalLinksToAbsolute } from "@/lib/interlinking";
import { toAbsoluteSiteHref } from "@/lib/domainLinks";
import {
    buildHeadingTagRows,
    normalizeSeoScores,
    seoQualityTotal,
    type HeadingTagRow,
} from "@/lib/seoAnalyzer";
import type { SeoScores } from "@/lib/types/optimization";

interface OptimizationAgentProps {
    post: BlogPost;
    businessContext: import("@/lib/types/businessContext").BusinessContext;
    interlinkingRules?: InterlinkingRules | null;
    primaryKeyword?: string;
    onComplete?: (optimized: OptimizedContent) => void;
}

type SeoScoreDeltas = {
    readability: number;
    grammar: number;
    originality: number;
};

type RefineFeedback =
    | { type: "improved"; message: string }
    | { type: "discarded"; message: string };

function SeoMetricBar({
    label, value, max = 100, barClass, help, suffix, delta,
}: {
    label: string; value: number; max?: number; barClass: string; help: string; suffix?: string; delta?: number;
}) {
    const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
    return (
        <div>
            <div className="flex justify-between items-start mb-2">
                <div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-[#4A5568] block">{label}</span>
                        <HelpTip text={help} />
                    </div>
                </div>
                <span className="text-sm font-bold text-[#2D3748] mt-1 flex items-center gap-1">
                    {suffix ?? `${value}/${max}`}
                    <ScoreDeltaBadge delta={delta} />
                </span>
            </div>
            <div className="h-3 w-full bg-neutral-100 rounded-full overflow-hidden">
                <div
                    className={`h-full ${barClass} transition-all duration-1000 ease-out rounded-full`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}
function ScoreDeltaBadge({ delta, className = "" }: { delta?: number; className?: string }) {
    if (delta == null || delta <= 0) return null;
    return (
        <span
            className={`inline-flex items-center rounded-md bg-emerald-100 px-1.5 py-0.5 text-[11px] font-black text-emerald-700 animate-in zoom-in-50 fade-in duration-300 ${className}`}
        >
            +{delta}
        </span>
    );
}

const AI_EDIT_BTN =
    "rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-neutral-300 transition-colors hover:border-emerald-600/50 hover:text-white";
const AI_EDIT_BTN_ACTIVE =
    "rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-400";

function EditContentMetric({
    label,
    value,
    suffix,
}: {
    label: string;
    value: number;
    suffix?: string;
}) {
    return (
        <div className="flex items-baseline gap-1.5 min-w-[4.5rem] shrink-0 whitespace-nowrap">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">{label}</span>
            <span className="text-sm font-bold text-neutral-200 tabular-nums">
                {value}
                {suffix ?? ""}
            </span>
        </div>
    );
}

function HeadingTagsPanel({ rows }: { rows: HeadingTagRow[] }) {
    const h1Rows = rows.filter((r) => r.level === "h1");
    const h2Rows = rows.filter((r) => r.level === "h2");

    const renderRow = (row: HeadingTagRow) => (
        <tr key={`${row.level}-${row.title}`} className="border-t border-neutral-100">
            <td className="px-4 py-3.5 align-top text-sm leading-relaxed text-[#2D3748]">
                <span className="font-medium">{row.title}</span>
                {row.missing && (
                    <span className="mt-1 block text-[11px] font-semibold text-amber-600">
                        Section not found in draft
                    </span>
                )}
            </td>
            <td className="w-[5.5rem] px-4 py-3.5 align-top text-right tabular-nums text-sm font-semibold text-[#2D3748]">
                {row.densityPercent}%
            </td>
        </tr>
    );

    const renderGroupHeader = (level: string) => (
        <tr className="bg-[#EDF2F7]">
            <th
                colSpan={2}
                className="border-t border-neutral-200 px-4 py-2 text-left text-[10px] font-black uppercase tracking-widest text-[#718096]"
            >
                {level}
            </th>
        </tr>
    );

    if (rows.length === 0) {
        return <p className="text-sm text-[#A0AEC0]">No headings detected yet.</p>;
    }

    return (
        <div className="overflow-hidden rounded-lg border border-neutral-200">
            <table className="w-full border-collapse text-left">
                <thead>
                    <tr className="border-b border-neutral-200 bg-[#F7FAFC]">
                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-[#718096]">
                            Section
                        </th>
                        <th className="w-[5.5rem] px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-[#718096]">
                            <span className="inline-flex items-center justify-end gap-1">
                                Density
                                <HelpTip text="Share of words in that section (heading + body) that match this heading’s key terms — higher means the copy reinforces the H1/H2 topic." />
                            </span>
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white">
                    {h1Rows.length > 0 && (
                        <>
                            {renderGroupHeader("H1")}
                            {h1Rows.map(renderRow)}
                        </>
                    )}
                    {h2Rows.length > 0 && (
                        <>
                            {renderGroupHeader("H2")}
                            {h2Rows.map(renderRow)}
                        </>
                    )}
                </tbody>
            </table>
        </div>
    );
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

function computeSeoScoresFromMarkdown(
    markdown: string,
    fallback: SeoScores,
    plagiarismSimilarity = 0,
): SeoScores {
    const h = getHeuristic(markdown);
    const base = normalizeSeoScores(fallback, plagiarismSimilarity);
    return {
        ...base,
        readability: Math.min(100, Math.max(0, Math.round(h.read))),
        grammar: Math.min(100, Math.max(0, Math.round(h.struct))),
    };
}

function resolveEditorMarkdown(
    contentMarkdown: string | undefined,
    post: BlogPost,
    domain?: string,
): string {
    const raw = String(contentMarkdown || post.contentMarkdown || "").trim();
    return rewriteMarkdownInternalLinksToAbsolute(
        applyHeadingStructureForEditor(raw, post),
        domain,
    );
}

function applyHeadingStructureForEditor(contentMarkdown: string, post: BlogPost): string {
    let markdown = String(contentMarkdown || "").trim();
    const hasH1 = /^#\s+/m.test(markdown);
    const hasH2 = /^##\s+/m.test(markdown);

    if (!hasH1 && post.h1Title) {
        markdown = `# ${post.h1Title}\n\n${markdown}`;
    }

    if (!hasH2 && Array.isArray(post.h2Suggestions) && post.h2Suggestions.length > 0) {
        const normalized = post.h2Suggestions.map((h) => h.trim()).filter(Boolean).slice(0, 6);
        if (normalized.length > 0) {
            const h2Scaffold = normalized.map((h2) => `## ${h2}\n\n`).join("");
            markdown = `${markdown}\n\n${h2Scaffold}`.trim();
        }
    }

    return markdown;
}

export function OptimizationAgentUI({
    post,
    businessContext,
    interlinkingRules = null,
    primaryKeyword,
    onComplete,
}: OptimizationAgentProps) {
    const [optimizedData, setOptimizedData] = useState<OptimizedContent | null>(null);
    const [loading, setLoading] = useState(false);
    const [isRefining, setIsRefining] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState("");
    const [liveScores, setLiveScores] = useState<SeoScores | null>(null);
    const latestRequestRef = useRef(0);
    const editorRef = useRef<ArticleContentEditorHandle>(null);
    const [contentPatches, setContentPatches] = useState<string[]>([]);
    const [aiPrompt, setAiPrompt] = useState("");
    const [aiEditMode, setAiEditMode] = useState<ContentEditMode | null>(null);
    const [isAiEditing, setIsAiEditing] = useState(false);
    const [aiEditError, setAiEditError] = useState<string | null>(null);
    const [scoreDeltas, setScoreDeltas] = useState<SeoScoreDeltas | null>(null);
    const [refineFeedback, setRefineFeedback] = useState<RefineFeedback | null>(null);
    const [highlightScores, setHighlightScores] = useState(false);
    const [factSources, setFactSources] = useState<FactSource[]>([]);
    const [factModeEnabled, setFactModeEnabled] = useState(false);
    const [editorMountKey, setEditorMountKey] = useState(0);
    const [loadingPhase, setLoadingPhase] = useState<"links" | "optimize">("optimize");
    const [loadingSeconds, setLoadingSeconds] = useState(0);
    const [isRefreshingMetrics, setIsRefreshingMetrics] = useState(false);
    const optimizeAbortRef = useRef<AbortController | null>(null);
    const resultsTopRef = useRef<HTMLDivElement>(null);
    const postOptimizeKey = `${post.slug}|${post.contentMarkdown?.length ?? 0}`;

    useEffect(() => {
        if (loading || !optimizedData) return;
        const scrollToResults = () => {
            window.scrollTo({ top: 0, left: 0, behavior: "auto" });
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
            resultsTopRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
        };
        requestAnimationFrame(() => requestAnimationFrame(scrollToResults));
    }, [loading, optimizedData]);

    useEffect(() => {
        if (!isEditing || !optimizedData) return;
        setEditedContent(resolveEditorMarkdown(optimizedData.contentMarkdown, post, businessContext.domain));
        setFactSources(optimizedData.factSources?.length ? optimizedData.factSources : post.factSources ?? []);
    }, [isEditing, optimizedData, post]);

    // Sync analyzer scores from optimized draft when not editing
    useEffect(() => {
        if (optimizedData && !isEditing) {
            setLiveScores(
                normalizeSeoScores(
                    optimizedData.seoScores,
                    optimizedData.plagiarismReport?.overallSimilarity ?? 0,
                ),
            );
        }
    }, [optimizedData, isEditing]);

    useEffect(() => {
        if (!scoreDeltas && !highlightScores) return;
        const t = window.setTimeout(() => {
            setScoreDeltas(null);
            setHighlightScores(false);
        }, 5000);
        return () => window.clearTimeout(t);
    }, [scoreDeltas, highlightScores]);

    // Live update scores as user types
    useEffect(() => {
        if (!isEditing || !optimizedData?.seoScores) return;

        const baseH = getHeuristic(optimizedData.contentMarkdown);
        const currH = getHeuristic(editedContent);

        const deltaRead = currH.read - baseH.read;
        const deltaStruct = currH.struct - baseH.struct;
        const base = normalizeSeoScores(
            optimizedData.seoScores,
            optimizedData.plagiarismReport?.overallSimilarity ?? 0,
        );

        setLiveScores({
            ...base,
            readability: Math.min(100, Math.max(0, Math.round(base.readability + deltaRead))),
            grammar: Math.min(100, Math.max(0, Math.round(base.grammar + deltaStruct * 0.5))),
        });
    }, [editedContent, isEditing, optimizedData]);

    useEffect(() => {
        if (!loading) {
            setLoadingSeconds(0);
            return;
        }
        const tick = window.setInterval(() => setLoadingSeconds((s) => s + 1), 1000);
        return () => window.clearInterval(tick);
    }, [loading]);

    useEffect(() => {
        const controller = new AbortController();
        optimizeAbortRef.current = controller;

        const fetchOptimization = async () => {
            const requestId = ++latestRequestRef.current;
            setLoading(true);
            setLoadingPhase("links");
            setError(null);
            try {
                setLoadingPhase("optimize");
                const data = await requestContentOptimization(
                    post,
                    businessContext,
                    interlinkingRules,
                    { signal: controller.signal },
                );

                if (latestRequestRef.current !== requestId) return;
                setOptimizedData(data.optimized);
                setFactSources(
                    data.optimized.factSources?.length
                        ? data.optimized.factSources
                        : post.factSources ?? [],
                );
                setLiveScores(
                    normalizeSeoScores(
                        data.optimized.seoScores,
                        data.optimized.plagiarismReport?.overallSimilarity ?? 0,
                    ),
                );
                setRefineFeedback(null);
                setScoreDeltas(null);
                setError(null);
            } catch (err) {
                if (latestRequestRef.current !== requestId) return;
                setError(optimizationErrorMessage(err));
            } finally {
                if (latestRequestRef.current === requestId) {
                    setLoading(false);
                    optimizeAbortRef.current = null;
                }
            }
        };

        void fetchOptimization();

        return () => {
            controller.abort();
            optimizeAbortRef.current = null;
        };
    }, [postOptimizeKey, interlinkingRules, businessContext]);

    const handleAddContentPatch = () => {
        const text = editorRef.current?.getSelectionText() ?? "";
        if (!text.trim()) {
            setAiEditError("Highlight text in the editor, then click Modify selected.");
            return;
        }
        setAiEditError(null);
        setContentPatches((prev) => {
            if (prev.some((p) => p === text)) return prev;
            return [...prev, text].slice(0, 12);
        });
    };

    const handleAiContentEdit = async () => {
        if (!aiPrompt.trim()) {
            setAiEditError("Enter a prompt describing what you want changed or added.");
            return;
        }
        if (contentPatches.length === 0 && !aiEditMode) {
            setAiEditError("Choose Modify all or Add content, or highlight text and use Modify selected.");
            return;
        }
        const mode: ContentEditMode =
            contentPatches.length > 0 ? "patch" : aiEditMode!;

        setIsAiEditing(true);
        setAiEditError(null);
        try {
            const res = await fetch("/api/content-edit-agent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contentMarkdown: editedContent,
                    prompt: aiPrompt.trim(),
                    mode,
                    patches: contentPatches,
                    title: optimizedData?.title ?? post.title,
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? "AI edit failed");
            setEditedContent(json.contentMarkdown);
            setAiPrompt("");
            if (mode === "patch") setContentPatches([]);
        } catch (e) {
            setAiEditError(e instanceof Error ? e.message : "AI edit failed");
        } finally {
            setIsAiEditing(false);
        }
    };

    const handleRefine = async () => {
        if (!optimizedData) return;
        const prevScores = normalizeSeoScores(
            optimizedData.seoScores,
            optimizedData.plagiarismReport?.overallSimilarity ?? 0,
        );

        const controller = new AbortController();
        optimizeAbortRef.current = controller;

        setLoading(true);
        setIsRefining(true);
        setLoadingPhase("optimize");
        setError(null);
        setRefineFeedback(null);
        setScoreDeltas(null);
        setHighlightScores(false);

        try {
            const refinePayload: BlogPost = {
                ...post,
                title: optimizedData.title,
                slug: optimizedData.slug,
                metaDescription: optimizedData.metaDescription,
                contentMarkdown: optimizedData.contentMarkdown,
                faqs: optimizedData.faqs,
            };

            const data = await requestContentOptimization(
                refinePayload,
                businessContext,
                interlinkingRules,
                { isRefining: true, signal: controller.signal },
            );
            const attempted = data.optimized;
            const attemptedScores = normalizeSeoScores(
                attempted.seoScores,
                attempted.plagiarismReport?.overallSimilarity ?? 0,
            );

            if (data.parseWarning) {
                setRefineFeedback({
                    type: "discarded",
                    message:
                        "Auto-fix could not apply changes (optimizer response invalid). Your draft and scores are unchanged.",
                });
                return;
            }

            const prevTotal = seoQualityTotal(prevScores);
            const newTotal = seoQualityTotal(attemptedScores);

            if (newTotal <= prevTotal) {
                setRefineFeedback({
                    type: "discarded",
                    message:
                        "Auto-fix did not improve readability, grammar, or originality. Changes were discarded — try Edit Content or adjust the draft manually.",
                });
                return;
            }

            const deltas: SeoScoreDeltas = {
                readability: attemptedScores.readability - prevScores.readability,
                grammar: attemptedScores.grammar - prevScores.grammar,
                originality: attemptedScores.originality - prevScores.originality,
            };

            setOptimizedData({ ...attempted, seoScores: attemptedScores });
            setFactSources(
                attempted.factSources?.length
                    ? attempted.factSources
                    : post.factSources ?? [],
            );
            setLiveScores(attemptedScores);
            setScoreDeltas(deltas);
            setHighlightScores(true);
            setRefineFeedback({
                type: "improved",
                message: `Quality scores improved (readability +${Math.max(0, deltas.readability)}, grammar +${Math.max(0, deltas.grammar)}).`,
            });
        } catch (err) {
            setError(optimizationErrorMessage(err));
        } finally {
            setLoading(false);
            setIsRefining(false);
            optimizeAbortRef.current = null;
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
                    {isRefining ? REFINE_LOADING_TITLE : OPTIMIZATION_LOADING_TITLE}
                </h3>
                {isRefining && (
                    <p className="mt-2 text-sm text-neutral-300 max-w-md mx-auto font-medium">
                        {REFINE_LOADING_DETAIL}
                    </p>
                )}
                {!isRefining && loadingPhase === "links" && (
                    <p className="mt-2 text-sm text-neutral-300 max-w-md mx-auto font-medium">
                        {OPTIMIZATION_LINKS_PHASE}
                    </p>
                )}
                {!isRefining && loadingPhase === "optimize" && (
                    <ul className="mt-4 mx-auto max-w-sm text-left space-y-1.5">
                        {OPTIMIZATION_LOADING_STEPS.map((step, i) => {
                            const active = optimizationLoadingStepIndex(loadingSeconds) === i;
                            return (
                                <li
                                    key={step}
                                    className={`text-xs flex items-center gap-2 ${active ? "text-emerald-400 font-semibold" : "text-neutral-600"}`}
                                >
                                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${active ? "bg-emerald-400" : "bg-neutral-700"}`} />
                                    {step}
                                </li>
                            );
                        })}
                    </ul>
                )}
                <p className="mt-4 text-[11px] text-neutral-600 max-w-md mx-auto">
                    {!isRefining && loadingPhase === "optimize" ? OPTIMIZATION_TIMING_NOTE : null}
                    {loadingSeconds > 0 && (
                        <span className={!isRefining && loadingPhase === "optimize" ? " block mt-1 font-mono" : " font-mono"}>
                            {loadingSeconds}s elapsed
                        </span>
                    )}
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
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        type="button"
                        onClick={() => {
                            setError(null);
                            const requestId = ++latestRequestRef.current;
                            const controller = new AbortController();
                            optimizeAbortRef.current = controller;
                            setLoading(true);
                            setLoadingPhase("optimize");
                            void requestContentOptimization(post, businessContext, interlinkingRules, {
                                signal: controller.signal,
                            })
                                .then((data) => {
                                    if (latestRequestRef.current !== requestId) return;
                                    setOptimizedData(data.optimized);
                                    setLiveScores(
                    normalizeSeoScores(
                        data.optimized.seoScores,
                        data.optimized.plagiarismReport?.overallSimilarity ?? 0,
                    ),
                );
                                    setError(null);
                                })
                                .catch((e) => setError(optimizationErrorMessage(e)))
                                .finally(() => {
                                    setLoading(false);
                                    optimizeAbortRef.current = null;
                                });
                        }}
                        className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-500"
                    >
                        Retry optimization
                    </button>
                </div>
            </div>
        );
    }

    if (!optimizedData) return null;

    const analyzerMarkdown = isEditing ? editedContent : optimizedData.contentMarkdown;
    const linkSummary = linkCountSummary(analyzerMarkdown, interlinkingRules);
    const headingRows = buildHeadingTagRows(analyzerMarkdown, post);

    // Render optimized markdown with internal links (markdown already contains links)
    return (
        <div
            ref={resultsTopRef}
            className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 shadow-xl animate-in slide-in-from-bottom-4 duration-500 scroll-mt-24"
        >
            <div className="flex items-center gap-3 mb-6 border-b border-neutral-800 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-900/30 text-emerald-400 border border-emerald-800/50">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M4.804 21.644A6.707 6.707 0 006 21.75a6.721 6.721 0 003.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543-.11.554-.334 1.258-.694 2.19-.089.231-.225.598-.41.97l-.017.032c-.066.12-.132.241-.197.362a.75.75 0 00.933 1.054 13.924 13.924 0 003.111-1.706zM9.75 9.75a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-4.5zm0 3a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-4.5z" clipRule="evenodd" />
                    </svg>
                </div>
                <div>
                    <h2 className="text-xl font-semibold text-neutral-100">Optimized Content</h2>
                    <p className="text-xs text-neutral-400">{OPTIMIZED_CONTENT_SUBTITLE}</p>
                    {(linkSummary.min != null || linkSummary.max != null) && (
                        <p
                            className={`mt-1 text-[11px] font-medium ${
                                linkSummary.metMin ? "text-emerald-400" : "text-amber-400"
                            }`}
                        >
                            Internal links in article: {linkSummary.count}
                            {linkSummary.min != null && linkSummary.max != null
                                ? ` (target ${linkSummary.min}–${linkSummary.max})`
                                : linkSummary.min != null
                                  ? ` (target at least ${linkSummary.min})`
                                  : ` (target at most ${linkSummary.max})`}
                            {!linkSummary.metMin ? " — open Edit content to add more if needed." : ""}
                        </p>
                    )}
                </div>
            </div>

            {/* SEO Analyzer */}
            {liveScores && (
                <div className="mb-6 rounded-xl border border-neutral-800 bg-[#FAFAFA] text-neutral-900 p-6 md:p-8">
                    <div className="flex items-center gap-2 mb-6 text-neutral-800">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                        </svg>
                        <h2 className="text-xl font-bold">SEO Analyzer</h2>
                    </div>

                    <div className="flex flex-col gap-6">
                        <div
                            className={`rounded-xl border border-neutral-200 bg-white p-6 shadow-sm flex flex-col space-y-5 transition-all duration-500 ${
                                highlightScores ? "ring-2 ring-emerald-300 ring-offset-1" : ""
                            }`}
                        >
                            <SeoMetricBar
                                label="Readability"
                                value={liveScores.readability}
                                barClass="bg-[#eab308]"
                                help="How easy the post is to read. Higher scores mean clearer sentences and better flow."
                                delta={scoreDeltas?.readability}
                            />
                            <SeoMetricBar
                                label="Originality"
                                value={liveScores.originality}
                                barClass="bg-[#3b82f6]"
                                help="How original the copy is versus known sources. Higher is better for avoiding duplicate-content penalties."
                                delta={scoreDeltas?.originality}
                            />
                            <SeoMetricBar
                                label="Grammar"
                                value={liveScores.grammar}
                                barClass="bg-[#22c55e]"
                                help="Grammar and mechanics quality across headings and body copy."
                                delta={scoreDeltas?.grammar}
                            />
                            <SeoMetricBar
                                label="AI Content%"
                                value={liveScores.aiContentPercent}
                                barClass="bg-[#a855f7]"
                                help="Estimated share of text that reads AI-generated. Lower is better."
                                suffix={`${liveScores.aiContentPercent}%`}
                            />
                            <div className="pt-2 border-t border-neutral-100">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-sm font-semibold text-[#4A5568]">Internal links</span>
                                        <HelpTip text="Number of on-site links in the article body (your domain and published blog posts only)." />
                                    </div>
                                    <span className="text-sm font-bold text-[#2D3748]">{linkSummary.count}</span>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
                            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-[#718096]">
                                Heading tags
                            </h3>
                            <HeadingTagsPanel rows={headingRows} />
                        </div>
                    </div>
                </div>
            )}
            {/* Next step — on the dark shell, not inside the light SEO card */}
            {!isEditing && (
                <div className="mb-6 border-t border-neutral-800 pt-6 space-y-4">
                    {refineFeedback && (
                        <div
                            className={`rounded-lg border px-4 py-3 text-sm ${
                                refineFeedback.type === "improved"
                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                                    : "border-neutral-700 bg-neutral-900/80 text-neutral-300"
                            }`}
                        >
                            {refineFeedback.message}
                        </div>
                    )}
                    <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                const md = resolveEditorMarkdown(
                                    optimizedData.contentMarkdown,
                                    post,
                                    businessContext.domain,
                                );
                                setEditedContent(md);
                                setFactSources(optimizedData.factSources?.length ? optimizedData.factSources : post.factSources ?? []);
                                setContentPatches([]);
                                setAiPrompt("");
                                setAiEditMode(null);
                                setAiEditError(null);
                                setEditorMountKey((k) => k + 1);
                                setIsEditing(true);
                            }}
                            className="inline-flex w-full sm:flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-8 py-4 text-sm font-black uppercase tracking-widest text-white transition-all hover:bg-emerald-500 shadow-lg shadow-emerald-900/25 active:scale-[0.99]"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                            Edit content
                        </button>
                        {liveScores?.actionableInsights?.length ? (
                            <button
                                type="button"
                                onClick={handleRefine}
                                disabled={loading}
                                className="inline-flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-xl border border-neutral-700 bg-neutral-900 px-6 py-4 text-sm font-bold text-neutral-200 transition-colors hover:border-neutral-600 hover:bg-neutral-800 hover:text-white disabled:opacity-50"
                            >
                                {loading ? (
                                    <ButtonSpinner size={16} />
                                ) : (
                                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                    </svg>
                                )}
                                {loading ? "Refining…" : "Auto-fix issues"}
                            </button>
                        ) : null}
                    </div>
                </div>
            )}

            {/* Inline Editor for manual corrections */}
            {isEditing && liveScores && (
                <div className="fixed inset-0 z-[100] flex flex-col bg-neutral-950 p-4 md:p-8 animate-in fade-in duration-300 overflow-hidden">
                    <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl overflow-hidden">
                        <div className="shrink-0 border-b border-neutral-800 bg-neutral-950/50">
                            <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald-800/50 bg-emerald-900/30 text-emerald-400">
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                            />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-black uppercase tracking-tighter text-white">
                                        Edit Content
                                    </h3>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditedContent(
                                                resolveEditorMarkdown(
                                                    optimizedData.contentMarkdown,
                                                    post,
                                                    businessContext.domain,
                                                ),
                                            );
                                            setFactSources(
                                                optimizedData.factSources?.length
                                                    ? optimizedData.factSources
                                                    : post.factSources ?? [],
                                            );
                                            setContentPatches([]);
                                            setAiPrompt("");
                                            setAiEditError(null);
                                            setIsEditing(false);
                                        }}
                                        className="rounded-lg px-4 py-2 text-sm font-bold text-neutral-400 transition-colors hover:text-white"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setOptimizedData((prev) =>
                                                prev
                                                    ? {
                                                          ...prev,
                                                          contentMarkdown: editedContent,
                                                          seoScores: liveScores ?? prev.seoScores,
                                                          factSources,
                                                      }
                                                    : prev,
                                            );
                                            setIsEditing(false);
                                        }}
                                        className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 transition-all hover:bg-emerald-500 active:scale-95"
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                            <div className="border-t border-neutral-800/80 px-4 pb-4 pt-3 sm:px-6">
                                <div
                                    className="flex items-stretch rounded-xl border border-neutral-800 bg-neutral-900/70 overflow-hidden"
                                    title="Live quality metrics for the current draft"
                                >
                                    <div className="flex flex-1 items-center gap-3 overflow-x-auto px-3 py-2 sm:gap-4 sm:px-4 custom-scrollbar">
                                        <EditContentMetric label="Readability" value={liveScores!.readability} suffix="%" />
                                        <EditContentMetric label="Originality" value={liveScores!.originality} suffix="%" />
                                        <EditContentMetric label="Grammar" value={liveScores!.grammar} suffix="%" />
                                        <EditContentMetric
                                            label="AI Content%"
                                            value={liveScores!.aiContentPercent}
                                            suffix="%"
                                        />
                                        <EditContentMetric label="Internal links" value={linkSummary.count} suffix="" />
                                    </div>
                                    <button
                                        type="button"
                                        disabled={isRefreshingMetrics}
                                        onClick={() => {
                                            if (!optimizedData || !liveScores) return;
                                            setIsRefreshingMetrics(true);
                                            try {
                                                const refreshed = computeSeoScoresFromMarkdown(
                                                    editedContent,
                                                    liveScores,
                                                    optimizedData.plagiarismReport?.overallSimilarity ?? 0,
                                                );
                                                setLiveScores(refreshed);
                                                setHighlightScores(true);
                                            } finally {
                                                setIsRefreshingMetrics(false);
                                            }
                                        }}
                                        className="flex flex-col items-center justify-center gap-1 border-l border-neutral-800 bg-neutral-950/50 px-3 py-2 min-w-[4.5rem] text-neutral-400 transition-colors hover:bg-neutral-800/80 hover:text-emerald-400 disabled:opacity-50 sm:px-4"
                                        title="Recalculate all metrics from current article text"
                                    >
                                        {isRefreshingMetrics ? (
                                            <ButtonSpinner size={14} />
                                        ) : (
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth="2"
                                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                                />
                                            </svg>
                                        )}
                                        <span className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">
                                            Refresh
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="shrink-0 border-b border-neutral-800 bg-neutral-950/80 px-4 py-4 md:px-6">
                            <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                                <div className="flex-1 min-w-0 space-y-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 shrink-0">
                                            AI edit
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handleAddContentPatch}
                                            className={contentPatches.length > 0 ? AI_EDIT_BTN_ACTIVE : AI_EDIT_BTN}
                                        >
                                            Modify selected
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAiEditMode((m) => (m === "modify" ? null : "modify"));
                                                setAiEditError(null);
                                            }}
                                            className={aiEditMode === "modify" ? AI_EDIT_BTN_ACTIVE : AI_EDIT_BTN}
                                        >
                                            Modify all
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAiEditMode((m) => (m === "add" ? null : "add"));
                                                setAiEditError(null);
                                            }}
                                            className={aiEditMode === "add" ? AI_EDIT_BTN_ACTIVE : AI_EDIT_BTN}
                                        >
                                            Add content
                                        </button>
                                        {contentPatches.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setContentPatches([])}
                                                className="text-[10px] font-bold text-neutral-500 hover:text-white uppercase"
                                            >
                                                Clear ({contentPatches.length})
                                            </button>
                                        )}
                                    </div>
                                    {contentPatches.length > 0 && (
                                        <ul className="space-y-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                                            {contentPatches.map((patch, i) => (
                                                <li key={i} className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1.5">
                                                    <span className="text-[10px] font-black text-emerald-500 shrink-0">{i + 1}</span>
                                                    <p className="text-xs text-neutral-300 line-clamp-2 flex-1">{patch}</p>
                                                    <button type="button" onClick={() => setContentPatches((p) => p.filter((_, idx) => idx !== i))} className="text-neutral-500 hover:text-red-400">×</button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} rows={2} placeholder="Describe what to change or add…" className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 resize-none" />
                                    {aiEditError && <p className="text-xs text-amber-400">{aiEditError}</p>}
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAiContentEdit}
                                    disabled={
                                        isAiEditing ||
                                        !aiPrompt.trim() ||
                                        (contentPatches.length === 0 && !aiEditMode)
                                    }
                                    className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-xs font-black text-white uppercase shadow-lg shadow-emerald-900/25 hover:bg-emerald-500 disabled:opacity-40 transition-colors"
                                >
                                    {isAiEditing && <ButtonSpinner size={16} />}
                                    {isAiEditing ? "Applying…" : "Apply AI"}
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 min-h-0 flex flex-col p-4 md:p-6 pt-3 overflow-y-auto">
                            <div className="flex-1 min-h-[min(52vh,640px)] flex flex-col min-w-0">
                                {!editedContent.trim() && (
                                    <p className="mb-2 shrink-0 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                                        No draft text loaded. Paste your article below, or cancel and regenerate the draft.
                                    </p>
                                )}
                                <ArticleContentEditor
                                    key={editorMountKey}
                                    ref={editorRef}
                                    fillHeight
                                    value={editedContent}
                                    onChange={(md) =>
                                        setEditedContent(
                                            rewriteMarkdownInternalLinksToAbsolute(
                                                md,
                                                businessContext.domain,
                                            ),
                                        )
                                    }
                                    internalLinks={businessContext.internalLinks?.map((l) => ({
                                        ...l,
                                        href: toAbsoluteSiteHref(l.href, businessContext.domain),
                                    }))}
                                    factSources={factSources}
                                    onRemoveFactSource={(id) =>
                                        setFactSources((prev) => prev.filter((f) => f.id !== id))
                                    }
                                    factModeEnabled={factModeEnabled}
                                    onFactModeChange={setFactModeEnabled}
                                />
                            </div>
                        </div>

                    </div>
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
