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

/** Chat Completions may return `content` as a string or as `[{ type: 'text', text: '...' }]`. */
function assistantMessageText(content: unknown): string {
  if (content == null) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const parts: string[] = [];
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const p = part as Record<string, unknown>;
      if (p.type === "text" && typeof p.text === "string") parts.push(p.text);
      else if (p.type === "refusal" && typeof p.refusal === "string") parts.push(p.refusal);
      else if (typeof p.text === "string") parts.push(p.text);
    }
    return parts.join("");
  }
  return String(content);
}

function assistantOutputFromChoice(choice: { message?: { content?: unknown; refusal?: string | null } } | undefined): string {
  const msg = choice?.message;
  if (!msg) return "";
  if (typeof msg.refusal === "string" && msg.refusal.trim()) return msg.refusal;
  return assistantMessageText(msg.content);
}

/** Model often wraps JSON in ```json ... ``` — strip so extractors see raw JSON. */
function stripOuterMarkdownFence(s: string): string {
  let t = s.trim();
  if (!t.startsWith("```")) return t;
  t = t.replace(/^```(?:json)?\s*/i, "");
  const end = t.lastIndexOf("```");
  if (end >= 0) t = t.slice(0, end);
  return t.trim();
}

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

function faqArrayFromRecord(obj: Record<string, unknown>): unknown[] {
  const candidates = [
    obj.faqs,
    obj.faq,
    obj.items,
    obj.questions,
    obj.data,
    obj.results,
  ];
  for (const c of candidates) {
    if (Array.isArray(c)) return c;
    if (c && typeof c === "object") {
      const nested = (c as any).faqs || (c as any).items || (c as any).questions;
      if (Array.isArray(nested)) return nested;
    }
  }
  return [];
}

function extractFaqArrayFromAnyJson(text: string): unknown[] {
  const trimmed = text.trim();
  if (trimmed) {
    try {
      const top = JSON.parse(trimmed);
      if (Array.isArray(top)) return top;
      if (top && typeof top === "object" && !Array.isArray(top)) {
        const fromObj = faqArrayFromRecord(top as Record<string, unknown>);
        if (fromObj.length > 0) return fromObj;
      }
    } catch {
      /* fall through — model may add prose around JSON */
    }
  }

  const direct = extractJsonArray(text);
  if (direct.length > 0) return direct;

  const obj = extractJsonObject(text);
  if (!obj) return [];

  return faqArrayFromRecord(obj as Record<string, unknown>);
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

function cleanExtractedValue(v: unknown): string {
  const s = String(v ?? "")
    .replace(/\s+/g, " ")
    .trim();
  return s;
}

function extractDeterministicProgrammeData(pageText: string): Partial<ExtractedProgrammeData> {
  const text = String(pageText || "");
  const compact = text.replace(/\s+/g, " ").trim();

  const h1Match = compact.match(
    /(Executive\s+Post\s+Graduate[^.]{0,140}?(?:Certificate|Programme|Program)[^.]{0,120})/i,
  );

  const durationMatch =
    compact.match(/Duration\s*[:\-]\s*([^|✦•]{2,80})/i) ||
    compact.match(/\b(\d{1,2}\s*(?:Months?|Month|Weeks?|Week|Years?|Year))\b/i);

  const modeMatch =
    compact.match(/(?:Learning\s+Mode|Mode)\s*[:\-]\s*([^|✦•]{2,80})/i) ||
    compact.match(/\b(100%\s*Live\s*Online|Live\s*Online|Online)\b/i);

  const feeTotal = compact.match(/Total\s+Fee\s*[:\-]?\s*(₹\s?[\d,]+(?:\.\d+)?)/i)?.[1];
  const seat = compact.match(/Block\s+Your\s+Seat(?:\s+Now)?(?:\s+At)?\s*[:\-]?\s*(₹\s?[\d,]+)/i)?.[1];
  const emi = compact.match(/EMI\s+per\s+Month\s*[:\-]?\s*(₹\s?[\d,]+)/i)?.[1];
  const feeParts = [
    feeTotal ? `Total Fee: ${feeTotal}` : "",
    seat ? `Seat Booking Amount: ${seat}` : "",
    emi ? `EMI per Month: ${emi}` : "",
  ].filter(Boolean);

  const eligibilityMatch = compact.match(
    /Eligibility\s*[:\-]\s*([\s\S]{20,450}?)(?=\b(?:Our\s+Admission\s+process|Frequently\s+Asked\s+Questions|Develop\s+and|On-?Campus|Apply\s+Now)\b|$)/i,
  );

  const admissionMatch = compact.match(
    /1\s+([^0-9]{5,120}?)\s+2\s+([^0-9]{5,140}?)\s+3\s+([^0-9]{5,120}?)(?=\b(?:Frequently|FAQs|Apply|$))/i,
  );
  const admissionSteps = admissionMatch
    ? [admissionMatch[1], admissionMatch[2], admissionMatch[3]].map((s) => cleanExtractedValue(s))
    : [];

  const certificationMatch = compact.match(
    /(Executive\s+Post\s+Graduate\s+Certificate[^.]{0,140}|Certificate\s+with\s+Distinction)/i,
  );

  return {
    programPageH1: cleanExtractedValue(h1Match?.[1] || ""),
    programmeDuration: cleanExtractedValue(durationMatch?.[1] || ""),
    learningMode: cleanExtractedValue(modeMatch?.[1] || ""),
    eligibilityCriteria: cleanExtractedValue(eligibilityMatch?.[1] || ""),
    feeStructure: cleanExtractedValue(feeParts.join(" | ")),
    certificationType: cleanExtractedValue(certificationMatch?.[1] || ""),
    admissionSteps,
  };
}

function pickNonEmpty(...values: Array<unknown>): string | undefined {
  for (const v of values) {
    const s = cleanExtractedValue(v);
    if (s) return s;
  }
  return undefined;
}

function mergeExtractedProgrammeData(
  llmExtracted: ExtractedProgrammeData,
  deterministic: Partial<ExtractedProgrammeData>,
): ExtractedProgrammeData {
  return {
    programPageH1: pickNonEmpty(llmExtracted.programPageH1, deterministic.programPageH1),
    programmeCategory: pickNonEmpty(llmExtracted.programmeCategory, deterministic.programmeCategory),
    programmeDuration: pickNonEmpty(llmExtracted.programmeDuration, deterministic.programmeDuration),
    learningMode: pickNonEmpty(llmExtracted.learningMode, deterministic.learningMode),
    eligibilityCriteria: pickNonEmpty(llmExtracted.eligibilityCriteria, deterministic.eligibilityCriteria),
    feeStructure: pickNonEmpty(llmExtracted.feeStructure, deterministic.feeStructure),
    certificationType: pickNonEmpty(llmExtracted.certificationType, deterministic.certificationType),
    admissionSteps:
      (Array.isArray(llmExtracted.admissionSteps) && llmExtracted.admissionSteps.length > 0
        ? llmExtracted.admissionSteps
        : deterministic.admissionSteps) || [],
    curriculum: llmExtracted.curriculum || [],
  };
}

function renderExtractedFacts(extracted: ExtractedProgrammeData): string {
  const admission = renderAdmissionSteps(extracted.admissionSteps);
  const facts = [
    `Programme Page H1: ${extracted.programPageH1 || ""}`,
    `Programme Duration: ${extracted.programmeDuration || ""}`,
    `Learning Mode: ${extracted.learningMode || ""}`,
    `Eligibility Criteria: ${extracted.eligibilityCriteria || ""}`,
    `Fee Structure: ${extracted.feeStructure || ""}`,
    `Certification Type: ${extracted.certificationType || ""}`,
    `Admission Steps:\n${admission}`,
  ];
  return facts.join("\n");
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
    // Strict replacement rules requested by user:
    // - Replace only page URL and page H1 placeholders.
    // - Keep module/topic placeholders untouched for per-page prompt execution.
    // - Keep {{Refer to Official Page}} untouched; handled as an output flag downstream.
    "page url": programWebsiteUrl,
    "page URL": programWebsiteUrl,
    "page Url": programWebsiteUrl,
    "page H1": extracted.programPageH1 || "",
  };

  return map;
}

function fillMustacheTemplate(template: string, values: Record<string, string>): string {
  const src = String(template || "");
  // Be tolerant to common token typos like "{{page URL})" from user-authored prompts.
  const normalized = src.replace(/\{\{\s*([^}]+?)\s*\)\}/g, "{{$1}}");
  const valuesLower: Record<string, string> = {};
  for (const [k, v] of Object.entries(values)) valuesLower[k.toLowerCase()] = v;

  return normalized.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (full, keyRaw) => {
    const key = String(keyRaw || "").trim();
    if (key in values) return values[key];
    const lower = key.toLowerCase();
    if (lower in valuesLower) return valuesLower[lower];
    return full; // leave unknown placeholders intact (caller can decide)
  });
}

function hasReferToOfficialFlag(value: unknown): boolean {
  const text = String(value ?? "");
  return (
    text.includes("{{Refer to Official Page}}") ||
    text.includes("{{Refer to Official Programme Page}}")
  );
}

function normalizeCategoryKey(input: unknown): string {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ");
}

function resolveCategoryName(
  rawCategory: unknown,
  existingCats: string[],
  suggestedCatOrder: string[],
): string {
  const raw = String(rawCategory || "").trim();
  const rawKey = normalizeCategoryKey(raw);

  // 1) Prefer exact/normalized matches to existing categories.
  if (rawKey) {
    const exact = existingCats.find((c) => normalizeCategoryKey(c) === rawKey);
    if (exact) return exact;

    // 2) Allow strong partial matches (common in LLM outputs with minor suffix/prefix changes).
    const partial = existingCats.find((c) => {
      const k = normalizeCategoryKey(c);
      return k && (k.includes(rawKey) || rawKey.includes(k));
    });
    if (partial) return partial;
  }

  // 3) Keep sensible new category from model (not forced to "AI Recommended").
  const fallback = raw || "General";
  if (
    !suggestedCatOrder.some((c) => normalizeCategoryKey(c) === normalizeCategoryKey(fallback))
  ) {
    suggestedCatOrder.push(fallback);
  }

  // 4) Limit number of new suggested categories to max 10 per page.
  if (suggestedCatOrder.length <= 10) return fallback;
  return suggestedCatOrder[9];
}

function trimToSystemRole(prompt: string): string {
  const src = String(prompt || "");
  // If user prompt contains extra text before the canonical header, drop it.
  const idx = src.search(/SYSTEM ROLE\b/i);
  if (idx <= 0) return src.trim();
  return src.slice(idx).trim();
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

  const raw = assistantOutputFromChoice((resp as any)?.choices?.[0]);
  const content = stripOuterMarkdownFence(raw);
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
  // Multi-page runs do: fetch HTML + extract JSON + generate FAQs per page.
  // Keep a generous server timeout and limit concurrency to avoid Azure rate limits.
  const REQUEST_TIMEOUT_MS = 180_000;
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), REQUEST_TIMEOUT_MS);

  try {
    const { pages, businessPrompt, targetCategory = null } = body;

    const CONCURRENCY = 2;
    const results: Array<any> = new Array(pages.length);
    let nextIdx = 0;

    const worker = async () => {
      while (nextIdx < pages.length) {
        const i = nextIdx++;
        const page = pages[i];
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
          results[i] = {
            pageId: page.id,
            suggestions: [],
            error: "Missing/invalid page.liveUrl (programme URL)",
          };
          continue;
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
          const llmExtracted = await extractProgrammeData({
            client,
            azureDeployment,
            pageUrl: programWebsiteUrl,
            pageText,
            signal: abortController.signal,
          });
          const deterministicExtracted = extractDeterministicProgrammeData(pageText);
          extracted = mergeExtractedProgrammeData(llmExtracted, deterministicExtracted);
        } catch {
          extracted = {};
        }

        // 2) Fill placeholders in the user's business direction prompt.
        const placeholderMap = buildPlaceholderMap({
          programWebsiteUrl,
          extracted,
        });

        const rawBusinessPrompt = (businessPrompt || "").trim();
        const filledBusinessPrompt =
          rawBusinessPrompt.length > 0
            ? fillMustacheTemplate(rawBusinessPrompt, placeholderMap)
            : "";
        const normalizedBusinessPrompt = trimToSystemRole(filledBusinessPrompt);

        const categoryInstruction = targetCategory
          ? `\n\nGenerate FAQs specifically for the "${targetCategory}" category when relevant.\n`
          : "";

        const basePrompt =
          normalizedBusinessPrompt ||
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

        const jsonOutputGuard = `

CRITICAL OUTPUT RULE (MANDATORY):
- Return ONLY a valid JSON array (no markdown, no prose, no headings).
- Each element must be:
  {
    "category": "string",
    "question": "string",
    "answer": "string",
    "priority": number
  }
- Keep answers concise (about 50-70 words) and factual.
- If a FAQ fits an existing page category, use that exact category name.
- If it does not fit any existing category, suggest a meaningful category label (do NOT use "AI Recommended" as a default catch-all).
- You may propose multiple categories when needed, but keep total distinct new categories <= 10.
`.trim();

        const extractedFactsBlock = renderExtractedFacts(extracted);
        const prompt = `${basePrompt}

EXTRACTED FACTS FROM OFFICIAL PAGE (USE THESE VALUES WHEN PRESENT):
${extractedFactsBlock}

DATA USAGE MANDATORY:
- If any of the above extracted fields are non-empty, you MUST use them in answers.
- Do NOT output {{Refer to Official Page}} or {{Refer to Official Programme Page}} for those non-empty fields.
- Use those placeholders only when the corresponding extracted field is genuinely empty.

${jsonOutputGuard}`;

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
          results[i] = {
            pageId: page.id,
            suggestions: [],
            error: status ? `ai ${status} via azure` : "ai error via azure",
          };
          continue;
        }

        const rawOut = assistantOutputFromChoice(parsed?.choices?.[0]);
        const content = stripOuterMarkdownFence(rawOut);
        const rawSuggestions = extractFaqArrayFromAnyJson(content) as Array<any>;

        const suggestedCatOrder: string[] = [];
        const suggestions = rawSuggestions.map((s) => {
          const category = resolveCategoryName(s?.category, existingCats, suggestedCatOrder);

          const needsOfficialReferenceFlag =
            hasReferToOfficialFlag(s?.question) ||
            hasReferToOfficialFlag(s?.answer) ||
            hasReferToOfficialFlag(s?.category);

          return {
            category,
            question: String(s?.question || ""),
            answer: String(s?.answer || ""),
            priority: Number(s?.priority ?? 0),
            active: true,
            isSuggestion: true,
            id: s?.id ?? `sug-${randomUUID()}`,
            referToOfficialPageFlag: needsOfficialReferenceFlag,
            flags: needsOfficialReferenceFlag ? ["FLAG_REFER_TO_OFFICIAL_PAGE"] : [],
          };
        });

        results[i] = { pageId: page.id, suggestions };
      }
    };

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, pages.length) }, () => worker()));
    const suggestionsByPage = results.filter(Boolean);

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

