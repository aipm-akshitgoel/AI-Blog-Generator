import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

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
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not set" },
      { status: 500 }
    );
  }

  try {
    const { businessContext, customPrompt, platform = "blog" } = await req.json();

    if (!businessContext) {
      return NextResponse.json(
        { error: "Missing businessContext payload" },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_PROMPT.replace("IF PLATFORM", `CURRENT PLATFORM: ${platform.toUpperCase()}`),
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    let userPrompt = `Here is the verified BusinessContext:\n\n${JSON.stringify(businessContext, null, 2)}`;

    if (platform === "linkedin") {
      userPrompt += "\n\nCRITICAL LINKEDIN INSTRUCTIONS: Research trending LinkedIn topics for this industry. Find mocked high-performing posts for inspiration. Ensure topicOptions are 'hooks' and 'stories', not just articles.";
    }

    if (customPrompt && typeof customPrompt === "string" && customPrompt.trim().length > 0) {
      userPrompt += `\n\nUSER DIRECTIVE: "${customPrompt.trim()}". Prioritize this.`;
    }

    const result = await model.generateContent(userPrompt);
    const text = result.response.text().trim();
    const cleanText = text.replace(/^```[a-z]*\n/i, '').replace(/\n```$/i, '').trim();
    const strategyData = JSON.parse(cleanText);

    return NextResponse.json({ data: strategyData });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Strategy generation failed";
    console.error("Strategy Agent Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
