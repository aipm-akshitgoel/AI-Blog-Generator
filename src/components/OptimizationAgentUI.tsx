import { useState, useEffect, useRef, type ReactNode } from "react";
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
    OPTIMIZATION_LOADING_TITLE,
    OPTIMIZATION_TIMING_NOTE,
    OPTIMIZED_CONTENT_SUBTITLE,
    getOptimizationLoadingSteps,
    optimizationLoadingStepIndex,
} from "@/lib/optimizationCopy";
import {
    isTocFinalized,
    normalizeInterlinkingRules,
    type ContentConstraints,
    type InterlinkingRules,
} from "@/lib/types/contentSpec";
import { DEFAULT_INTERLINKING_RULES } from "@/lib/types/topicBrief";
import { linkCountSummary, rewriteMarkdownInternalLinksToAbsolute } from "@/lib/interlinking";
import { stripFaqFromMarkdownWhenStructured } from "@/lib/contentWordCount";
import { toAbsoluteSiteHref } from "@/lib/domainLinks";
import { normalizeSeoScores, type KeywordDensityRow } from "@/lib/seoAnalyzer";
import {
    buildLocalKeywordPlanVerification,
    keywordVerificationToDensityRows,
    resolveKeywordPlanForPost,
} from "@/lib/keywordPlanVerification";
import type { KeywordDensityVerification } from "@/lib/types/keywordPlan";
import type { SeoScores } from "@/lib/types/optimization";
import { AI_DETECTION_TARGET_PERCENT_MAX } from "@/lib/zerogptAiDetection";

const METRIC_BAR_GOOD = "bg-emerald-500";
const METRIC_BAR_WARN = "bg-amber-500";
const METRIC_BAR_READABILITY_MID = "bg-[#eab308]";
const METRIC_BAR_AI_MID = "bg-[#a855f7]";

/** Flesch ease bar + grade target: green when at or below 8th grade or ease ≥ 60. */
function readabilityBarClass(scores: SeoScores): string {
    if (scores.readabilityGrade?.targetMet === true) return METRIC_BAR_GOOD;
    if (scores.readabilityGrade?.targetMet === false) return METRIC_BAR_WARN;
    if (!scores.readabilityGrade) return METRIC_BAR_WARN;
    if (scores.readabilityGrade.fleschScore >= 60 || scores.readability >= 60) return METRIC_BAR_GOOD;
    if (scores.readability >= 45) return METRIC_BAR_READABILITY_MID;
    return METRIC_BAR_WARN;
}

function readabilityMetricDisplay(scores: SeoScores): { suffix: string; help: string } {
    const grade = scores.readabilityGrade;
    if (!grade) {
        return {
            suffix: "Not verified",
            help: "SEO Review Tools did not return a readability score. Check SEO_REVIEW_TOOLS_API_KEY on the server, then re-run Optimize or Refresh.",
        };
    }
    return {
        suffix: `${scores.readability}/100`,
        help: "Flesch Reading Ease (0–100) from SEO Review Tools. Higher means easier to read.",
    };
}

const METRIC_BAR_PENDING = "bg-neutral-300 animate-pulse";

/** Lower AI % is better: green when below 20% target. */
function aiContentBarClass(scores: SeoScores): string {
    if (scores.aiDetection?.provider !== "zerogpt") return METRIC_BAR_AI_MID;
    const pct = scores.aiDetection.aiPercent;
    if (scores.aiDetection.targetMet === true) return METRIC_BAR_GOOD;
    if (pct < AI_DETECTION_TARGET_PERCENT_MAX) return METRIC_BAR_GOOD;
    if (pct < 50) return METRIC_BAR_WARN;
    return METRIC_BAR_WARN;
}

/** Only show AI % after ZeroGPT — never the optimizer's estimated aiContentPercent. */
function formatAiContentDisplay(
    scores: SeoScores | null | undefined,
    detectionResolved: boolean,
): { value: number; suffix: string; barClass: string; help: string } {
    if (scores?.aiDetection?.provider === "zerogpt") {
        const pct = scores.aiDetection.aiPercent;
        const rounded = Math.round(pct * 10) / 10;
        return {
            value: rounded,
            suffix: `${rounded}%`,
            barClass: aiContentBarClass(scores),
            help: "Verified with ZeroGPT on this draft. Lower is better. Green = below 20%.",
        };
    }
    if (!detectionResolved) {
        return {
            value: 0,
            suffix: "Checking…",
            barClass: METRIC_BAR_PENDING,
            help: "Running ZeroGPT on this draft. The score appears when verification finishes.",
        };
    }
    return {
        value: 0,
        suffix: "Unavailable",
        barClass: METRIC_BAR_AI_MID,
        help: "ZeroGPT could not score this draft. Use Refresh in the editor or check ZEROGPT_API_KEY.",
    };
}

import { ZeroGptBadge } from "@/components/ZeroGptBadge";
import { SeoReviewToolsBadge } from "@/components/SeoReviewToolsBadge";
import { refreshOptimizerMetrics } from "@/lib/refreshOptimizerMetricsClient";

interface OptimizationAgentProps {
    post: BlogPost;
    businessContext: import("@/lib/types/businessContext").BusinessContext;
    interlinkingRules?: InterlinkingRules | null;
    contentConstraints?: ContentConstraints | null;
    primaryKeyword?: string;
    onComplete?: (optimized: OptimizedContent) => void;
}

type SeoScoreDeltas = {
    readability: number;
    aiContentPercent: number;
};

function SeoMetricBar({
    label, value, max = 100, barClass, help, suffix, delta, brand,
}: {
    label: string;
    value: number;
    max?: number;
    barClass: string;
    help: string;
    suffix?: string;
    delta?: number;
    brand?: ReactNode;
}) {
    const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
    return (
        <div>
            <div className="flex justify-between items-start mb-2">
                <div>
                    <div className="flex items-center gap-2">
                        {brand}
                        <span className="text-sm font-semibold text-[#4A5568]">{label}</span>
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
}: {
    label: string;
    value: number | string;
}) {
    return (
        <div className="flex items-baseline gap-1.5 min-w-[4.5rem] shrink-0 whitespace-nowrap">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">{label}</span>
            <span className="text-sm font-bold text-neutral-200 tabular-nums">{value}</span>
        </div>
    );
}

function keywordTierColumnLabel(level: KeywordDensityRow["level"]): string {
    switch (level) {
        case "primary":
            return "Primary keyword";
        case "secondary":
            return "Secondary keyword";
        case "tertiary":
            return "Tertiary keyword";
        case "domain":
            return "Domain keyword";
        default:
            return "Keyword";
    }
}

/** Section hint from labels like "Secondary keyword · Section title". */
function keywordSectionHint(label: string): string | null {
    const parts = label.split("·").map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) return null;
    const head = parts[0]!.toLowerCase();
    if (!head.includes("keyword")) return null;
    return parts.slice(1).join(" · ");
}

function KeywordDensityPanel({ rows }: { rows: KeywordDensityRow[] }) {
    if (rows.length === 0) return null;

    return (
        <div className="overflow-hidden rounded-lg border border-neutral-200">
            <table className="w-full border-collapse text-left">
                <thead>
                    <tr className="border-b border-neutral-200 bg-[#F7FAFC]">
                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-[#718096]">
                            Type
                        </th>
                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-[#718096]">
                            Keyword
                        </th>
                        <th className="w-[4.5rem] px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-[#718096]">
                            Target
                        </th>
                        <th className="w-[4.5rem] px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-[#718096]">
                            Actual
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white">
                    {rows.map((row) => {
                        const sectionHint = keywordSectionHint(row.label);
                        return (
                            <tr key={`${row.level}-${row.label}-${row.keyword}`} className="border-t border-neutral-100">
                                <td className="px-4 py-3 align-top text-sm font-medium text-[#2D3748]">
                                    {keywordTierColumnLabel(row.level)}
                                </td>
                                <td className="px-4 py-3 align-top text-sm text-[#2D3748]">
                                    <span className="font-medium">{row.keyword}</span>
                                    {sectionHint ? (
                                        <span className="mt-1 block text-[11px] text-[#718096]">{sectionHint}</span>
                                    ) : null}
                                    {row.missing && (
                                        <span className="mt-1 block text-[11px] font-semibold text-amber-600">
                                            Planned section heading not found in article
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-3 align-top text-right text-sm tabular-nums text-[#718096]">
                                    {row.targetPercent != null ? `${row.targetPercent}%` : "—"}
                                </td>
                                <td className="px-4 py-3 align-top text-right text-sm font-semibold tabular-nums text-[#2D3748]">
                                    {row.densityPercent}%
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function resolveEditorMarkdown(
    contentMarkdown: string | undefined,
    post: BlogPost,
    domain?: string,
): string {
    const raw = stripFaqFromMarkdownWhenStructured(
        String(contentMarkdown || post.contentMarkdown || "").trim(),
        post.faqs,
    );
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
    contentConstraints = null,
    primaryKeyword,
    onComplete,
}: OptimizationAgentProps) {
    const [optimizedData, setOptimizedData] = useState<OptimizedContent | null>(null);
    const [loading, setLoading] = useState(false);
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
    const [highlightScores, setHighlightScores] = useState(false);
    const [factSources, setFactSources] = useState<FactSource[]>([]);
    const [factModeEnabled, setFactModeEnabled] = useState(false);
    const [editorMountKey, setEditorMountKey] = useState(0);
    const [loadingPhase, setLoadingPhase] = useState<"links" | "optimize">("optimize");
    const [loadingSeconds, setLoadingSeconds] = useState(0);
    const [isRefreshingMetrics, setIsRefreshingMetrics] = useState(false);
    const [metricsRefreshError, setMetricsRefreshError] = useState<string | null>(null);
    const [aiDetectionResolved, setAiDetectionResolved] = useState(false);
    const optimizeAbortRef = useRef<AbortController | null>(null);
    const resultsTopRef = useRef<HTMLDivElement>(null);
    const postOptimizeKey = `${post.slug}|${post.contentMarkdown?.length ?? 0}`;
    const tocFinalized = isTocFinalized(contentConstraints);
    const optimizationLoadingSteps = getOptimizationLoadingSteps(tocFinalized);

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

    useEffect(() => {
        if (!optimizedData || isEditing) return;
        if (liveScores?.keywordDensity?.rows?.length) return;

        const plan = resolveKeywordPlanForPost(
            {
                ...post,
                contentMarkdown: optimizedData.contentMarkdown,
                keywordPlan: post.keywordPlan ?? optimizedData.seoScores?.keywordPlan,
            },
            contentConstraints,
            primaryKeyword,
        );
        if (!plan) return;

        let cancelled = false;
        void fetch("/api/keyword-density", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                markdown: optimizedData.contentMarkdown,
                post: {
                    ...post,
                    contentMarkdown: optimizedData.contentMarkdown,
                    keywordPlan: plan,
                },
                constraints: contentConstraints ?? null,
                strategyPrimary: primaryKeyword,
            }),
        })
            .then((res) => (res.ok ? res.json() : null))
            .then((data: KeywordDensityVerification | null) => {
                if (cancelled || !data?.rows?.length) return;
                setLiveScores((prev) => {
                    const base =
                        prev ??
                        normalizeSeoScores(
                            optimizedData.seoScores,
                            optimizedData.plagiarismReport?.overallSimilarity ?? 0,
                        );
                    return { ...base, keywordDensity: data, keywordPlan: data.plan };
                });
                setOptimizedData((prev) =>
                    prev
                        ? {
                              ...prev,
                              seoScores: {
                                  ...prev.seoScores,
                                  keywordDensity: data,
                                  keywordPlan: data.plan,
                              },
                          }
                        : prev,
                );
            })
            .catch(() => undefined);

        return () => {
            cancelled = true;
        };
    }, [optimizedData, isEditing, post, contentConstraints, primaryKeyword, liveScores?.keywordDensity]);

    useEffect(() => {
        if (!optimizedData || isEditing) return;
        if (liveScores?.aiDetection?.provider === "zerogpt") {
            setAiDetectionResolved(true);
            return;
        }

        let cancelled = false;
        void fetch("/api/ai-detection", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ markdown: optimizedData.contentMarkdown }),
        })
            .then((res) => (res.ok ? res.json() : null))
            .then(
                (
                    data: {
                        aiPercent?: number;
                        humanPercent?: number;
                        targetMet?: boolean;
                        confidence?: string;
                        error?: string;
                    } | null,
                ) => {
                if (cancelled || !data || data.error || typeof data.aiPercent !== "number") return;
                const aiPct = data.aiPercent;
                setLiveScores((prev) => {
                    const base =
                        prev ??
                        normalizeSeoScores(
                            optimizedData.seoScores,
                            optimizedData.plagiarismReport?.overallSimilarity ?? 0,
                        );
                    return {
                        ...base,
                        aiContentPercent: Math.round(aiPct),
                        aiDetection: {
                            aiPercent: aiPct,
                            humanPercent: data.humanPercent ?? 100 - aiPct,
                            targetMet: Boolean(data.targetMet),
                            attempts: 0,
                            provider: "zerogpt",
                            confidence: data.confidence,
                        },
                    };
                });
            },
            )
            .catch(() => undefined)
            .finally(() => {
                if (!cancelled) setAiDetectionResolved(true);
            });

        return () => {
            cancelled = true;
        };
    }, [optimizedData, isEditing, liveScores?.aiDetection?.provider]);

    const metricsRefreshOptions = {
        post: { ...post, contentMarkdown: optimizedData?.contentMarkdown ?? post.contentMarkdown },
        constraints: contentConstraints ?? null,
        strategyPrimary: primaryKeyword,
    };

    const runMetricsRefresh = async (markdown: string, scores: SeoScores) => {
        setIsRefreshingMetrics(true);
        setMetricsRefreshError(null);
        try {
            const refreshed = await refreshOptimizerMetrics(markdown, scores, {
                ...metricsRefreshOptions,
                post: { ...metricsRefreshOptions.post, contentMarkdown: markdown },
            });
            setLiveScores(refreshed);
            setAiDetectionResolved(refreshed.aiDetection?.provider === "zerogpt");
            setHighlightScores(true);
            return refreshed;
        } catch (err) {
            const message = err instanceof Error ? err.message : "Could not refresh metrics";
            setMetricsRefreshError(message);
            return scores;
        } finally {
            setIsRefreshingMetrics(false);
        }
    };

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
            setAiDetectionResolved(false);
            try {
                setLoadingPhase("optimize");
                const data = await requestContentOptimization(
                    post,
                    businessContext,
                    interlinkingRules,
                    { signal: controller.signal, contentConstraints },
                );

                if (latestRequestRef.current !== requestId) return;
                setOptimizedData(data.optimized);
                setFactSources(
                    data.optimized.factSources?.length
                        ? data.optimized.factSources
                        : post.factSources ?? [],
                );
                const scores = normalizeSeoScores(
                    data.optimized.seoScores,
                    data.optimized.plagiarismReport?.overallSimilarity ?? 0,
                );
                setLiveScores(scores);
                setAiDetectionResolved(scores.aiDetection?.provider === "zerogpt");
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
                    {OPTIMIZATION_LOADING_TITLE}
                </h3>
                {loadingPhase === "links" && (
                    <p className="mt-2 text-sm text-neutral-300 max-w-md mx-auto font-medium">
                        {OPTIMIZATION_LINKS_PHASE}
                    </p>
                )}
                {loadingPhase === "optimize" && (
                    <ul className="mt-4 mx-auto max-w-sm text-left space-y-1.5">
                        {optimizationLoadingSteps.map((step, i) => {
                            const active =
                                optimizationLoadingStepIndex(loadingSeconds, optimizationLoadingSteps) === i;
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
                    {loadingPhase === "optimize" ? OPTIMIZATION_TIMING_NOTE : null}
                    {loadingSeconds > 0 && (
                        <span className={loadingPhase === "optimize" ? " block mt-1 font-mono" : " font-mono"}>
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
                                contentConstraints,
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
    const keywordDensityVerification =
        liveScores?.keywordDensity ?? optimizedData.seoScores?.keywordDensity ?? null;
    const resolvedKeywordPlan =
        keywordDensityVerification?.plan ??
        post.keywordPlan ??
        optimizedData.seoScores?.keywordPlan ??
        resolveKeywordPlanForPost(post, contentConstraints, primaryKeyword);
    const verifiedRows = keywordVerificationToDensityRows(keywordDensityVerification);
    const keywordDensityRows: KeywordDensityRow[] =
        verifiedRows.length > 0
            ? verifiedRows
            : resolvedKeywordPlan
              ? keywordVerificationToDensityRows(
                    buildLocalKeywordPlanVerification(analyzerMarkdown, resolvedKeywordPlan),
                )
              : [];
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
                            <div className="space-y-2">
                                {(() => {
                                    const readability = readabilityMetricDisplay(liveScores);
                                    return (
                                        <SeoMetricBar
                                            label="Readability"
                                            value={liveScores.readabilityGrade ? liveScores.readability : 0}
                                            barClass={readabilityBarClass(liveScores)}
                                            help={readability.help}
                                            suffix={readability.suffix}
                                            delta={scoreDeltas?.readability}
                                            brand={<SeoReviewToolsBadge variant="light" size="md" logoOnly />}
                                        />
                                    );
                                })()}
                            </div>
                            <div className="space-y-2">
                                {(() => {
                                    const ai = formatAiContentDisplay(liveScores, aiDetectionResolved);
                                    return (
                                        <SeoMetricBar
                                            label="AI Content%"
                                            value={ai.value}
                                            barClass={ai.barClass}
                                            help={ai.help}
                                            suffix={ai.suffix}
                                            delta={
                                                liveScores?.aiDetection?.provider === "zerogpt"
                                                    ? scoreDeltas?.aiContentPercent
                                                    : undefined
                                            }
                                            brand={<ZeroGptBadge variant="light" size="md" logoOnly />}
                                        />
                                    );
                                })()}
                            </div>
                        </div>

                        {keywordDensityRows.length > 0 ? (
                            <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
                                <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-[#718096]">
                                    Keyword density
                                </h3>
                                <p className="mb-3 text-[11px] text-[#A0AEC0] leading-relaxed">
                                    Targets from the writer&apos;s{" "}
                                    <span className="font-medium text-[#718096]">keywordPlan</span>. Actual %
                                    is measured across the full article body.
                                </p>
                                <KeywordDensityPanel rows={keywordDensityRows} />
                            </div>
                        ) : resolvedKeywordPlan ? null : (
                            <p className="rounded-xl border border-neutral-200 bg-white p-4 text-[11px] text-[#718096]">
                                No keyword plan on this draft — the writer must set{" "}
                                <span className="font-medium">keywordPlan</span> during drafting.
                            </p>
                        )}
                    </div>
                </div>
            )}
            {/* Next step — on the dark shell, not inside the light SEO card */}
            {!isEditing && (
                <div className="mb-6 border-t border-neutral-800 pt-6">
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
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-8 py-4 text-sm font-black uppercase tracking-widest text-white transition-all hover:bg-emerald-500 shadow-lg shadow-emerald-900/25 active:scale-[0.99]"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Edit content
                    </button>
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
                                        disabled={isRefreshingMetrics}
                                        onClick={async () => {
                                            if (!optimizedData || !liveScores) return;
                                            const refreshed = await runMetricsRefresh(
                                                editedContent,
                                                liveScores,
                                            );
                                            setOptimizedData((prev) =>
                                                prev
                                                    ? {
                                                          ...prev,
                                                          contentMarkdown: editedContent,
                                                          seoScores: refreshed,
                                                          factSources,
                                                      }
                                                    : prev,
                                            );
                                            setIsEditing(false);
                                        }}
                                        className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 transition-all hover:bg-emerald-500 active:scale-95 disabled:opacity-50"
                                    >
                                        {isRefreshingMetrics ? "Saving…" : "Save"}
                                    </button>
                                </div>
                            </div>
                            <div className="border-t border-neutral-800/80 px-4 pb-4 pt-3 sm:px-6">
                                <div
                                    className="flex items-stretch rounded-xl border border-neutral-800 bg-neutral-900/70 overflow-hidden"
                                    title="Live quality metrics for the current draft"
                                >
                                    <div className="flex flex-1 items-center gap-3 overflow-x-auto px-3 py-2 sm:gap-4 sm:px-4 custom-scrollbar">
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <SeoReviewToolsBadge size="sm" logoOnly />
                                            <EditContentMetric
                                                label="Readability"
                                                value={`${liveScores!.readability}%`}
                                            />
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <ZeroGptBadge size="sm" logoOnly />
                                            <EditContentMetric
                                                label="AI Content%"
                                                value={
                                                    formatAiContentDisplay(liveScores, aiDetectionResolved)
                                                        .suffix
                                                }
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        disabled={isRefreshingMetrics}
                                        onClick={() => {
                                            if (!liveScores) return;
                                            void runMetricsRefresh(editedContent, liveScores);
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
                                {metricsRefreshError ? (
                                    <p className="mt-2 text-xs text-amber-400/90 px-1">{metricsRefreshError}</p>
                                ) : (
                                    <p className="mt-2 text-[11px] text-neutral-500 px-1">
                                        Refresh re-runs readability (SEO Review Tools), keyword density, and ZeroGPT
                                        on your current draft.
                                    </p>
                                )}
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
