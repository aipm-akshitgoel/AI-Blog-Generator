import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { sanitizeJsonString } from "@/lib/sanitizeJson";
import { canGenerateStrategy, mergeContextWithReference, normalizeDomain } from "@/lib/strategyInputs";
import { extractRouteError } from "@/lib/formatApiError";
import { assistantMessageText, azureConfigDebug, createAzureClient, getAzureConfig, stripOuterMarkdownFence } from "@/lib/azureOpenAI";

const SYSTEM_PROMPT = `
You are an elite Content Strategist. 
Depending on the PLATFORM requested, you will act as either an SEO Orchestrator (for Blog) or a Viral Ghostwriter (for LinkedIn).

IF PLATFORM = BLOG:
- Act as an SEO expert for the beauty/wellness/local business sector.
- Analyze Google Ads Keyword data and local SERPs.
- Output: keywordStrategy and topicOptions.

IF PLATFORM = LINKEDIN:
- Act as a LinkedIn Growth Strategist.
- Analyze trending industry topics and high-engagement content patterns on LinkedIn.
- Focus on thought-leadership, industry insights, and viral story-based topics.
- Output: keywordStrategy(use for pillar themes), topicOptions(the specific posts), trendingTopics, and inspiration.

REQUIRED OUTPUT FORMAT (JSON ONLY):
{
  "keywordStrategy": {
    "primaryKeyword": "...",
    "secondaryKeywords": ["...", "..."],
    "searchIntent": "commercial"
  },
  "topicOptions": [
    {
      "title": "Topic Title",
      "description": "Topic Description",
      "cannibalizationRisk": false
    }
  ],
  "trendingTopics": ["Trending Topic 1", "Trending Topic 2"],
  "inspiration": [
    {
      "title": "High performing post title/hook",
      "url": "https://linkedin.com/feed/...",
      "engagement": "1,200+ Likes, 50+ Comments",
      "insights": "Explains why this post performed well (e.g., strong hook, contrarian take)"
    }
  ]
}
`;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const azure = getAzureConfig();
  if (!azure) {
    return NextResponse.json(
      { error: "Azure OpenAI is not configured on the server", debug: azureConfigDebug() },
      { status: 500 }
    );
  }

  try {
    const { businessContext, referenceDomain, customPrompt, platform = "blog" } = await req.json();

    const refDomain = normalizeDomain(
      typeof referenceDomain === "string" ? referenceDomain : businessContext?.domain || "",
    );

    if (!canGenerateStrategy(businessContext, refDomain)) {
      return NextResponse.json(
        {
          error:
            "Provide a business profile or reference website domain (e.g. yourdegree.com) before generating strategy.",
        },
        { status: 400 },
      );
    }

    const ctxForStrategy = mergeContextWithReference(businessContext, refDomain);

    const client = createAzureClient(azure);

    let userPrompt = `Here is the verified BusinessContext:\n\n${JSON.stringify(ctxForStrategy, null, 2)}`;
    if (refDomain) {
      userPrompt += `\n\nReference domain for research: https://${refDomain}`;
    }

    if (platform === "linkedin") {
      userPrompt += "\n\nCRITICAL LINKEDIN INSTRUCTIONS: Research trending LinkedIn topics for this industry. Find mocked high-performing posts for inspiration. Ensure topicOptions are 'hooks' and 'stories', not just articles.";
    }

    if (customPrompt && typeof customPrompt === "string" && customPrompt.trim().length > 0) {
      userPrompt += `\n\nUSER DIRECTIVE: "${customPrompt.trim()}". Prioritize this.`;
    }

    const response = await client.chat.completions.create({
      model: azure.deployment,
      max_completion_tokens: 2000,
      messages: [
        { role: "system", content: SYSTEM_PROMPT.replace("IF PLATFORM", `CURRENT PLATFORM: ${platform.toUpperCase()}`) },
        { role: "user", content: userPrompt },
      ],
    });

    const text = assistantMessageText((response as any)?.choices?.[0]?.message?.content);
    const cleanText = sanitizeJsonString(stripOuterMarkdownFence(text));
    const strategyData = JSON.parse(cleanText);

    return NextResponse.json({ data: strategyData });
  } catch (err) {
    const message = extractRouteError(err, "Strategy generation failed");
    console.error("Strategy Agent Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
