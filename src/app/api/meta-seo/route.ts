import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { OptimizedContent } from "@/lib/types/optimization";
import type { MetaSeoPayload } from "@/lib/types/meta";

const apiKey = process.env.GEMINI_API_KEY;

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
            model: "gemini-2.5-pro",
            systemInstruction: `You are an expert SEO specialist. Generate 3 compelling Meta Title and Meta Description options for the provided blog post.
Requirements:
1. Titles must be under 60 characters.
2. Descriptions must be under 160 characters.
3. Provide a 'plain-English tooltip' (explanation) for why each option works well for the target audience. Output ONLY a valid JSON object matching the MetaSeoPayload schema: { options: [{ title, description, explanation }] }. No markdown formatting or extra text.`,
            generationConfig: {
                responseMimeType: "application/json",
            },
        });

        const prompt = `Blog Post Content:\nTitle: ${optimizedContent.title}\nDescription: ${optimizedContent.metaDescription}\n\n${optimizedContent.contentMarkdown}`;
        const result = await model.generateContent(prompt);

        const text = result.response.text().trim();
        const clean = text.replace(/^```[a-z]*\n/i, "").replace(/\n```$/i, "").trim();
        const payload: MetaSeoPayload = JSON.parse(clean);

        return NextResponse.json({ payload }, { status: 200 });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Meta SEO generation failed";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
