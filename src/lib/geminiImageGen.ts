import { GoogleGenAI } from "@google/genai";
import { parseJsonFromModelText } from "@/lib/parseModelJson";

export type ImageDirectorBrief = {
    searchQuery: string;
    altText: string;
};

export function getGeminiApiKey(): string | null {
    return process.env.GEMINI_API_KEY?.trim() || null;
}

/** Imagen on Gemini API (Google AI Studio). Veo is video-only — see GEMINI_VIDEO_MODEL. */
export function getGeminiImageModel(): string {
    return process.env.GEMINI_IMAGE_MODEL?.trim() || "imagen-4.0-generate-001";
}

function getGeminiTextModel(): string {
    return process.env.GEMINI_TEXT_MODEL?.trim() || "gemini-2.5-flash";
}

function imageBytesToDataUrl(bytes: string | undefined): string | null {
    if (!bytes?.trim()) return null;
    const trimmed = bytes.trim();
    if (trimmed.startsWith("data:image/")) return trimmed;
    return `data:image/png;base64,${trimmed}`;
}

/**
 * Generate a single image via Google AI Studio (Imagen).
 * @returns data URL or null on failure / safety filter
 */
export async function generateGeminiImageDataUrl(
    prompt: string,
    aspectRatio: "16:9" | "1:1" | "4:3" = "16:9",
): Promise<string | null> {
    const apiKey = getGeminiApiKey();
    if (!apiKey) return null;

    const ai = new GoogleGenAI({ apiKey });
    const model = getGeminiImageModel();

    try {
        const response = await ai.models.generateImages({
            model,
            prompt,
            config: {
                numberOfImages: 1,
                aspectRatio,
                includeRaiReason: true,
                outputMimeType: "image/png",
            },
        });

        const first = response.generatedImages?.[0];
        const dataUrl = imageBytesToDataUrl(first?.image?.imageBytes);
        if (dataUrl) return dataUrl;

        const reason = first?.raiFilteredReason;
        if (reason) {
            console.warn("[gemini-image] Image filtered:", reason);
        }
        return null;
    } catch (err) {
        console.error("[gemini-image] generateImages failed", { model, err });
        return null;
    }
}

/** Short visual brief + alt text for banner/CTA prompts. */
export async function craftImageDirectorBrief(
    promptText: string,
): Promise<ImageDirectorBrief | null> {
    const apiKey = getGeminiApiKey();
    if (!apiKey) return null;

    const ai = new GoogleGenAI({ apiKey });

    try {
        const response = await ai.models.generateContent({
            model: getGeminiTextModel(),
            contents: promptText,
            config: {
                systemInstruction: `You are an expert art director. Given a blog post and business context, produce a concise visual direction for AI image generation.
Return ONLY valid JSON: { "searchQuery": "...", "altText": "..." }
- searchQuery: 4–10 words describing the scene/mood (no words like photo, image, banner, stock).
- altText: one accessible sentence for screen readers.`,
                responseMimeType: "application/json",
            },
        });

        const text =
            typeof response.text === "string"
                ? response.text
                : String(response.candidates?.[0]?.content?.parts?.[0]?.text ?? "");

        const parsed = parseJsonFromModelText<{ searchQuery?: string; altText?: string }>(text);
        if (!parsed) return null;

        const searchQuery = String(parsed.searchQuery ?? "").trim();
        const altText = String(parsed.altText ?? "").trim();
        if (!searchQuery) return null;

        return {
            searchQuery,
            altText: altText || `Illustration related to the article`,
        };
    } catch (err) {
        console.error("[gemini-image] art director brief failed", err);
        return null;
    }
}
