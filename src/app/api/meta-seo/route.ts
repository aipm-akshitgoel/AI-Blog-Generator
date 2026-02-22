import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { OptimizedContent } from "@/lib/types/optimization";
import type { MetaSeoPayload } from "@/lib/types/meta";

const apiKey = process.env.GEMINI_API_KEY;

const TITLE_LIMIT = 60;
const DESC_LIMIT = 160;

/** Hard truncate at word boundary without exceeding limit */
function hardTruncate(text: string, limit: number): string {
    if (text.length <= limit) return text;
    const trimmed = text.slice(0, limit);
    const lastSpace = trimmed.lastIndexOf(" ");
    return (lastSpace > limit * 0.7 ? trimmed.slice(0, lastSpace) : trimmed).trimEnd();
}

export async function POST(req: Request) {
    if (!apiKey) {
        return NextResponse.json({ error: "GEMINI_API_KEY is not set" }, { status: 500 });
    }

    let body: { optimizedContent?: OptimizedContent };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { optimizedContent } = body;
    if (!optimizedContent) {
        return NextResponse.json({ error: "Missing optimizedContent" }, { status: 400 });
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: `You are a meta data specialist. Generate 3 compelling Meta Title and Meta Description options for the provided blog post.

STRICT CHARACTER LIMITS — THIS IS THE MOST IMPORTANT RULE:
- Meta Title: MAXIMUM 60 characters (count every character including spaces). NEVER exceed 60.
- Meta Description: MAXIMUM 155 characters (count every character including spaces). NEVER exceed 155.

Before outputting, COUNT the characters in each title and description. If it exceeds the limit, SHORTEN it until it fits.

GOOD examples (acceptable):
- Title (52 chars): "Luxury Home Builders in Singapore: Top 10 Tips"
- Description (148 chars): "Looking for a trusted luxury home builder in Singapore? Our expert guide covers credentials, portfolios, and pricing to help you choose wisely."

BAD examples (NOT acceptable — too long):
- Title (68 chars): "How to Choose a Luxury Home Builder in Singapore: A Complete Guide"
- Description (165 chars): "Building a luxury home in Singapore? Our 10-point checklist helps you vet builders on credentials, portfolios, and quality. Find the right partner for your dream home."

CATEGORY ASSIGNMENT:
Also assign a single content-type category label based on the blog post's format and purpose.
Choose ONLY from this list: Tips, Guide, Trends, How-To, Case Study, Opinion, News, Checklist, Listicle, Review
- Use "Tips" for advice-based posts
- Use "Guide" or "How-To" for instructional posts
- Use "Checklist" for step-by-step or point-based posts
- Use "Listicle" for numbered list posts
- Use "Trends" for industry trend posts
- Do NOT use the business's industry (e.g. never use "hair", "salon", "construction" as category)

OUTPUT ONLY a valid JSON object: { "options": [{ "title": "...", "description": "...", "explanation": "...", "category": "..." }] }
No markdown, no extra text, no code fences.`,
            generationConfig: {
                responseMimeType: "application/json",
            },
        });

        const prompt = `Blog Post Content:\nTitle: ${optimizedContent.title}\nDescription: ${optimizedContent.metaDescription}\n\n${optimizedContent.contentMarkdown}`;
        const result = await model.generateContent(prompt);

        const text = result.response.text().trim();
        const clean = text.replace(/^```[a-z]*\n/i, "").replace(/\n```$/i, "").trim();
        const payload: MetaSeoPayload = JSON.parse(clean);

        // ── Server-side safety net: hard truncate every option regardless of LLM output ──
        if (payload?.options) {
            payload.options = payload.options.map((opt) => ({
                ...opt,
                title: hardTruncate(opt.title ?? "", TITLE_LIMIT),
                description: hardTruncate(opt.description ?? "", DESC_LIMIT),
            }));
        }

        return NextResponse.json({ payload }, { status: 200 });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Meta SEO generation failed";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
