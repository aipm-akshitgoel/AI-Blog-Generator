import { NextResponse } from "next/server";
import { assistantMessageText, azureConfigDebug, createAzureClient, getAzureConfig, stripOuterMarkdownFence } from "@/lib/azureOpenAI";
import { sanitizeJsonString } from "@/lib/sanitizeJson";

import type { ContentEditMode } from "@/lib/types/contentEdit";

const SYSTEM_PROMPT = `You are an expert blog editor. You receive a full article in Markdown and editing instructions.

RULES:
- Preserve markdown structure (headings, lists, links) unless the user asks to change structure.
- Do NOT use em-dashes (—). Write naturally, not like generic AI.
- Return ONLY valid JSON: { "contentMarkdown": "..." }
- The contentMarkdown must be the COMPLETE updated article (not a diff).
- JSON string escaping: use \\n for newlines inside strings, escape double quotes.
- Do not wrap JSON in markdown code fences.`;

function extractFirstJsonObject(input: string): string | null {
    const text = String(input || "");
    let start = -1;
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inString) {
            if (escaped) escaped = false;
            else if (ch === "\\") escaped = true;
            else if (ch === "\"") inString = false;
            continue;
        }
        if (ch === "\"") { inString = true; continue; }
        if (ch === "{") {
            if (depth === 0) start = i;
            depth++;
            continue;
        }
        if (ch === "}") {
            if (depth > 0) {
                depth--;
                if (depth === 0 && start >= 0) return text.slice(start, i + 1);
            }
        }
    }
    return null;
}

export async function POST(req: Request) {
    const azure = getAzureConfig();
    if (!azure) {
        return NextResponse.json(
            { error: "Azure OpenAI is not configured", debug: azureConfigDebug() },
            { status: 500 },
        );
    }

    try {
        const body = await req.json();
        const contentMarkdown = String(body.contentMarkdown || "");
        const prompt = String(body.prompt || "").trim();
        const mode = (body.mode as ContentEditMode) || "modify";
        const patches: string[] = Array.isArray(body.patches)
            ? body.patches.map((p: unknown) => String(p).trim()).filter(Boolean)
            : [];
        const title = body.title ? String(body.title) : "";

        if (!contentMarkdown) {
            return NextResponse.json({ error: "Missing contentMarkdown" }, { status: 400 });
        }
        if (!prompt) {
            return NextResponse.json({ error: "Enter a prompt describing what to change" }, { status: 400 });
        }

        let taskInstruction = "";
        if (mode === "patch" && patches.length > 0) {
            taskInstruction = `Edit ONLY the following excerpt(s) from the article according to the user's prompt. Keep the rest of the article unchanged except where needed for flow. Excerpts:\n\n${patches.map((p, i) => `--- Excerpt ${i + 1} ---\n${p}`).join("\n\n")}`;
        } else if (mode === "add") {
            taskInstruction = "ADD new content to the article per the user's prompt. Place it where it fits best (e.g. new section, expanded FAQ, intro hook). Do not remove existing content unless the prompt requires it.";
        } else {
            taskInstruction = "Apply the user's prompt across the full article (rewrite, tone, facts, structure) while keeping it publication-ready.";
        }

        const userPrompt = `${taskInstruction}

User prompt:
${prompt}

${title ? `Article title: ${title}\n` : ""}
### Full article (Markdown)
${contentMarkdown}

Return the complete updated article as JSON with key contentMarkdown.`;

        const client = createAzureClient(azure);
        const response = await client.chat.completions.create({
            model: azure.deployment,
            max_completion_tokens: 6000,
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: userPrompt },
            ],
        });

        const text = assistantMessageText((response as { choices?: { message?: { content?: unknown } }[] })?.choices?.[0]?.message?.content);
        const deFenced = stripOuterMarkdownFence(text);

        let parsed: { contentMarkdown?: string } | null = null;
        for (const candidate of [deFenced, sanitizeJsonString(deFenced)]) {
            try {
                parsed = JSON.parse(candidate) as { contentMarkdown?: string };
                break;
            } catch { /* try next */ }
        }

        if (!parsed?.contentMarkdown) {
            const extracted = extractFirstJsonObject(deFenced);
            if (extracted) {
                for (const candidate of [extracted, sanitizeJsonString(extracted)]) {
                    try {
                        parsed = JSON.parse(candidate) as { contentMarkdown?: string };
                        break;
                    } catch { /* try next */ }
                }
            }
        }

        if (!parsed?.contentMarkdown) {
            throw new Error("Model returned invalid JSON");
        }

        let updated = String(parsed.contentMarkdown);
        updated = updated.replace(/\\n/g, "\n");

        return NextResponse.json({ contentMarkdown: updated });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Content edit failed";
        console.error("Content edit agent error:", err);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
