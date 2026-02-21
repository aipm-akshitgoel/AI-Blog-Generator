import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { BlogPost } from "@/lib/types/content";
import type { OptimizedContent } from "@/lib/types/optimization";

const apiKey = process.env.GEMINI_API_KEY;

export async function POST(req: Request) {
    if (!apiKey) {
        return NextResponse.json({ error: "GEMINI_API_KEY is not set" }, { status: 500 });
    }

    let body: { blogPost?: BlogPost };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { blogPost, isRefining } = body as { blogPost?: BlogPost, isRefining?: boolean };
    if (!blogPost) {
        return NextResponse.json({ error: "Missing blogPost" }, { status: 400 });
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-pro",
            systemInstruction: `You are an expert content optimizer for beauty & wellness blogs. Take the provided blog post JSON and:
- Improve flow and readability (use clear headings, concise paragraphs).
- Ensure balanced sections (no overly long or short parts).
- Add internal links where appropriate. Use markdown link syntax with anchor text that is SEO‑safe.
- Provide detailed SEO scores inside the 'seoScores' object. Provide numerical percent scores out of 100 for 'overall', 'contentStructure', and 'readability'. Provide an array of 'targetKeywords'. Also provide an array of 'actionableInsights' containing 2-3 specific, actionable tips to fix any scores below 90. Note: if all scores are >= 90, leave actionableInsights empty.
- Return ONLY a JSON object matching the OptimizedContent schema.
Do NOT include any explanatory text.
`,
            generationConfig: {
                responseMimeType: "application/json",
            }
        });

        const prompt = isRefining
            ? `Please strictly fix any previously identified issues and further optimize the following content. BlogPost JSON:\n${JSON.stringify(blogPost, null, 2)}`
            : `BlogPost JSON:\n${JSON.stringify(blogPost, null, 2)}`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        const clean = text.replace(/^```[a-z]*\n/i, "").replace(/\n```$/i, "").trim();
        const optimized: OptimizedContent = JSON.parse(clean);

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
