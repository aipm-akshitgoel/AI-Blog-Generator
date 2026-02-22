import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { OptimizedContent } from "@/lib/types/optimization";
import type { BusinessContext } from "@/lib/types/businessContext";
import type { MetaOption } from "@/lib/types/meta";
import type { SchemaData } from "@/lib/types/schema";

const apiKey = process.env.GEMINI_API_KEY;

export async function POST(req: Request) {
    if (!apiKey) {
        return NextResponse.json({ error: "GEMINI_API_KEY is not set" }, { status: 500 });
    }

    let body: { optimizedContent?: OptimizedContent, businessContext?: BusinessContext, meta?: MetaOption };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { optimizedContent, businessContext, meta } = body;
    if (!optimizedContent || !businessContext || !meta) {
        return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: `You are an expert technical SEO specialist. Generate a strict JSON-LD representation (as a string) for the provided blog post, incorporating LocalBusiness/Organization data and Article/BlogPosting schema. If there are FAQs, include FAQPage schema.
Return ONLY valid JSON matching the SchemaData schema: 
{ 
  "type": "Article", 
  "jsonLd": "{ ... your generated JSON-LD string ... }", 
  "validationStatus": "valid"
}
Do NOT include any explanatory text outside the JSON. Ensure the jsonLd field contains an escaped string representation of the JSON-LD object.`,
            generationConfig: {
                responseMimeType: "application/json",
            },
        });

        const prompt = `Business Name: ${businessContext.businessName}\nIndustry: ${businessContext.businessType}\nTarget Audience: ${businessContext.targetAudience}\n\nBlog Title: ${meta.title}\nMeta Description: ${meta.description}\n\nContent:\n${optimizedContent.contentMarkdown}\n\nFAQs:\n${JSON.stringify(optimizedContent.faqs)}`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        const clean = text.replace(/^```[a-z]*\n/i, "").replace(/\n```$/i, "").trim();

        const payload: SchemaData = JSON.parse(clean);

        return NextResponse.json({ schemaData: payload }, { status: 200 });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Schema generation failed";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
