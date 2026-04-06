import { NextResponse } from "next/server";
import type { BlogPost } from "@/lib/types/content";
import type { OptimizedContent } from "@/lib/types/optimization";
import { sanitizeJsonString } from "@/lib/sanitizeJson";
import { assistantMessageText, azureConfigDebug, createAzureClient, getAzureConfig, stripOuterMarkdownFence } from "@/lib/azureOpenAI";

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

    const { blogPost, businessContext, isRefining } = body as { blogPost?: BlogPost, businessContext?: any, isRefining?: boolean };
    if (!blogPost) {
        return NextResponse.json({ error: "Missing blogPost" }, { status: 400 });
    }

    try {
        const client = createAzureClient(azure);
        const systemPrompt = `You are an expert content optimizer for beauty & wellness blogs. Take the provided blog post JSON and:
- Improve flow and readability (use clear headings, concise paragraphs).
- Ensure balanced sections (no overly long or short parts).
- CRITICAL — INTERNAL LINKS: You MUST weave at least 2-3 internal links directly into the body of contentMarkdown using markdown link syntax. Example: [Book a consultation](/services). ONLY use links from this approved list: ${JSON.stringify(businessContext?.internalLinks || [])}. Do not place links in headings. Place them naturally within paragraphs so they read well.
- ZERO-GPT HUMANIZE: Ensure the text reads as 100% human-written to pass plagiarism/AI checkers. You must strictly ABANDON all em-dashes (—). DO NOT use fluff words like "elevate", "delve", "moreover", or "in today's landscape". Use varied sentence length.
- Provide detailed SEO scores inside the 'seoScores' object. Provide numerical percent scores out of 100 for 'overall', 'contentStructure', and 'readability'. Provide an array of 'targetKeywords'. Also provide an array of 'actionableInsights' containing 2-3 specific, actionable tips to fix any scores below 90. Note: if all scores are >= 90, leave actionableInsights empty.
- JSON ESCAPING: You MUST escape all newlines within string values as \\n. NEVER output raw, unescaped newlines or tabs inside the JSON string values.
- JSON ESCAPING: You MUST escape all double quotes inside string values as \\".
- JSON ESCAPING: Do NOT escape single quotes ('). Do NOT use \\'.
- Do NOT include the H1 title in the contentMarkdown. Start directly with the intro paragraph or H2.
- Return ONLY a JSON object matching the OptimizedContent schema.
Do NOT include any explanatory text.
`;

        const prompt = isRefining
            ? `Please strictly fix any previously identified issues and further optimize the following content. BlogPost JSON:\n${JSON.stringify(blogPost, null, 2)}`
            : `BlogPost JSON:\n${JSON.stringify(blogPost, null, 2)}`;

        const response = await client.chat.completions.create({
            model: azure.deployment,
            max_completion_tokens: 5000,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt },
            ],
        });
        const text = assistantMessageText((response as any)?.choices?.[0]?.message?.content);
        const clean = sanitizeJsonString(stripOuterMarkdownFence(text));
        const optimized: OptimizedContent = JSON.parse(clean);

        // Fix for Gemini over-escaping newlines into literal "\n" strings
        if (optimized.contentMarkdown) {
            optimized.contentMarkdown = optimized.contentMarkdown.replace(/\\n/g, '\n');
            optimized.contentMarkdown = optimized.contentMarkdown.replace(/^#\s+[^\n]*\n+/i, '').trimStart();
        }

        // Attach a mock plagiarism report directly to the optimized payload
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

        return NextResponse.json({ optimized }, { status: 200 });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Optimization failed";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
