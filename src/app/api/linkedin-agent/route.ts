import { NextResponse } from "next/server";
import { GoogleGenerativeAI, Schema, SchemaType } from "@google/generative-ai";
import { type BusinessContext } from "@/lib/types/businessContext";
import { type TopicOption } from "@/lib/types/strategy";

const apiKey = process.env.GEMINI_API_KEY;

const linkedinSchema: Schema = {
    type: SchemaType.OBJECT,
    properties: {
        contentMarkdown: { type: SchemaType.STRING, description: "The full body of the LinkedIn post. Use bolding with asterisks for emphasis. Include line breaks for readability." },
        hashtags: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description: "3-5 relevant hashtags for the post."
        },
        hooks: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description: "3 catchy alternate opening hooks for this post."
        },
        suggestedFormat: {
            type: SchemaType.STRING,
            enum: ["storytelling", "listicle", "thought-leadership", "announcement"],
            description: "The stylistic format of the generated post."
        }
    },
    required: ["contentMarkdown", "hashtags", "hooks", "suggestedFormat"]
};

const SYSTEM_PROMPT = `
You are an expert Ghostwriter for high-impact LinkedIn creators.
Your goal is to transform a specific topic and business context into a viral-ready LinkedIn post.

LinkedIn Copywriting Rules:
1. **The Hook**: Start with a heavy-hitting first line that forces the scroller to stop. (No "I'm excited to share", no "Have you ever wondered").
2. **Whitespace**: Use generous line breaks. No big blocks of text. One or two sentences per paragraph maximum.
3. **Tone**: Direct, authentic, and authoritative. Use the user's "Positioning" tone from the business context.
4. **Value-First**: Every line should move the reader toward a transformation or realization.
5. **No Fluff**: Get rid of "In today's fast-paced world" or "Look no further".
6. **Bold & Lists**: Use bolding sparingly for emphasis. Use bullet points (plain dots or emojis) for lists.
7. **Hashtags**: Place hashtags at the very bottom.
8. **Personal Branding**: Ensure it feels written by an individual, not a marketing agency. Use "I" and "my" where appropriate.

Provide 3 alternate hooks so the user can choose.
Provide exactly one core post body in the format specified by suggestedFormat.

JUST JSON. Output only valid JSON.
`;

export async function POST(req: Request) {
    if (!apiKey) {
        return NextResponse.json(
            { error: "GEMINI_API_KEY is not set" },
            { status: 500 }
        );
    }

    try {
        const { businessContext, topic }: { businessContext: BusinessContext; topic: TopicOption } = await req.json();

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: SYSTEM_PROMPT,
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: linkedinSchema,
            }
        });

        const userPrompt = `Generate a high-impact LinkedIn post JSON for the following:\n\n### Business Context\n${JSON.stringify(businessContext, null, 2)}\n\n### Topic\n${JSON.stringify(topic, null, 2)}`;

        const result = await model.generateContent(userPrompt);
        const text = result.response.text().trim();
        const postData = JSON.parse(text);

        return NextResponse.json({ data: postData });
    } catch (err) {
        const message = err instanceof Error ? err.message : "LinkedIn Agent failed";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
