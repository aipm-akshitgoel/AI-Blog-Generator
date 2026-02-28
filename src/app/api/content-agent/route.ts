import { NextResponse } from "next/server";
import { GoogleGenerativeAI, Schema, SchemaType } from "@google/generative-ai";
import { type BusinessContext } from "@/lib/types/businessContext";
import { type TopicOption } from "@/lib/types/strategy";

const apiKey = process.env.GEMINI_API_KEY;

const postSchema: Schema = {
    type: SchemaType.OBJECT,
    properties: {
        title: { type: SchemaType.STRING, description: "The exact SEO Title" },
        slug: { type: SchemaType.STRING, description: "url-friendly-slug-with-dashes" },
        metaDescription: { type: SchemaType.STRING, description: "A punchy, 150-character meta description." },
        contentMarkdown: { type: SchemaType.STRING, description: "Full markdown string of the post. Intro paragraph...\\n\\n## First Heading\\n..." },
        faqs: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    question: { type: SchemaType.STRING },
                    answer: { type: SchemaType.STRING }
                },
                required: ["question", "answer"]
            }
        },
        status: { type: SchemaType.STRING }
    },
    required: ["title", "slug", "metaDescription", "contentMarkdown", "faqs", "status"]
};

const SYSTEM_PROMPT = `
You are an elite, master-level copywriter specializing in local SEO for the beauty and wellness industry (salons, spas, barbershops).
You write exceptional, engaging, and highly structured blog posts.

Your goal is to generate a complete, publication-ready blog post based on two inputs provided by the user:
1. "BusinessContext" (Name, City, Audience, Positioning, Services)
2. "TopicOption" (The specific title and description to write about)

REQUIREMENTS:
1. **Local Relevance**: Naturally weave in the city/region name and connect it to the target audience.
2. **Structure**: Use proper H2 and H3 markdown headers. Use short paragraphs and bullet points where appropriate.
3. **Tone**: Use the exact "Positioning" tone provided in the Business Context.
4. **FAQs**: Include exactly 3 Frequently Asked Questions (with answers) at the end of the post formatted as H2/H3.
5. **No Fluff**: Make it punchy, practical, and highly optimized for read time.
6. **ZeroGPT / Humanization**: The text must read as 100% human-written. Do NOT use em-dashes (—) under any circumstances. Avoid common AI fluff phrases like "delve into", "elevate", "in today's landscape", "moreover", or "in conclusion". Use varied sentence lengths.

CRITICAL INSTRUCTIONS:
- You must ONLY output a valid JSON object matching the schema below. 
- The contentMarkdown field must contain the full markdown string of the post.
- JSON ESCAPING: You MUST escape all newlines within string values as \\n. NEVER output raw, unescaped newlines or tabs inside the JSON string values.
- JSON ESCAPING: You MUST escape all double quotes inside string values as \\".
- JSON ESCAPING: Do NOT escape single quotes ('). Do NOT use \\'.
- Do NOT include the H1 title in the contentMarkdown. Start directly with the intro paragraph or H2.
- Do NOT output any markdown code blocks (like \`\`\`json).
- Do NOT output any conversational text.
- JUST JSON.
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

        if (!businessContext || !topic) {
            return NextResponse.json(
                { error: "Missing businessContext or topic payload" },
                { status: 400 }
            );
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: SYSTEM_PROMPT,
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: postSchema,
                maxOutputTokens: 8192,
            }
        });

        const userPrompt = `Generate the blog post JSON for the following:\n\n### Business Context\n${JSON.stringify(businessContext, null, 2)}\n\n### Approved Topic\n${JSON.stringify(topic, null, 2)}`;

        const result = await model.generateContent(userPrompt);
        const text = result.response.text().trim();

        // Clean any potential markdown wrapper the LLM might stubborn include
        const cleanText = text.replace(/^```[a-z]*\n/i, '').replace(/\n```$/i, '').trim();

        // Parse the JSON post
        const postData = JSON.parse(cleanText);

        // Fix for Gemini over-escaping newlines into literal "\n" strings
        if (postData.contentMarkdown) {
            postData.contentMarkdown = postData.contentMarkdown.replace(/\\n/g, '\n');
            postData.contentMarkdown = postData.contentMarkdown.replace(/^#\s+[^\n]*\n+/i, '').trimStart();
        }

        return NextResponse.json({ data: postData });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Content Agent generation failed";
        console.error("Content Agent Error:", err);
        const hint = message.toLowerCase().includes("rate") || message.toLowerCase().includes("429")
            ? " Rate limit hit — wait 1 min and retry."
            : message.toLowerCase().includes("json") || message.toLowerCase().includes("parse")
                ? " LLM returned invalid JSON — retry."
                : "";
        return NextResponse.json({ error: message + hint }, { status: 500 });
    }
}
