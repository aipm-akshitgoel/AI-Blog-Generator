import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { AzureOpenAI } from "openai";

export const runtime = "nodejs";

type FaqRow = {
  id?: unknown;
  category?: string;
  question?: string;
  answer?: string;
  priority?: unknown;
  active?: boolean;
  // When rows are generated suggestions in the UI, they use `isSuggestion`.
  isSuggestion?: boolean;
};

type PageInput = {
  id: number;
  title?: string;
  faqs?: FaqRow[];
};

type GenerateRequestBody = {
  pages: PageInput[];
  businessPrompt: string;
  targetCategory?: string | null;
};

function extractJsonArray(text: string): unknown[] {
  if (!text) return [];
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return [];
  const slice = text.substring(start, end + 1);
  try {
    const parsed = JSON.parse(slice);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as GenerateRequestBody | null;
  if (!body || !Array.isArray(body.pages)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT?.trim();
  const azureApiKey = process.env.AZURE_OPENAI_API_KEY?.trim();
  const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT?.trim();
  const azureApiVersion = process.env.AZURE_OPENAI_API_VERSION?.trim() || "2024-12-01-preview";

  if (!azureEndpoint || !azureApiKey || !azureDeployment) {
    return NextResponse.json(
      {
        error: "Azure OpenAI is not configured on the server",
        debug: {
          hasAzureEndpoint: Boolean(azureEndpoint),
          hasAzureApiKey: Boolean(azureApiKey),
          hasAzureDeployment: Boolean(azureDeployment),
          azureApiVersion,
        },
      },
      { status: 500 },
    );
  }

  const client = new AzureOpenAI({
    endpoint: azureEndpoint,
    apiKey: azureApiKey,
    apiVersion: azureApiVersion,
  });
  const timeoutMs = 20_000;
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), timeoutMs);

  try {
    const { pages, businessPrompt, targetCategory = null } = body;

    const suggestionsByPage = await Promise.all(
      pages.map(async (page) => {
        const activeFaqs = Array.isArray(page.faqs) ? page.faqs : [];
        const existingCats = Array.from(
          new Set(
            activeFaqs
              .filter((f) => !f?.isSuggestion)
              .map((f) => String(f.category || "General")),
          ),
        );

        const targetStr = targetCategory
          ? `specifically for the "${targetCategory}" category`
          : `spread across these existing categories: ${existingCats.join(", ")}. Generate a total of ${
              existingCats.length * 2
            } suggestions.`;

        const prompt = `
You are an expert FAQ generator for a university website.

Page Title: ${page.title || ""}
Context: ${businessPrompt}
Existing Categories for this page: ${existingCats.join(", ")}

Generate FAQ suggestions ${targetStr}.
For each FAQ, the "category" field MUST match one of the "Existing Categories" listed exactly.
If a question does not fit any existing category, set category to "AI Recommended".

Return ONLY a valid JSON array of FAQ objects.
Each object must have:
- category: string
- question: string
- answer: string
- priority: number

Do not wrap the array in markdown or add any extra keys outside the array.
        `.trim();

        let parsed: { choices?: Array<{ message?: { content?: string } }> } | null = null;
        try {
          // SDK call (Azure uses deployment name as `model`)
          const resp = await client.chat.completions.create(
            {
              model: azureDeployment,
              max_completion_tokens: 2500,
              messages: [
                {
                  role: "system",
                  content: "Return ONLY JSON arrays, no markdown, no commentary.",
                },
                { role: "user", content: prompt },
              ],
            },
            { signal: abortController.signal },
          );

          parsed = resp as any;
        } catch (err) {
          const status =
            typeof (err as any)?.status === "number"
              ? (err as any).status
              : typeof (err as any)?.code === "number"
                ? (err as any).code
                : null;
          return {
            pageId: page.id,
            suggestions: [],
            error: status ? `ai ${status} via azure` : "ai error via azure",
          };
        }

        const content = parsed?.choices?.[0]?.message?.content || "";
        const rawSuggestions = extractJsonArray(content) as Array<any>;

        const suggestions = rawSuggestions.map((s) => {
          const cat = String(s?.category || "");
          const matchedCat = existingCats.find(
            (c) => c.toLowerCase().trim() === cat.toLowerCase().trim(),
          );

          return {
            category: matchedCat || "AI Recommended",
            question: String(s?.question || ""),
            answer: String(s?.answer || ""),
            priority: Number(s?.priority ?? 0),
            active: true,
            isSuggestion: true,
            id: s?.id ?? `sug-${randomUUID()}`,
          };
        });

        return { pageId: page.id, suggestions };
      }),
    );

    return NextResponse.json({ suggestionsByPage });
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return NextResponse.json(
      { error: aborted ? "AI generation timed out" : "AI generation failed" },
      { status: aborted ? 504 : 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}

