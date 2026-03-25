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
  slug?: string;
  liveUrl?: string;
  faqs?: FaqRow[];
};

type GenerateRequestBody = {
  pages: PageInput[];
  businessPrompt: string;
  targetCategory?: string | null;
};

type ExtractedProgrammeData = {
  programPageH1?: string;
  programmeCategory?: string;
  programmeDuration?: string;
  learningMode?: string;
  eligibilityCriteria?: string;
  feeStructure?: string;
  certificationType?: string;
  admissionSteps?: string[];
  curriculum?: Array<{ moduleName: string; topics?: string[] }>;
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

function extractJsonObject(text: string): Record<string, unknown> | null {
  if (!text) return null;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  const slice = text.substring(start, end + 1);
  try {
    const parsed = JSON.parse(slice);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as any;
    return null;
  } catch {
    return null;
  }
}

function stripHtmlToText(html: string): string {
  let cleaned = html || "";
  cleaned = cleaned.replace(/<head[^>]*>([\s\S]*?)<\/head>/gi, "");
  cleaned = cleaned.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, "");
  cleaned = cleaned.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, "");
  cleaned = cleaned.replace(/<svg[^>]*>([\s\S]*?)<\/svg>/gi, "");
  cleaned = cleaned.replace(/<!--([\s\S]*?)-->/gi, "");
  const text = cleaned
    .replace(/<\/(div|p|h1|h2|h3|h4|h5|h6|li|tr|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 75_000 ? text.slice(0, 75_000) : text;
}

function renderAdmissionSteps(steps?: string[]): string {
  const list = Array.isArray(steps) ? steps.filter((s) => String(s || "").trim().length > 0) : [];
  if (list.length === 0) return "{{Refer to Official Programme Page}}";
  return list.map((s, i) => `${i + 1}. ${String(s).trim()}`).join("\n");
}

function renderCurriculumBlock(curriculum?: ExtractedProgrammeData["curriculum"]): string {
  const mods = Array.isArray(curriculum) ? curriculum : [];
  if (mods.length === 0) return "{{Refer to Official Programme Page for Curriculum Structure}}";
  return mods
    .map((m) => {
      const name = String(m?.moduleName || "").trim();
      const topics = Array.isArray(m?.topics) ? m!.topics!.filter(Boolean) : [];
      const topicLines = topics.map((t) => `- ${String(t).trim()}`).join("\n");
      return [name || "(Module)", topicLines].filter(Boolean).join("\n");
    })
    .join("\n\n---------------------------------------------------------------------\n\n");
}

function buildPlaceholderMap(opts: {
  programWebsiteUrl: string;
  extracted: ExtractedProgrammeData;
}): Record<string, string> {
  const { programWebsiteUrl, extracted } = opts;
  const map: Record<string, string> = {
    "program website URL": programWebsiteUrl,
    "Programme Page URL": programWebsiteUrl,
    "Official Programme Page URL": programWebsiteUrl,
    "Program page H1": extracted.programPageH1 || "",
    "Programme Page H1": extracted.programPageH1 || "",
    "Programme Page Name": extracted.programPageH1 || "",
    "Paste exact text from official page": "",
    "Programme Category": extracted.programmeCategory || "{{Refer to Official Programme Page}}",
    "Programme Duration": extracted.programmeDuration || "{{Refer to Official Programme Page}}",
    "Learning Mode": extracted.learningMode || "{{Refer to Official Programme Page}}",
    "Eligibility Criteria": extracted.eligibilityCriteria || "{{Refer to Official Programme Page}}",
    "Fee Structure": extracted.feeStructure || "{{Refer to Official Programme Page}}",
    "Certification Type": extracted.certificationType || "{{Refer to Official Programme Page}}",
    "Admission Process / Application Steps": renderAdmissionSteps(extracted.admissionSteps),
    CURRICULUM_BLOCK: renderCurriculumBlock(extracted.curriculum),
  };

  // Also generate Module_1_Name / Topic_1 style placeholders for compatibility.
  const curriculum = Array.isArray(extracted.curriculum) ? extracted.curriculum : [];
  curriculum.forEach((m, idx) => {
    const i = idx + 1;
    map[`Module_${i}_Name`] = String(m?.moduleName || "").trim();
    const topics = Array.isArray(m?.topics) ? m!.topics! : [];
    topics.forEach((t, tIdx) => {
      map[`Module_${i}_Topic_${tIdx + 1}`] = String(t || "").trim();
    });
  });

  return map;
}

function fillMustacheTemplate(template: string, values: Record<string, string>): string {
  const src = String(template || "");
  return src.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (full, keyRaw) => {
    const key = String(keyRaw || "").trim();
    if (key in values) return values[key];
    return full; // leave unknown placeholders intact (caller can decide)
  });
}

async function extractProgrammeData(args: {
  client: AzureOpenAI;
  azureDeployment: string;
  pageUrl: string;
  pageText: string;
  signal: AbortSignal;
}): Promise<ExtractedProgrammeData> {
  const { client, azureDeployment, pageUrl, pageText, signal } = args;

  const system = `You are an expert data extractor for IIT Kharagpur Online programme pages.
Return ONLY valid JSON (no markdown, no commentary).`;

  const user = `Official Programme Page URL: ${pageUrl}

Here is the scraped text content from the programme page:
${pageText}

Extract and return strict JSON with this schema:
{
  "programPageH1": string,
  "programmeCategory": string,
  "programmeDuration": string,
  "learningMode": string,
  "eligibilityCriteria": string,
  "feeStructure": string,
  "certificationType": string,
  "admissionSteps": string[],
  "curriculum": [{ "moduleName": string, "topics": string[] }]
}

Rules:
- Copy fee numbers and labels exactly as seen (Total Fee, EMI, seat booking amount, etc.).
- Admission steps must be a numbered flow if present (return as array items).
- Curriculum must preserve module names exactly; do not merge/reorder.
- If any field is genuinely missing, return an empty string (or empty array).`;

  const resp = await client.chat.completions.create(
    {
      model: azureDeployment,
      max_completion_tokens: 3500,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    },
    { signal },
  );

  const content = (resp as any)?.choices?.[0]?.message?.content || "";
  const obj = extractJsonObject(content);
  if (!obj) return {};

  const asArr = (v: unknown) => (Array.isArray(v) ? v : []);
  const extracted: ExtractedProgrammeData = {
    programPageH1: typeof obj.programPageH1 === "string" ? obj.programPageH1 : undefined,
    programmeCategory: typeof obj.programmeCategory === "string" ? obj.programmeCategory : undefined,
    programmeDuration: typeof obj.programmeDuration === "string" ? obj.programmeDuration : undefined,
    learningMode: typeof obj.learningMode === "string" ? obj.learningMode : undefined,
    eligibilityCriteria:
      typeof obj.eligibilityCriteria === "string" ? obj.eligibilityCriteria : undefined,
    feeStructure: typeof obj.feeStructure === "string" ? obj.feeStructure : undefined,
    certificationType: typeof obj.certificationType === "string" ? obj.certificationType : undefined,
    admissionSteps: asArr(obj.admissionSteps).map((s) => String(s)),
    curriculum: asArr(obj.curriculum).map((m) => ({
      moduleName: String((m as any)?.moduleName || ""),
      topics: asArr((m as any)?.topics).map((t) => String(t)),
    })),
  };

  return extracted;
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

        const programWebsiteUrl = String(page?.liveUrl || "").trim();
        if (!programWebsiteUrl.startsWith("http")) {
          return {
            pageId: page.id,
            suggestions: [],
            error: "Missing/invalid page.liveUrl (programme URL)",
          };
        }

        // 1) Fetch programme page and extract structured data.
        let extracted: ExtractedProgrammeData = {};
        try {
          const res = await fetch(programWebsiteUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; BloggieBot/1.0; +http://bloggieai.com)",
            },
            signal: abortController.signal,
          });
          const html = await res.text();
          const pageText = stripHtmlToText(html);
          extracted = await extractProgrammeData({
            client,
            azureDeployment,
            pageUrl: programWebsiteUrl,
            pageText,
            signal: abortController.signal,
          });
        } catch {
          extracted = {};
        }

        // 2) Fill placeholders in the user's business direction prompt.
        const placeholderMap = buildPlaceholderMap({
          programWebsiteUrl,
          extracted,
        });

        const basePrompt = (businessPrompt || "").trim();
        const filledBusinessPrompt =
          basePrompt.length > 0 ? fillMustacheTemplate(basePrompt, placeholderMap) : "";

        const categoryInstruction = targetCategory
          ? `\n\nGenerate FAQs specifically for the "${targetCategory}" category when relevant.\n`
          : "";

        const prompt =
          filledBusinessPrompt ||
          `
You are an expert FAQ generator for a university website.

Page Title: ${page.title || ""}
Official Programme Page URL: ${programWebsiteUrl}
Existing Categories for this page: ${existingCats.join(", ")}
${categoryInstruction}

Return ONLY a valid JSON array of FAQ objects with:
- category
- question
- answer
- priority
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

