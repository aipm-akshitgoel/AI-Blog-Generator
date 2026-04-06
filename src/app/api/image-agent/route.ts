import { NextResponse } from "next/server";
import type { OptimizedContent } from "@/lib/types/optimization";
import type { BusinessContext } from "@/lib/types/businessContext";
import type { ImageMetadata } from "@/lib/types/image";
import { sanitizeJsonString } from "@/lib/sanitizeJson";
import { assistantMessageText, azureConfigDebug, createAzureClient, getAzureConfig, stripOuterMarkdownFence } from "@/lib/azureOpenAI";

function azureImageToDataUrl(image: any): string | null {
    const b64 = typeof image?.b64_json === "string" ? image.b64_json : "";
    if (b64) return `data:image/png;base64,${b64}`;
    const url = typeof image?.url === "string" ? image.url : "";
    return url || null;
}

export async function POST(req: Request) {
    const azure = getAzureConfig();
    if (!azure) {
        return NextResponse.json({ error: "Azure OpenAI is not configured on the server", debug: azureConfigDebug() }, { status: 500 });
    }

    try {
        const body = await req.json();
        const { optimizedContent, businessContext, customPrompt, currentImage }: { optimizedContent: OptimizedContent, businessContext: BusinessContext, customPrompt?: string, currentImage?: string } = body;

        if (!optimizedContent || !businessContext) {
            return NextResponse.json({ error: "Missing payload" }, { status: 400 });
        }

        const client = createAzureClient(azure);
        let promptText = `Business Type: ${businessContext.businessType}\nBlog Title: ${optimizedContent.title}\nDescription: ${optimizedContent.metaDescription}`;
        if (customPrompt) {
            promptText += `\n\nUser Revision Request: ${customPrompt}`;
            if (currentImage) {
                promptText += `\n\nThe user is revising an existing image concept. Infer a revised creative direction from the change request and return a NET-NEW query.`;
            }
        }

        const response = await client.chat.completions.create({
            model: azure.deployment,
            max_completion_tokens: 500,
            messages: [
                {
                    role: "system",
                    content: `You are an expert art director. Given a blog post and business context, generate a 2-3 word highly specific visual search query that encapsulates the article mood. Do not include words like photo, image, or banner.
Return ONLY valid JSON: { "searchQuery": "...", "altText": "..." }`,
                },
                { role: "user", content: promptText },
            ],
        });
        const text = assistantMessageText((response as any)?.choices?.[0]?.message?.content);
        const clean = sanitizeJsonString(stripOuterMarkdownFence(text));
        const json = JSON.parse(clean) as { searchQuery?: string; altText?: string };

        const searchQuery = (json.searchQuery || `${businessContext.businessType} premium service`).trim();
        const imageDeployment = process.env.AZURE_OPENAI_IMAGE_DEPLOYMENT?.trim() || azure.deployment;

        let bannerUrl = "";
        let ctaUrl = "";

        try {
            const [bannerResp, ctaResp] = await Promise.all([
                client.images.generate({
                    model: imageDeployment,
                    prompt: `${searchQuery}, blog hero banner, modern professional, clean lighting`,
                    size: "1536x1024",
                } as any),
                client.images.generate({
                    model: imageDeployment,
                    prompt: `${searchQuery}, square call-to-action visual, modern professional, clean lighting`,
                    size: "1024x1024",
                } as any),
            ]);

            bannerUrl = azureImageToDataUrl((bannerResp as any)?.data?.[0]) || "";
            ctaUrl = azureImageToDataUrl((ctaResp as any)?.data?.[0]) || "";
        } catch (azureImageErr) {
            console.error("Azure image generation failed, falling back to pollinations", azureImageErr);
            const randomSeed = Math.floor(Math.random() * 1000000);
            bannerUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(searchQuery + " banner " + randomSeed)}?width=1600&height=900&nologo=true`;
            ctaUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(searchQuery + " square " + randomSeed)}?width=800&height=800&nologo=true`;
        }

        const imageMetadata: ImageMetadata = {
            bannerImageUrl: bannerUrl,
            ctaImageUrl: ctaUrl,
            altText: json.altText || "Professional business imagery"
        };

        return NextResponse.json({ images: imageMetadata, query: searchQuery }, { status: 200 });

    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to generate images";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
