import { NextResponse } from "next/server";
import type { OptimizedContent } from "@/lib/types/optimization";
import type { BusinessContext } from "@/lib/types/businessContext";
import type { ImageMetadata } from "@/lib/types/image";
import { sanitizeJsonString } from "@/lib/sanitizeJson";
import { parseJsonFromModelText } from "@/lib/parseModelJson";
import {
    assistantMessageText,
    azureConfigDebug,
    createAzureClient,
    getAzureConfig,
    stripOuterMarkdownFence,
} from "@/lib/azureOpenAI";
import {
    craftImageDirectorBrief,
    generateGeminiImageDataUrl,
    getGeminiApiKey,
} from "@/lib/geminiImageGen";
import { ensureBlogImageDataUrl } from "@/lib/blogImageCompress";

/** Enforce Supabase bucket size limit on generated data URLs; drop oversized blobs. */
async function finalizeGeneratedImageUrl(url: string | null): Promise<string | null> {
    if (!url?.trim()) return null;
    if (!url.startsWith("data:")) return url;
    return ensureBlogImageDataUrl(url);
}

function azureImageToDataUrl(image: { b64_json?: string; url?: string }): string | null {
    const b64 = typeof image?.b64_json === "string" ? image.b64_json : "";
    if (b64) return `data:image/jpeg;base64,${b64}`;
    const url = typeof image?.url === "string" ? image.url : "";
    return url || null;
}

function buildPollinationsUrl(searchQuery: string, variant: "banner" | "square"): string {
    const seed = Math.floor(Math.random() * 1_000_000);
    const prompt =
        variant === "banner"
            ? `${searchQuery}, blog hero banner, modern professional, clean lighting`
            : `${searchQuery}, square call-to-action visual, modern professional`;
    const size = variant === "banner" ? "width=1600&height=900" : "width=800&height=800";
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${size}&nologo=true&seed=${seed}`;
}

function buildPicsumFallbackUrl(searchQuery: string, variant: "banner" | "square"): string {
    const slug = encodeURIComponent(searchQuery.slice(0, 60) || "blog-hero");
    return variant === "banner"
        ? `https://picsum.photos/seed/${slug}/1600/900`
        : `https://picsum.photos/seed/${slug}-cta/800/800`;
}

async function generateAzureImageUrl(
    client: ReturnType<typeof createAzureClient>,
    imageDeployment: string,
    prompt: string,
    square: boolean,
): Promise<string | null> {
    try {
        const resp = await client.images.generate({
            model: imageDeployment,
            prompt,
            size: square ? "1024x1024" : "1536x1024",
        } as Parameters<typeof client.images.generate>[0]);
        const raw = azureImageToDataUrl((resp as { data?: { b64_json?: string; url?: string }[] })?.data?.[0] ?? {});
        return finalizeGeneratedImageUrl(raw);
    } catch (err) {
        console.error("[image-agent] Azure image generation failed", err);
        return null;
    }
}

async function resolveImageDirectorBrief(
    promptText: string,
    azureClient: ReturnType<typeof createAzureClient> | null,
    azureDeployment: string | null,
): Promise<{ searchQuery: string; altText: string }> {
    const geminiBrief = await craftImageDirectorBrief(promptText);
    if (geminiBrief) return geminiBrief;

    if (azureClient && azureDeployment) {
        try {
            const response = await azureClient.chat.completions.create({
                model: azureDeployment,
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
            const text = assistantMessageText(response?.choices?.[0]?.message?.content);
            const parsed = parseJsonFromModelText<{ searchQuery?: string; altText?: string }>(
                sanitizeJsonString(stripOuterMarkdownFence(text)),
            );
            if (parsed?.searchQuery?.trim()) {
                return {
                    searchQuery: parsed.searchQuery.trim(),
                    altText: String(parsed.altText ?? "").trim() || "Illustration related to the article",
                };
            }
        } catch (err) {
            console.error("[image-agent] Azure art director failed", err);
        }
    }

    return {
        searchQuery: "professional business editorial",
        altText: "Illustration related to the article",
    };
}

export async function POST(req: Request) {
    const geminiKey = getGeminiApiKey();
    const azure = getAzureConfig();

    if (!geminiKey && !azure) {
        return NextResponse.json(
            {
                error: "Set GEMINI_API_KEY (Google AI Studio) for image generation, or configure Azure OpenAI.",
                debug: azureConfigDebug(),
            },
            { status: 500 },
        );
    }

    try {
        const body = await req.json();
        const {
            optimizedContent,
            businessContext,
            customPrompt,
        }: {
            optimizedContent: OptimizedContent;
            businessContext: BusinessContext;
            customPrompt?: string;
        } = body;

        if (!optimizedContent || !businessContext) {
            return NextResponse.json({ error: "Missing payload" }, { status: 400 });
        }

        let promptText = `Business Type: ${businessContext.businessType}\nBlog Title: ${optimizedContent.title}\nDescription: ${optimizedContent.metaDescription}`;
        if (customPrompt) {
            promptText += `\n\nUser Revision Request: ${customPrompt}`;
            promptText += `\n\nInfer a revised creative direction from the change request and return a NET-NEW visual direction.`;
        }

        const azureClient = azure ? createAzureClient(azure) : null;
        const textDeployment = azure?.deployment ?? "";
        const imageDeployment =
            process.env.AZURE_OPENAI_IMAGE_DEPLOYMENT?.trim() || azure?.deployment || "";

        const { searchQuery, altText } = await resolveImageDirectorBrief(
            promptText,
            azureClient,
            textDeployment || null,
        );

        const bannerPrompt = `${searchQuery}, blog hero banner, modern professional, clean lighting, editorial photography`;
        const ctaPrompt = `${searchQuery}, square call-to-action visual, modern professional, clean lighting`;

        let bannerUrl: string | null = null;
        let ctaUrl: string | null = null;
        let imageProvider: "gemini" | "azure" | "fallback" = "fallback";

        if (geminiKey) {
            [bannerUrl, ctaUrl] = await Promise.all([
                generateGeminiImageDataUrl(bannerPrompt, "16:9"),
                generateGeminiImageDataUrl(ctaPrompt, "1:1"),
            ]);
            if (bannerUrl || ctaUrl) imageProvider = "gemini";
        }

        if ((!bannerUrl || !ctaUrl) && azureClient && imageDeployment) {
            const [azureBanner, azureCta] = await Promise.all([
                bannerUrl
                    ? Promise.resolve(bannerUrl)
                    : generateAzureImageUrl(azureClient, imageDeployment, bannerPrompt, false),
                ctaUrl
                    ? Promise.resolve(ctaUrl)
                    : generateAzureImageUrl(azureClient, imageDeployment, ctaPrompt, true),
            ]);
            bannerUrl = bannerUrl || azureBanner;
            ctaUrl = ctaUrl || azureCta;
            if (azureBanner || azureCta) imageProvider = "azure";
        }

        if (!bannerUrl) bannerUrl = buildPollinationsUrl(searchQuery, "banner");
        if (!ctaUrl) ctaUrl = buildPollinationsUrl(searchQuery, "square");
        if (!bannerUrl) bannerUrl = buildPicsumFallbackUrl(searchQuery, "banner");
        if (!ctaUrl) ctaUrl = buildPicsumFallbackUrl(searchQuery, "square");

        bannerUrl = (await finalizeGeneratedImageUrl(bannerUrl)) ?? buildPollinationsUrl(searchQuery, "banner");
        ctaUrl = (await finalizeGeneratedImageUrl(ctaUrl)) ?? buildPollinationsUrl(searchQuery, "square");

        const imageMetadata: ImageMetadata = {
            bannerImageUrl: bannerUrl,
            ctaImageUrl: ctaUrl,
            altText: altText || `Illustration related to ${optimizedContent.title}`,
        };

        return NextResponse.json(
            { images: imageMetadata, query: searchQuery, provider: imageProvider },
            { status: 200 },
        );
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to generate images";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
