import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleGenAI } from "@google/genai";
import type { OptimizedContent } from "@/lib/types/optimization";
import type { BusinessContext } from "@/lib/types/businessContext";
import type { ImageMetadata } from "@/lib/types/image";

const apiKey = process.env.GEMINI_API_KEY;

export async function POST(req: Request) {
    if (!apiKey) {
        return NextResponse.json({ error: "GEMINI_API_KEY is not set" }, { status: 500 });
    }

    try {
        const body = await req.json();
        const { optimizedContent, businessContext, customPrompt, currentImage }: { optimizedContent: OptimizedContent, businessContext: BusinessContext, customPrompt?: string, currentImage?: string } = body;

        if (!optimizedContent || !businessContext) {
            return NextResponse.json({ error: "Missing payload" }, { status: 400 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: `You are an expert art director. Given a blog post and business context, generate a 2-3 word highly specific visual search query that perfectly encapsulates the mood of the article. Do NOT include words like "photo", "image", or "banner". Just the subject matter.
Return ONLY valid JSON: { "searchQuery": "...", "altText": "..." }`,
            generationConfig: {
                responseMimeType: "application/json",
            }
        });

        let promptContents: any[] = [];

        let promptText = `Business Type: ${businessContext.businessType}\nBlog Title: ${optimizedContent.title}\nDescription: ${optimizedContent.metaDescription}`;
        if (customPrompt) {
            promptText += `\n\nUser Revision Request: ${customPrompt}`;
            if (currentImage) {
                promptText += `\n\nThe user wants to modify the attached currently generated image based on their revision request above. Analyze the attached image, apply the user's request, and output a NET-NEW visual search query that describes this new modified concept in full detail. Return ONLY JSON: { "searchQuery": "...", "altText": "..." }`;
                promptContents.push({
                    inlineData: {
                        mimeType: "image/jpeg",
                        data: currentImage.replace(/^data:image\/\w+;base64,/, "")
                    }
                });
            }
        }

        promptContents.push({ text: promptText });

        const result = await model.generateContent(promptContents);
        const text = result.response.text().trim();
        const json = JSON.parse(text);

        // Dynamically fetch from an image generation API. Using random seeds to prevent caching.
        const randomSeed = Math.floor(Math.random() * 1000000);

        let bannerUrl = "";
        let ctaUrl = "";

        try {
            const ai = new GoogleGenAI({ apiKey });
            const [bannerRes, ctaRes] = await Promise.all([
                ai.models.generateImages({
                    model: 'imagen-3.0-generate-001',
                    prompt: json.searchQuery + " banner",
                    config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: "16:9" }
                }).catch(() => ai.models.generateImages({
                    model: 'imagen-4.0-generate-001',
                    prompt: json.searchQuery + " banner",
                    config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: "16:9" }
                })),
                ai.models.generateImages({
                    model: 'imagen-3.0-generate-001',
                    prompt: json.searchQuery + " square",
                    config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: "1:1" }
                }).catch(() => ai.models.generateImages({
                    model: 'imagen-4.0-generate-001',
                    prompt: json.searchQuery + " square",
                    config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: "1:1" }
                }))
            ]);

            if (bannerRes.generatedImages?.[0]?.image?.imageBytes) {
                bannerUrl = `data:image/jpeg;base64,${bannerRes.generatedImages[0].image.imageBytes}`;
            }
            if (ctaRes.generatedImages?.[0]?.image?.imageBytes) {
                ctaUrl = `data:image/jpeg;base64,${ctaRes.generatedImages[0].image.imageBytes}`;
            }
        } catch (e) {
            console.error("Imagen failed, using fallback:", e);
        }

        // Fallback if Google AI API fails
        if (!bannerUrl) bannerUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(json.searchQuery + " banner " + randomSeed)}?width=1600&height=900&nologo=true`;
        if (!ctaUrl) ctaUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(json.searchQuery + " square " + randomSeed)}?width=800&height=800&nologo=true`;

        const imageMetadata: ImageMetadata = {
            bannerImageUrl: bannerUrl,
            ctaImageUrl: ctaUrl,
            altText: json.altText || "Professional business imagery"
        };

        return NextResponse.json({ images: imageMetadata, query: json.searchQuery }, { status: 200 });

    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to generate images";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
