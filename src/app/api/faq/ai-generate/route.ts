import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

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

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const hasAzureEndpoint = Boolean(process.env.AZURE_OPENAI_ENDPOINT);
    const hasAzureDeployment = Boolean(process.env.AZURE_OPENAI_DEPLOYMENT);
    const hasAzureApiVersion = Boolean(process.env.AZURE_OPENAI_API_VERSION);
    return NextResponse.json(
      {
        error: "OPENAI_API_KEY is not configured on the server",
        debug: {
          hasOpenaiKey: Boolean(process.env.OPENAI_API_KEY),
          hasAzureEndpoint,
          hasAzureDeployment,
          hasAzureApiVersion,
        },
      },
      { status: 500 },
    );
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT?.trim();
  const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT?.trim();
  const azureApiVersion = process.env.AZURE_OPENAI_API_VERSION?.trim() || "2024-12-01-preview";
  const useAzure = Boolean(azureEndpoint && azureDeployment);
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

        const url = useAzure
          ? `${azureEndpoint!.replace(/\/+$/, "")}/openai/deployments/${azureDeployment}/chat/completions?api-version=${azureApiVersion}`
          : "https://api.openai.com/v1/chat/completions";

        const resp = await fetch(url, {
          method: "POST",
          headers: useAzure
            ? {
                "content-type": "application/json",
                "api-key": apiKey,
              }
            : {
                "content-type": "application/json",
                authorization: `Bearer ${apiKey}`,
              },
          signal: abortController.signal,
          body: JSON.stringify({
            ...(useAzure ? {} : { model }),
            temperature: 0.7,
            max_tokens: 2500,
            messages: [
              {
                role: "system",
                content: "Return ONLY JSON arrays, no markdown, no commentary.",
              },
              { role: "user", content: prompt },
            ],
          }),
        });

        const respText = await resp.text();
        if (!resp.ok) {
          return { pageId: page.id, suggestions: [], error: `ai ${resp.status}` };
        }

        let parsed: { choices?: Array<{ message?: { content?: string } }> } | null = null;
        try {
          parsed = JSON.parse(respText);
        } catch {
          parsed = null;
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

