import { NextResponse } from "next/server";
import type { OptimizedContent } from "@/lib/types/optimization";
import type { BusinessContext } from "@/lib/types/businessContext";
import type { MetaOption } from "@/lib/types/meta";
import type { SchemaData } from "@/lib/types/schema";
import { sanitizeJsonString } from "@/lib/sanitizeJson";
import { assistantMessageText, azureConfigDebug, createAzureClient, getAzureConfig, stripOuterMarkdownFence } from "@/lib/azureOpenAI";

export async function POST(req: Request) {
    const azure = getAzureConfig();
    if (!azure) {
        return NextResponse.json({ error: "Azure OpenAI is not configured on the server", debug: azureConfigDebug() }, { status: 500 });
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
        const client = createAzureClient(azure);
        const systemPrompt = `You are an expert technical SEO specialist. Generate a strict JSON-LD representation (as a string) for the provided blog post, incorporating LocalBusiness/Organization data and Article/BlogPosting schema. If there are FAQs, include FAQPage schema.
Return ONLY valid JSON matching the SchemaData schema: 
{ 
  "type": "Article", 
  "jsonLd": "{ ... your generated JSON-LD string ... }", 
  "validationStatus": "valid"
}
Do NOT include any explanatory text outside the JSON. Ensure the jsonLd field contains an escaped string representation of the JSON-LD object.`;

        const prompt = `Business Name: ${businessContext.businessName}\nIndustry: ${businessContext.businessType}\nTarget Audience: ${businessContext.targetAudience}\n\nBlog Title: ${meta.title}\nMeta Description: ${meta.description}\n\nContent:\n${optimizedContent.contentMarkdown}\n\nFAQs:\n${JSON.stringify(optimizedContent.faqs)}`;

        const response = await client.chat.completions.create({
            model: azure.deployment,
            max_completion_tokens: 2200,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt },
            ],
        });
        const text = assistantMessageText((response as any)?.choices?.[0]?.message?.content);
        const clean = sanitizeJsonString(stripOuterMarkdownFence(text));

        const payload: SchemaData = JSON.parse(clean);

        return NextResponse.json({ schemaData: payload }, { status: 200 });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Schema generation failed";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
