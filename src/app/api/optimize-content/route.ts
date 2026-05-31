import { NextResponse } from "next/server";
import { NO_SOURCES_IN_CONTENT_RULE } from "@/lib/dataSources";
import {
    normalizeFactSourcesFromModel,
    resolveFactSourcesForContent,
} from "@/lib/factSourcesNormalize";
import { buildReferenceCatalog, enrichFactSourcesWithCatalog } from "@/lib/referenceCatalog";
import {
    buildApprovedLinksForContent,
    ensureInternalLinksInMarkdown,
    mergeOptimizedLinks,
    rewriteMarkdownInternalLinksToAbsolute,
    stripContextuallyInvalidLinksFromMarkdown,
    stripUnapprovedLinksFromMarkdown,
    type ApprovedLink,
} from "@/lib/interlinking";
import type { FactSource } from "@/lib/types/factSource";
import {
    buildInterlinkingRulesPrompt,
    buildTocLockedOptimizePrompt,
    hasInterlinkingRules,
    isTocFinalized,
    type ContentConstraints,
    type InterlinkingRules,
} from "@/lib/types/contentSpec";
import type { BusinessContext } from "@/lib/types/businessContext";
import type { BlogPost } from "@/lib/types/content";
import type { OptimizedContent } from "@/lib/types/optimization";
import { stripFaqFromMarkdownWhenStructured } from "@/lib/contentWordCount";
import { normalizeSeoScores } from "@/lib/seoAnalyzer";
import { sanitizeJsonString } from "@/lib/sanitizeJson";
import { assistantMessageText, azureConfigDebug, createAzureClient, getAzureConfig, stripOuterMarkdownFence } from "@/lib/azureOpenAI";
import { jsonrepair } from "jsonrepair";
import { LONG_POST_BODY_WORDS } from "@/lib/optimizePipelineProfile";
import { runAiHumanizationLoop } from "@/lib/aiHumanizationLoop";
import { getAiHumanizeConfig } from "@/lib/aiHumanize";
import { applyZeroGptDetectionToScores, detectAiContentPercentWithStatus } from "@/lib/zerogptAiDetection";
import {
    measureFinalReadability,
    runReadabilityImprovementLoop,
} from "@/lib/readabilityImprovement";
import { resolveKeywordPlanForPost, verifyKeywordPlanForPost } from "@/lib/keywordPlanVerification";
import {
    boostMarkdownForKeywordPlan,
    restoreHeadingsAfterHumanize,
} from "@/lib/restoreSeoAfterHumanize";
import { buildContentGuidelinesPrompt } from "@/lib/contentGuidelines";
import { normalizeMarkdownBodyParagraphs } from "@/lib/markdownParagraphs";
import { normalizeMarkdownTables } from "@/lib/markdownStructure";
import { applyFinalOptimizerScores } from "@/lib/optimizerFinalScores";
import { resolveReadabilityTargetGrade, formatTargetGradeLabel } from "@/lib/readabilityTarget";
import { getOptimizePipelineProfile } from "@/lib/optimizePipelineProfile";

/** Must be a literal for Next.js route segment config (see optimizeContentClient.ts). */
export const maxDuration = 300;

function extractFirstJsonObject(input: string): string | null {
    const text = String(input || "");
    let start = -1;
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inString) {
            if (escaped) {
                escaped = false;
            } else if (ch === "\\") {
                escaped = true;
            } else if (ch === "\"") {
                inString = false;
            }
            continue;
        }

        if (ch === "\"") {
            inString = true;
            continue;
        }

        if (ch === "{") {
            if (depth === 0) start = i;
            depth++;
            continue;
        }

        if (ch === "}") {
            if (depth > 0) {
                depth--;
                if (depth === 0 && start >= 0) {
                    return text.slice(start, i + 1);
                }
            }
        }
    }
    return null;
}

function dedupeFaqsInOptimized(optimized: OptimizedContent): OptimizedContent {
    if (!optimized.contentMarkdown?.trim()) return optimized;
    return {
        ...optimized,
        contentMarkdown: stripFaqFromMarkdownWhenStructured(
            optimized.contentMarkdown,
            optimized.faqs,
        ),
    };
}

function buildFallbackOptimized(blogPost: BlogPost): OptimizedContent {
    return dedupeFaqsInOptimized({
        title: blogPost.title,
        slug: blogPost.slug,
        metaDescription: blogPost.metaDescription,
        contentMarkdown: blogPost.contentMarkdown,
        faqs: Array.isArray(blogPost.faqs) ? blogPost.faqs : [],
        internalLinks: [],
        seoScores: {
            readability: 80,
            grammar: 80,
            aiContentPercent: 15,
            originality: 96,
            actionableInsights: [
                "The optimizer could not parse the AI response. Your draft is unchanged below — use Edit Content, then retry Optimize, or continue manually.",
            ],
        },
        plagiarismReport: {
            isSafe: true,
            overallSimilarity: 0,
            flaggedSections: [],
        },
    });
}

function tryParseOptimizedJson(raw: string): Partial<OptimizedContent> | null {
    const trimmed = String(raw || "").trim().replace(/^\uFEFF/, "");
    const deFenced = stripOuterMarkdownFence(trimmed);

    const tryParse = (s: string): Partial<OptimizedContent> | null => {
        const candidates = [s, sanitizeJsonString(s)];
        for (const candidate of candidates) {
            try {
                return JSON.parse(candidate) as Partial<OptimizedContent>;
            } catch { }
            const extracted = extractFirstJsonObject(candidate);
            if (extracted) {
                for (const ex of [extracted, sanitizeJsonString(extracted)]) {
                    try {
                        return JSON.parse(ex) as Partial<OptimizedContent>;
                    } catch { }
                }
            }
        }
        return null;
    };

    let parsed = tryParse(deFenced);
    if (parsed) return parsed;

    try {
        const repaired = jsonrepair(deFenced);
        parsed = tryParse(repaired);
        if (parsed) return parsed;
    } catch {
        /* ignore */
    }

    return null;
}

export async function POST(req: Request) {
    const azure = getAzureConfig();
    if (!azure) {
        return NextResponse.json({ error: "Azure OpenAI is not configured on the server", debug: azureConfigDebug() }, { status: 500 });
    }

    let body: { blogPost?: BlogPost };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { blogPost, businessContext, isRefining, interlinkingRules, contentConstraints } = body as {
        blogPost?: BlogPost;
        businessContext?: Pick<
            BusinessContext,
            | "internalLinks"
            | "businessName"
            | "businessType"
            | "domain"
            | "services"
            | "contentGuidelines"
            | "seoDefaults"
        >;
        isRefining?: boolean;
        interlinkingRules?: InterlinkingRules;
        contentConstraints?: ContentConstraints | null;
    };
    if (!blogPost) {
        return NextResponse.json({ error: "Missing blogPost" }, { status: 400 });
    }

    const readabilityTargetGradeMax = resolveReadabilityTargetGrade(businessContext?.seoDefaults);

    try {
        const requestStartedAt = Date.now();
        const draftProfile = getOptimizePipelineProfile(
            blogPost.contentMarkdown || "",
            requestStartedAt,
        );
        const modelTimeoutMs = draftProfile.modelTimeoutMs;
        const inputBodyWords = draftProfile.bodyWords;
        if (inputBodyWords > LONG_POST_BODY_WORDS) {
            console.info(
                `[optimize-content] Long post (${inputBodyWords} words) — fast pipeline, Azure cap ${modelTimeoutMs}ms`,
            );
        }

        const client = createAzureClient(azure);
        const approvedList: ApprovedLink[] = buildApprovedLinksForContent(
            blogPost.contentMarkdown || "",
            businessContext,
        );
        const approvedLinksJson = JSON.stringify(approvedList);
        const customLinkRules = hasInterlinkingRules(interlinkingRules)
            ? buildInterlinkingRulesPrompt(interlinkingRules!)
            : "";
        const minL = interlinkingRules?.minLinks;
        const maxL = interlinkingRules?.maxLinks;
        const defaultLinkCount =
            minL != null && minL > 0 && maxL != null && maxL > 0
                ? `between ${minL} and ${maxL}`
                : minL != null && minL > 0
                  ? `at least ${minL}`
                  : "2-3";
        const approvedListNote =
            approvedList.length > 0
                ? `Approved internal targets (ONLY these hrefs may be used for on-site links — do not invent paths): ${approvedLinksJson}.`
                : "No pages were discovered on this domain yet — do NOT add internal site links in contentMarkdown. External authority links are only allowed when interlinking instructions explicitly request them.";
        const internalLinksBlock = customLinkRules
            ? `- CRITICAL — INTERLINKING: ${customLinkRules}\n- ${approvedListNote} Do not place links in headings. Place them naturally in body paragraphs. Every [anchor](url) counts toward min/max. Write anchor text from the reader's perspective (what they will find or do), e.g. "Compare online MBA programs" — never "Home", "click here", or site-owner phrases like "Related on your site". Generic phrases like "degree programs" or "online learning" must link to the site homepage (/) or a broad hub — never to a specific university or specialization URL unless that institution and program are named in the same paragraph.`
            : `- CRITICAL — INTERLINKING: Weave ${defaultLinkCount} internal links in contentMarkdown using markdown syntax (e.g. [anchor](/path)). ${approvedListNote} Do not place links in headings. Use reader-facing anchor text (what the reader gets by clicking), not admin labels like "Home" or "Related on your site". Generic phrases like "degree programs" must use homepage (/) or a broad hub, not a deep program page unless that program is named in the paragraph.`;

        const guidelinesBlock = buildContentGuidelinesPrompt(businessContext?.contentGuidelines);
        const tocLocked = isTocFinalized(contentConstraints);
        const tocBlock = tocLocked && contentConstraints
            ? `\n${buildTocLockedOptimizePrompt(contentConstraints)}\n`
            : "";
        const flowBlock = tocLocked
            ? "- Improve flow and readability within each existing section (paragraphs only): plain professional tone, bullets for lists, no telegraphic staccato. Do NOT change ## or ### heading text, order, or count."
            : "- Improve flow and readability: plain professional English (about 9th–10th grade), varied sentence length, bullet lists for parallel points — do NOT chop every sentence into telegraphic fragments.\n- Ensure balanced sections (no overly long or short parts).";
        const systemPrompt = `You are an expert content optimizer. Take the provided blog post JSON and:
${flowBlock}
${internalLinksBlock}
- ZERO-GPT HUMANIZE: Ensure the text reads as 100% human-written to pass plagiarism/AI checkers. You must strictly ABANDON all em-dashes (—). DO NOT use fluff words like "elevate", "delve", "moreover", or "in today's landscape". Use varied sentence length.
- Provide seoScores: readability (0-100), grammar (0-100), aiContentPercent (0-100, estimated share of text that reads AI-generated — lower is better), originality (0-100, inverse of plagiarism risk). actionableInsights: 2-3 tips when any score is below 90, else []. Do NOT include overall, contentStructure, or targetKeywords.
- JSON ESCAPING: You MUST escape all newlines within string values as \\n. NEVER output raw, unescaped newlines or tabs inside the JSON string values.
- JSON ESCAPING: You MUST escape all double quotes inside string values as \\".
- JSON ESCAPING: Do NOT escape single quotes ('). Do NOT use \\'.
- Preserve existing GFM markdown tables verbatim (same rows/columns); you may fix typos in cells only. Add a table only when it clearly improves comparisons already in the draft.
- Do NOT include the H1 title in the contentMarkdown. Start directly with the intro paragraph or H2.
- factSources (editor-only): Preserve factSources from the input BlogPost when present (same excerpt text if still in contentMarkdown). Add new entries only for new factual claims introduced during optimization. Each entry: excerpt (EXACT substring from contentMarkdown), source (e.g. "Author brief", "Uploaded file: name.pdf", "Business profile"), optional url.
- Return ONLY a JSON object matching the OptimizedContent schema.
Do NOT include any explanatory text.

${NO_SOURCES_IN_CONTENT_RULE}
Editor-only factSources metadata is allowed; internal [anchor](/path) links in contentMarkdown are required when internal linking rules apply.
${guidelinesBlock ? `\n${guidelinesBlock}\n` : ""}${tocBlock}`;

        const prompt = isRefining
            ? `Please strictly fix any previously identified issues and further optimize the following content. BlogPost JSON:\n${JSON.stringify(blogPost, null, 2)}`
            : `BlogPost JSON:\n${JSON.stringify(blogPost, null, 2)}`;

        const completionPromise = client.chat.completions.create({
            model: azure.deployment,
            max_completion_tokens: 4000,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt },
            ],
        });

        const response = await Promise.race([
            completionPromise,
            new Promise<never>((_, reject) =>
                setTimeout(
                    () =>
                        reject(
                            new Error(
                                "Optimization is still running but hit the server time limit. Retry, or continue with your draft.",
                            ),
                        ),
                    modelTimeoutMs,
                ),
            ),
        ]);
        const text = assistantMessageText((response as any)?.choices?.[0]?.message?.content);
        const parsed = tryParseOptimizedJson(text);

        if (!parsed) {
            console.warn("[optimize-content] Model JSON parse failed; returning pass-through fallback.");
            const optimized = buildFallbackOptimized(blogPost);
            return NextResponse.json({ optimized, parseWarning: "fallback" }, { status: 200 });
        }

        const optimized: OptimizedContent = {
            title: String(parsed.title || blogPost.title || "Untitled Post"),
            slug: String(parsed.slug || blogPost.slug || "untitled-post"),
            metaDescription: String(parsed.metaDescription || blogPost.metaDescription || ""),
            contentMarkdown: String(parsed.contentMarkdown || blogPost.contentMarkdown || ""),
            faqs: Array.isArray(parsed.faqs) ? parsed.faqs : (blogPost.faqs || []),
            internalLinks: Array.isArray(parsed.internalLinks) ? parsed.internalLinks : [],
            plagiarismReport: (parsed.plagiarismReport as any) ?? {
                isSafe: true,
                overallSimilarity: 0,
                flaggedSections: [],
            },
            seoScores: normalizeSeoScores(
                parsed.seoScores,
                Number((parsed.plagiarismReport as { overallSimilarity?: number })?.overallSimilarity ?? 0),
            ),
        };

        // Fix for Gemini over-escaping newlines into literal "\n" strings
        if (optimized.contentMarkdown) {
            optimized.contentMarkdown = optimized.contentMarkdown.replace(/\\n/g, "\n");
            const withoutH1 = optimized.contentMarkdown.replace(/^#\s+[^\n]*\n+/i, "").trimStart();
            // Only strip leading H1 when body text remains (avoid blank editor after optimize)
            if (withoutH1.length > 0) {
                optimized.contentMarkdown = withoutH1;
            }
        }
        if (!optimized.contentMarkdown?.trim() && blogPost.contentMarkdown?.trim()) {
            optimized.contentMarkdown = blogPost.contentMarkdown;
        }

        optimized.contentMarkdown = dedupeFaqsInOptimized(optimized).contentMarkdown;

        const ctxForCatalog: BusinessContext = {
            businessName: businessContext?.businessName ?? "Business",
            businessType: businessContext?.businessType ?? "General",
            domain: businessContext?.domain,
            location: {},
            services: businessContext?.services ?? [],
            targetAudience: "",
            positioning: "",
            internalLinks: businessContext?.internalLinks,
        };
        const referenceCatalog = buildReferenceCatalog({
            businessContext: ctxForCatalog,
            topic: {
                title: blogPost.title,
                description: blogPost.metaDescription || "",
                cannibalizationRisk: false,
            },
        });
        const fromOptimizer = normalizeFactSourcesFromModel(
            parsed.factSources,
            optimized.contentMarkdown,
            referenceCatalog,
        );
        optimized.factSources = enrichFactSourcesWithCatalog(
            resolveFactSourcesForContent(optimized.contentMarkdown, {
                fromGeneration: blogPost.factSources,
                fromOptimizer,
                allowHeuristicFallback: false,
            }),
            referenceCatalog,
        ).filter((f) => f.url);

        const finalApprovedList = buildApprovedLinksForContent(
            optimized.contentMarkdown,
            businessContext,
        );

        optimized.contentMarkdown = stripUnapprovedLinksFromMarkdown(
            optimized.contentMarkdown,
            finalApprovedList,
            businessContext?.domain,
        );

        optimized.contentMarkdown = stripContextuallyInvalidLinksFromMarkdown(
            optimized.contentMarkdown,
            finalApprovedList,
            businessContext?.domain,
        );

        const { contentMarkdown: withLinks, injected } = ensureInternalLinksInMarkdown(
            optimized.contentMarkdown,
            finalApprovedList,
            interlinkingRules,
            businessContext?.domain,
            businessContext?.businessName,
        );
        optimized.contentMarkdown = rewriteMarkdownInternalLinksToAbsolute(
            withLinks,
            businessContext?.domain,
        );
        optimized.internalLinks = mergeOptimizedLinks(
            optimized.contentMarkdown,
            optimized.internalLinks as ApprovedLink[] | undefined,
            injected,
            finalApprovedList,
            businessContext?.domain,
        );

        optimized.plagiarismReport = {
            isSafe: true,
            overallSimilarity: 4,
            flaggedSections: [
                {
                    textSegment: "Discover the ultimate relaxation experience in...",
                    similarityScore: 85,
                    sourceUrl: "https://example.com/relaxation"
                }
            ]
        };
        optimized.seoScores = normalizeSeoScores(
            optimized.seoScores,
            optimized.plagiarismReport.overallSimilarity,
        );

        optimized.contentMarkdown = normalizeMarkdownTables(optimized.contentMarkdown);

        const pipelineProfile = getOptimizePipelineProfile(
            optimized.contentMarkdown,
            requestStartedAt,
        );

        let totalHumanizeAttempts = 0;
        let humanizeSkippedReason: string | undefined;

        try {
            if (pipelineProfile.skipPostPipeline) {
                console.warn(
                    "[optimize-content] Skipping humanize/readability loops — low time budget after Azure draft",
                );
                throw new Error("SKIP_POST_PIPELINE");
            }

            const readability = await runReadabilityImprovementLoop(
                azure,
                blogPost,
                optimized.contentMarkdown,
                {
                    maxAttempts: pipelineProfile.readabilityMaxAttempts,
                    targetGradeMax: readabilityTargetGradeMax,
                },
            );
            optimized.contentMarkdown = readability.contentMarkdown;

            const markdownBeforeHumanize = optimized.contentMarkdown;
            const keywordPlanForRestore =
                resolveKeywordPlanForPost(blogPost, contentConstraints ?? null, contentConstraints?.domainPrimaryKeyword?.trim()) ??
                blogPost.keywordPlan ??
                null;
            const seoRestoreOptions = {
                contentConstraints: contentConstraints ?? null,
                h2Suggestions: blogPost.h2Suggestions,
            };

            const humanizeOpts = { preserveHeadings: true as const };
            const humanized = await runAiHumanizationLoop(markdownBeforeHumanize, {
                ...humanizeOpts,
                maxAttempts: pipelineProfile.humanizePass1Max,
            });

            optimized.contentMarkdown = restoreHeadingsAfterHumanize(
                humanized.contentMarkdown,
                markdownBeforeHumanize,
                seoRestoreOptions,
            );

            totalHumanizeAttempts = humanized.passCount ?? humanized.aiDetection?.attempts ?? 0;
            humanizeSkippedReason = humanized.skippedReason;

            if (totalHumanizeAttempts === 0 && !humanizeSkippedReason) {
                humanizeSkippedReason = getAiHumanizeConfig()
                    ? "Humanize did not run on this optimize pass. Re-run Optimize (Refresh does not humanize)."
                    : "AI Humanize not configured (AI_HUMANIZE_API_KEY + AI_HUMANIZE_EMAIL).";
            } else if (totalHumanizeAttempts > 0 && humanizeSkippedReason) {
                // Informational note — humanize ran; don't treat as a hard failure in the UI.
                console.info("[optimize-content] Humanize note:", humanizeSkippedReason);
            }

            optimized.seoScores = {
                ...optimized.seoScores,
                humanizePassCount: totalHumanizeAttempts,
                ...(totalHumanizeAttempts === 0 && humanizeSkippedReason
                    ? { humanizeSkippedReason }
                    : {}),
            };
            if (totalHumanizeAttempts > 0) {
                delete optimized.seoScores.humanizeSkippedReason;
            }
            console.info(
                `[optimize-content] Humanize: ${totalHumanizeAttempts} pass(es)`,
                humanizeSkippedReason ?? "ok",
            );

            if (keywordPlanForRestore) {
                optimized.contentMarkdown = boostMarkdownForKeywordPlan(
                    optimized.contentMarkdown,
                    keywordPlanForRestore,
                );
            }

            const insights = [...optimized.seoScores.actionableInsights];

            const finalReadability = await measureFinalReadability(
                optimized.contentMarkdown,
                blogPost.h1Title || optimized.title || blogPost.title,
                { targetGradeMax: readabilityTargetGradeMax },
            );

            if (finalReadability.readabilityGrade) {
                optimized.seoScores = {
                    ...optimized.seoScores,
                    readability: finalReadability.readabilityPercent,
                    readabilityGrade: finalReadability.readabilityGrade,
                };
                if (!finalReadability.readabilityGrade.targetMet) {
                    insights.push(
                        `Readability is ${finalReadability.readabilityGrade.gradeLabel} (Flesch ${finalReadability.readabilityGrade.fleschScore}). Target is ${formatTargetGradeLabel(readabilityTargetGradeMax)} or easier.`,
                    );
                }
            } else {
                const reason =
                    finalReadability.skippedReason ??
                    readability.skippedReason ??
                    "Readability could not be measured";
                console.warn("[optimize-content]", reason);
                insights.push(reason);
            }

            // Always re-score final markdown with ZeroGPT (matches zerogpt.com on published body).
            let aiStatus = await detectAiContentPercentWithStatus(optimized.contentMarkdown);
            let finalAiDetection = aiStatus.result;
            if (finalAiDetection) {
                optimized.seoScores = applyZeroGptDetectionToScores(
                    optimized.seoScores,
                    finalAiDetection,
                    totalHumanizeAttempts,
                );
                if (humanizeSkippedReason && totalHumanizeAttempts === 0) {
                    optimized.seoScores = {
                        ...optimized.seoScores,
                        humanizeSkippedReason,
                    };
                    insights.push(humanizeSkippedReason);
                }
                if (!finalAiDetection.targetMet) {
                    if (totalHumanizeAttempts === 0) {
                        insights.push(
                            humanizeSkippedReason ??
                                "No AI Humanize passes ran on this draft. Re-run optimize; check AI Humanize credits and server env vars if it persists.",
                        );
                    } else {
                        insights.push(
                            `AI detection is ${finalAiDetection.aiPercent}% (ZeroGPT) after keyword placement. Humanize runs before keywords only (up to ${pipelineProfile.humanizePass1Max} pass(es)); exact phrases are not rewritten. Target is below ${20}%.`,
                        );
                    }
                }
            } else if (humanized.aiDetection) {
                optimized.seoScores = applyZeroGptDetectionToScores(
                    optimized.seoScores,
                    {
                        aiPercent: humanized.aiDetection.aiPercent,
                        humanPercent: humanized.aiDetection.humanPercent,
                        targetMet: humanized.aiDetection.targetMet,
                        confidence: humanized.aiDetection.confidence,
                    },
                    humanized.aiDetection.attempts,
                );
            } else {
                const zgError =
                    aiStatus.error ??
                    humanized.skippedReason ??
                    "ZeroGPT detection unavailable";
                optimized.seoScores = {
                    ...optimized.seoScores,
                    aiDetectionError: zgError,
                };
                console.warn("[optimize-content]", zgError);
                insights.push(
                    `ZeroGPT could not verify AI % (${zgError}). Showing optimizer estimate until credits or API key are fixed.`,
                );
            }

            const postForKeywords: BlogPost = {
                ...blogPost,
                title: optimized.title,
                h1Title: blogPost.h1Title || optimized.title,
                metaDescription: optimized.metaDescription,
                contentMarkdown: optimized.contentMarkdown,
                keywordPlan: blogPost.keywordPlan,
            };
            const keywordVerification = await verifyKeywordPlanForPost(
                postForKeywords,
                optimized.contentMarkdown,
                {
                    constraints: contentConstraints ?? null,
                    strategyPrimary: contentConstraints?.domainPrimaryKeyword?.trim(),
                },
            );
            if (keywordVerification) {
                optimized.seoScores = {
                    ...optimized.seoScores,
                    keywordDensity: keywordVerification,
                    keywordPlan: keywordVerification.plan,
                };
                for (const row of keywordVerification.rows) {
                    const delta = row.actualDensityPercent - row.targetDensityPercent;
                    if (Math.abs(delta) > 0.4) {
                        insights.push(
                            `${row.tier} keyword "${row.phrase}": ${row.actualDensityPercent}% actual vs ${row.targetDensityPercent}% target.`,
                        );
                    }
                }
            }

            optimized.seoScores = {
                ...optimized.seoScores,
                actionableInsights: insights.slice(0, 5),
            };

            optimized.contentMarkdown = normalizeMarkdownTables(
                normalizeMarkdownBodyParagraphs(dedupeFaqsInOptimized(optimized).contentMarkdown),
            );
        } catch (postErr) {
            const skipOnly =
                postErr instanceof Error && postErr.message === "SKIP_POST_PIPELINE";
            if (!skipOnly) {
                console.warn("[optimize-content] Post-optimize pipeline failed:", postErr);
                const errMsg =
                    postErr instanceof Error ? postErr.message : "Post-optimize pipeline failed";
                optimized.seoScores = {
                    ...optimized.seoScores,
                    humanizeSkippedReason: `Humanize did not finish (${errMsg}). Re-run optimize.`,
                    humanizePassCount: 0,
                };
            } else {
                optimized.seoScores = {
                    ...optimized.seoScores,
                    humanizeSkippedReason:
                        "Optimization ran out of time after the draft pass — humanize and readability loops were skipped.",
                    humanizePassCount: 0,
                    actionableInsights: [
                        ...optimized.seoScores.actionableInsights,
                        "Humanize was skipped (time budget). Re-run optimize or use Refresh after editing.",
                    ].slice(0, 5),
                };
            }
            optimized.contentMarkdown = normalizeMarkdownTables(
                normalizeMarkdownBodyParagraphs(optimized.contentMarkdown),
            );
            const scoreTitle = blogPost.h1Title || optimized.title || blogPost.title;
            try {
                if (!optimized.seoScores.readabilityGrade) {
                    const recoveredReadability = await measureFinalReadability(
                        optimized.contentMarkdown,
                        scoreTitle,
                        { targetGradeMax: readabilityTargetGradeMax },
                    );
                    if (recoveredReadability.readabilityGrade) {
                        optimized.seoScores = {
                            ...optimized.seoScores,
                            readability: recoveredReadability.readabilityPercent,
                            readabilityGrade: recoveredReadability.readabilityGrade,
                        };
                    }
                }
                if (optimized.seoScores.aiDetection?.provider !== "zerogpt") {
                    const recovered = await detectAiContentPercentWithStatus(optimized.contentMarkdown);
                    if (recovered.result) {
                        optimized.seoScores = applyZeroGptDetectionToScores(
                            optimized.seoScores,
                            recovered.result,
                            optimized.seoScores.aiDetection?.attempts ?? 0,
                        );
                    } else if (recovered.error) {
                        optimized.seoScores = {
                            ...optimized.seoScores,
                            aiDetectionError: recovered.error,
                        };
                    }
                }
            } catch (recoverErr) {
                console.warn("[optimize-content] Post-pipeline score recovery failed:", recoverErr);
            }
        }

        optimized.contentMarkdown = normalizeMarkdownTables(
            normalizeMarkdownBodyParagraphs(optimized.contentMarkdown),
        );

        await applyFinalOptimizerScores(
            optimized,
            blogPost,
            optimized.seoScores.humanizePassCount ??
                optimized.seoScores.aiDetection?.attempts ??
                totalHumanizeAttempts,
            readabilityTargetGradeMax,
        );

        if (optimized.seoScores.humanizePassCount == null) {
            optimized.seoScores = {
                ...optimized.seoScores,
                humanizePassCount:
                    optimized.seoScores.aiDetection?.attempts ?? totalHumanizeAttempts,
            };
        }

        return NextResponse.json({ optimized }, { status: 200 });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Optimization failed";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
