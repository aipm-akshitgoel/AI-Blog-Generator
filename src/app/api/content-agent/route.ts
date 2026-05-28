import { NextResponse } from "next/server";
import { type BusinessContext } from "@/lib/types/businessContext";
import { type StrategySession, type TopicOption } from "@/lib/types/strategy";
import {
    buildReferenceCatalog,
    enrichFactSourcesWithCatalog,
    formatCatalogForPrompt,
} from "@/lib/referenceCatalog";
import { type BlogPost } from "@/lib/types/content";
import type { TopicBrief } from "@/lib/types/topicBrief";
import {
    buildContentConstraintsPrompt,
    hasContentConstraints,
    type ContentConstraints,
} from "@/lib/types/contentSpec";
import { countMarkdownBodyWords, stripFaqFromMarkdownWhenStructured } from "@/lib/contentWordCount";
import { sanitizeJsonString } from "@/lib/sanitizeJson";
import { extractRouteError } from "@/lib/formatApiError";
import { assistantMessageText, azureConfigDebug, createAzureClient, getAzureConfig, stripOuterMarkdownFence } from "@/lib/azureOpenAI";
import { NO_SOURCES_IN_CONTENT_RULE } from "@/lib/dataSources";
import { normalizeFactSourcesFromModel } from "@/lib/factSourcesNormalize";
import type { FactSource } from "@/lib/types/factSource";
import {
    inferKeywordPlanFromBrief,
    normalizeKeywordPlanFromModel,
} from "@/lib/keywordPlanVerification";
import { buildContentGuidelinesPrompt } from "@/lib/contentGuidelines";

export const maxDuration = 180;

const MAX_BRIEF_CHARS = 24_000;

function buildSystemPrompt(businessContext: BusinessContext, targetWords?: number): string {
    const industry = businessContext.businessType || "the client's industry";
    const audience = businessContext.targetAudience || "their target audience";
    const guidelinesBlock = buildContentGuidelinesPrompt(businessContext.contentGuidelines);
    return `
You are an elite SEO copywriter. Write for ${businessContext.businessName || "the business"} (${industry}), targeting ${audience}.
Match brandTone (voice) and positioning (market position) in BusinessContext exactly.

Generate a complete, publication-ready blog post from:
1. BusinessContext (name, location, audience, brandTone, positioning, services)
2. TopicOption (title and description)
3. Optional TopicBrief — author notes, reference files, and optional ContentConstraints (word count, H1, H2s, keyword hints). When constraints are provided, they override default structure choices and MUST be met in the output.
4. **keywordPlan** — YOU finalize the primary, secondary, and tertiary keywords for this article AND a realistic target density % for each (based on how prominently each phrase should appear in its scope). This plan is measured after publish via SEO Review Tools.

${targetWords && targetWords >= 1200 ? `CRITICAL — LENGTH: contentMarkdown body (before FAQs) MUST be at least ${Math.round(targetWords * 0.95)} words. Target ${targetWords} words. Under-length drafts fail the task — expand every H2 with examples, criteria, and specifics until the count is met.\n` : ""}REQUIREMENTS:
1. **Relevance**: Connect to location and audience when provided in BusinessContext.
2. **Structure**: H2 and H3 markdown headers, short paragraphs, bullets where useful.
3. **FAQs**: Exactly 3 FAQs in the \`faqs\` JSON array only — do NOT add a ## FAQs (or similar) section inside \`contentMarkdown\`; the app renders FAQs in a dedicated block.
4. **Human voice**: No em-dashes (—). Avoid "delve into", "elevate", "in today's landscape", "moreover", "in conclusion".
5. **Fact density**: Include at least 10 specific, verifiable claims (fees or fee ranges, eligibility rules, durations, accreditation, stats, exam requirements, etc.). Pull facts from the Reference Catalog and Author Brief — do not invent statistics.
6. **keywordPlan**: After writing, set realistic targetDensityPercent values for primary / secondary / tertiary keywords you used (verified with SEO Review Tools after optimize).

OUTPUT: ONLY valid JSON with keys: title, h1Title, h2Suggestions (array 3-6 strings), slug, metaDescription, contentMarkdown, faqs (array of {question, answer}), factSources (array), keywordPlan (object).
- keywordPlan: { "primary": { "phrase": "...", "targetDensityPercent": 1.5, "tier": "primary" }, "secondary": [{ "phrase": "...", "targetDensityPercent": 1.0, "tier": "secondary", "sectionTitle": "H2 heading if paired" }], "tertiary": [{ "phrase": "...", "targetDensityPercent": 0.8, "tier": "tertiary", "sectionTitle": "H3 heading if paired" }] }
- Choose targetDensityPercent deliberately (typical ranges: primary 1.0–2.0, secondary 0.8–1.5, tertiary 0.5–1.2). Use secondary/tertiary only when they fit the article; arrays may be empty.
- factSources: One entry per factual claim in contentMarkdown (aim for 10–15).
  - excerpt: EXACT substring from contentMarkdown (phrase or sentence containing the fact).
  - source: Publisher or site name from the Reference Catalog (e.g. "UGC India", "NMIMS", "BusinessName") — NEVER use "Approved topic", "Reference", or "Program data".
  - url: REQUIRED https URL — must be one of the Reference Catalog URLs that supports that fact.
- Escape newlines in strings as \\n and double quotes as \\".
- Do NOT include H1 in contentMarkdown; start with intro or H2.
- No markdown code fences or conversational text.

${NO_SOURCES_IN_CONTENT_RULE}
Editor-only factSources metadata is required; do not cite sources inside contentMarkdown body text.
${guidelinesBlock ? `\n${guidelinesBlock}\n` : ""}`;
}

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

function extractH2Suggestions(markdown: string): string[] {
    const matches = String(markdown || "")
        .match(/^##\s+(.+)$/gm)
        ?.map((line) => line.replace(/^##\s+/, "").trim())
        .filter(Boolean) || [];
    return Array.from(new Set(matches)).slice(0, 8);
}

function normalizePostFromParsed(
    parsed: Partial<BlogPost>,
    topic: TopicOption,
    constraints?: ContentConstraints,
): BlogPost {
    const postData: BlogPost = {
        title: String(parsed.title || topic.title || "Untitled Post"),
        h1Title: String(parsed.h1Title || parsed.title || topic.title || "Untitled Post"),
        h2Suggestions: Array.isArray(parsed.h2Suggestions)
            ? parsed.h2Suggestions.map((h) => String(h).trim()).filter(Boolean).slice(0, 12)
            : [],
        slug: String(parsed.slug || topic.title || "untitled-post")
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, ""),
        metaDescription: String(parsed.metaDescription || ""),
        contentMarkdown: String(parsed.contentMarkdown || ""),
        faqs: Array.isArray(parsed.faqs) ? parsed.faqs : [],
        status: parsed.status === "published" ? "published" : "draft",
    };

    if (postData.contentMarkdown) {
        postData.contentMarkdown = postData.contentMarkdown.replace(/\\n/g, "\n");
        postData.contentMarkdown = postData.contentMarkdown.replace(/^#\s+[^\n]*\n+/i, "").trimStart();
        postData.contentMarkdown = stripFaqFromMarkdownWhenStructured(
            postData.contentMarkdown,
            postData.faqs,
        );
    }

    if (constraints?.h1Title?.trim()) {
        postData.h1Title = constraints.h1Title.trim();
        postData.title = constraints.h1Title.trim();
    } else if (topic.title?.trim()) {
        postData.h1Title = topic.title.trim();
        postData.title = topic.title.trim();
    }

    if (constraints?.h2Titles?.length) {
        postData.h2Suggestions = constraints.h2Titles.map((t) => t.trim()).filter(Boolean);
    } else if (topic.h2Titles?.length) {
        postData.h2Suggestions = topic.h2Titles.map((t) => t.trim()).filter(Boolean);
    } else if (!postData.h2Suggestions?.length) {
        postData.h2Suggestions = extractH2Suggestions(postData.contentMarkdown);
    }

    const plan =
        normalizeKeywordPlanFromModel((parsed as { keywordPlan?: unknown }).keywordPlan) ??
        inferKeywordPlanFromBrief(postData, constraints);
    if (plan) {
        postData.keywordPlan = plan;
    }

    return postData;
}

function parseBlogPostJson(text: string): Partial<BlogPost> | null {
    const deFenced = stripOuterMarkdownFence(text);
    const directCandidates = [deFenced, sanitizeJsonString(deFenced)];
    for (const candidate of directCandidates) {
        try {
            return JSON.parse(candidate) as Partial<BlogPost>;
        } catch {
            /* try next */
        }
    }
    const extractedObject = extractFirstJsonObject(deFenced);
    if (!extractedObject) return null;
    const extractedCandidates = [extractedObject, sanitizeJsonString(extractedObject)];
    for (const candidate of extractedCandidates) {
        try {
            return JSON.parse(candidate) as Partial<BlogPost>;
        } catch {
            /* try next */
        }
    }
    return null;
}

function completionTokenBudget(constraints?: ContentConstraints): number {
    const words = constraints?.wordCount && constraints.wordCount > 0 ? constraints.wordCount : 2000;
    return Math.min(16_000, Math.max(8_000, Math.round(words * 2.2) + 1_500));
}

async function expandDraftIfShort(
    client: ReturnType<typeof createAzureClient>,
    deployment: string,
    post: BlogPost,
    constraints: ContentConstraints,
    topic: TopicOption,
): Promise<BlogPost> {
    const target = constraints.wordCount;
    if (!target || target < 400) return post;

    let current = countMarkdownBodyWords(post.contentMarkdown);
    const minAccept = Math.round(target * 0.92);
    if (current >= minAccept) return post;

    const h2List =
        (constraints.h2Titles?.length ? constraints.h2Titles : post.h2Suggestions) ?? [];

    for (let attempt = 0; attempt < 2 && current < minAccept; attempt++) {
        const wordsNeeded = target - current;
        const response = await client.chat.completions.create({
            model: deployment,
            max_completion_tokens: Math.min(16_000, Math.max(6_000, Math.round(wordsNeeded * 2.2) + 2_000)),
            messages: [
                {
                    role: "system",
                    content:
                        "You expand SEO blog bodies. Return ONLY valid JSON: { contentMarkdown, factSources }. Keep every existing H2 and fact. Add substantive paragraphs until the word target is met. No markdown fences.",
                },
                {
                    role: "user",
                    content: `Body is ${current} words; MUST reach at least ${target} words (add ~${wordsNeeded}+ words).

Preserve H2 order: ${h2List.join(" | ") || "existing sections"}

Current JSON:
${JSON.stringify({
    contentMarkdown: post.contentMarkdown,
    factSources: post.factSources ?? [],
})}`,
                },
            ],
        });

        const parsed = parseBlogPostJson(
            assistantMessageText((response as { choices?: { message?: { content?: string } }[] })?.choices?.[0]?.message?.content),
        );
        if (!parsed?.contentMarkdown) break;

        const expanded = normalizePostFromParsed(
            { ...post, ...parsed, title: post.title, h1Title: post.h1Title, slug: post.slug },
            topic,
            constraints,
        );
        const expandedCount = countMarkdownBodyWords(expanded.contentMarkdown);
        if (expandedCount > current) {
            post = expanded;
            current = expandedCount;
        } else {
            break;
        }
    }

    return post;
}

export async function POST(req: Request) {
    const azure = getAzureConfig();
    if (!azure) {
        return NextResponse.json(
            { error: "Azure OpenAI is not configured on the server", debug: azureConfigDebug() },
            { status: 500 }
        );
    }

    try {
        const { businessContext, topic, topicBrief, strategySession }: {
            businessContext: BusinessContext;
            topic: TopicOption;
            topicBrief?: TopicBrief;
            strategySession?: StrategySession | null;
        } = await req.json();

        if (!businessContext || !topic) {
            return NextResponse.json(
                { error: "Missing businessContext or topic payload" },
                { status: 400 }
            );
        }

        const client = createAzureClient(azure);

        const referenceCatalog = buildReferenceCatalog({
            businessContext,
            topic,
            topicBrief,
            strategySession,
        });

        let userPrompt = `Generate the blog post JSON for the following:\n\n### Business Context\n${JSON.stringify(businessContext, null, 2)}\n\n### Approved Topic (angle only — do NOT cite as "Approved topic")\nTitle: ${topic.title}\nDescription: ${topic.description}`;

        if (topic.title?.trim()) {
            userPrompt += `\n\n### Required H1\nh1Title MUST be: "${topic.title.trim()}"`;
        }

        if (topic.h2Titles?.length) {
            userPrompt += `\n\n### Required H2 sections (use these exact headings in contentMarkdown, in this order)\n${topic.h2Titles.map((h) => `- ${h}`).join("\n")}`;
            userPrompt += `\n\nh2Suggestions in your JSON MUST match this list exactly.`;
        }

        if (strategySession?.keywordStrategy?.primaryKeyword?.trim()) {
            userPrompt += `\n\n### Primary keyword\n${strategySession.keywordStrategy.primaryKeyword.trim()}`;
        }

        userPrompt += `\n\n### Reference Catalog (MUST use for facts — every factSources.url must be from this list)\n${formatCatalogForPrompt(referenceCatalog)}`;

        if (strategySession?.inspiration?.length) {
            userPrompt += `\n\n### Competitor / inspiration pages (mine facts from insights; cite the matching URL)\n${strategySession.inspiration
                .map((i) => `- ${i.title}: ${i.url}\n  Insights: ${i.insights}`)
                .join("\n")}`;
        }

        const notes = topicBrief?.userNotes?.trim();
        const files = topicBrief?.supplementaryFiles?.filter((f) => f.content?.trim()) ?? [];
        if (notes || files.length > 0) {
            userPrompt += "\n\n### Author Brief (MUST honor — infuse these thoughts and facts throughout the post)";
            if (notes) {
                userPrompt += `\n\nUser notes and direction:\n${notes.slice(0, MAX_BRIEF_CHARS)}`;
            }
            if (files.length > 0) {
                userPrompt += "\n\nSupplementary reference material:";
                let briefUsed = notes?.length ?? 0;
                for (const f of files) {
                    const room = MAX_BRIEF_CHARS - briefUsed;
                    if (room <= 0) break;
                    const chunk = f.content.trim().slice(0, room);
                    briefUsed += chunk.length;
                    userPrompt += `\n\n--- ${f.name} ---\n${chunk}`;
                }
            }
        }

        const constraints = topicBrief?.contentConstraints;
        if (hasContentConstraints(constraints)) {
            userPrompt += `\n\n${buildContentConstraintsPrompt(constraints!)}`;
        }

        if (notes) {
            userPrompt += `\n\n### Author brief labels\nWhen a fact comes only from user notes (no catalog URL), set source to "Author brief" and url to the closest relevant Reference Catalog URL that supports the same topic, or the business site URL.`;
        }
        for (const f of files) {
            userPrompt += `\n\n### Uploaded file: ${f.name}\nWhen a fact comes from this file, set source to the publisher name (not the filename) and url from the catalog or a URL found in the file.`;
        }

        const targetWords = constraints?.wordCount && constraints.wordCount > 0 ? constraints.wordCount : undefined;

        const response = await client.chat.completions.create({
            model: azure.deployment,
            max_completion_tokens: completionTokenBudget(constraints),
            messages: [
                { role: "system", content: buildSystemPrompt(businessContext, targetWords) },
                { role: "user", content: userPrompt },
            ],
        });
        const text = assistantMessageText((response as any)?.choices?.[0]?.message?.content);

        const parsed = parseBlogPostJson(text);
        if (!parsed) {
            throw new Error("Model returned invalid JSON format");
        }

        let postData = normalizePostFromParsed(parsed, topic, constraints);

        if (constraints?.wordCount && constraints.wordCount > 0) {
            postData = await expandDraftIfShort(client, azure.deployment, postData, constraints, topic);
        }

        let factSources: FactSource[] = normalizeFactSourcesFromModel(
            parsed.factSources ?? postData.factSources,
            postData.contentMarkdown,
            referenceCatalog,
        );
        factSources = enrichFactSourcesWithCatalog(factSources, referenceCatalog).filter(
            (f) => f.url && f.excerpt,
        );
        if (factSources.length > 0) {
            postData.factSources = factSources;
        }

        return NextResponse.json({ data: postData });
    } catch (err) {
        const message = extractRouteError(err, "Content Agent generation failed");
        console.error("Content Agent Error:", err);
        const lower = message.toLowerCase();
        const hint = lower.includes("rate") || lower.includes("429")
            ? " Rate limit hit — wait 1 min and retry."
            : lower.includes("json") || lower.includes("parse")
                ? " LLM returned invalid JSON — retry."
                : lower.includes("context") || lower.includes("token") || lower.includes("length")
                    ? " Prompt may be too long — shorten your brief or remove large files."
                    : "";
        return NextResponse.json({ error: message + hint }, { status: 500 });
    }
}
