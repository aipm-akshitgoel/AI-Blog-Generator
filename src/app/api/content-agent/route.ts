import { NextResponse } from "next/server";
import { type BusinessContext } from "@/lib/types/businessContext";
import { type TopicOption } from "@/lib/types/strategy";
import { type BlogPost } from "@/lib/types/content";
import { sanitizeJsonString } from "@/lib/sanitizeJson";
import { assistantMessageText, azureConfigDebug, createAzureClient, getAzureConfig, stripOuterMarkdownFence } from "@/lib/azureOpenAI";

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

function extractFirstJsonObject(input: string): string | null {
    const text = String(input || "");
    let start = -1;
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];

        if (inString) {
            if (escaped) {
                escaped = false;
            } else if (ch === "\\") {
                escaped = true;
            } else if (ch === "\"") {
                inString = false;
            }
            continue;
        }

        if (ch === "\"") {
            inString = true;
            continue;
        }

        if (ch === "{") {
            if (depth === 0) start = i;
            depth++;
            continue;
        }

        if (ch === "}") {
            if (depth > 0) {
                depth--;
                if (depth === 0 && start >= 0) {
                    return text.slice(start, i + 1);
                }
            }
        }
    }

    return null;
}

export async function POST(req: Request) {
    const azure = getAzureConfig();
    if (!azure) {
        return NextResponse.json(
            { error: "Azure OpenAI is not configured on the server", debug: azureConfigDebug() },
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

        const client = createAzureClient(azure);

        const userPrompt = `Generate the blog post JSON for the following:\n\n### Business Context\n${JSON.stringify(businessContext, null, 2)}\n\n### Approved Topic\n${JSON.stringify(topic, null, 2)}`;

        const response = await client.chat.completions.create({
            model: azure.deployment,
            max_completion_tokens: 5000,
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: userPrompt },
            ],
        });
        const text = assistantMessageText((response as any)?.choices?.[0]?.message?.content);
        const deFenced = stripOuterMarkdownFence(text);

        let parsed: Partial<BlogPost> | null = null;
        const directCandidates = [deFenced, sanitizeJsonString(deFenced)];
        for (const candidate of directCandidates) {
            try {
                parsed = JSON.parse(candidate) as Partial<BlogPost>;
                break;
            } catch { }
        }

        if (!parsed) {
            const extractedObject = extractFirstJsonObject(deFenced);
            if (extractedObject) {
                const extractedCandidates = [extractedObject, sanitizeJsonString(extractedObject)];
                for (const candidate of extractedCandidates) {
                    try {
                        parsed = JSON.parse(candidate) as Partial<BlogPost>;
                        break;
                    } catch { }
                }
            }
        }

        if (!parsed) {
            throw new Error("Model returned invalid JSON format");
        }

        const postData: BlogPost = {
            title: String(parsed.title || topic.title || "Untitled Post"),
            slug: String(parsed.slug || topic.title || "untitled-post")
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9\s-]/g, "")
                .replace(/\s+/g, "-")
                .replace(/-+/g, "-")
                .replace(/^-|-$/g, ""),
            metaDescription: String(parsed.metaDescription || ""),
            contentMarkdown: String(parsed.contentMarkdown || ""),
            faqs: Array.isArray(parsed.faqs) ? parsed.faqs : [],
            status: parsed.status === "published" ? "published" : "draft",
        };

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
