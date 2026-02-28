import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

const SYSTEM_PROMPT = `
You are an expert SEO orchestrator and keyword strategist for the beauty and wellness industry (salons, spas, barbershops).
You are equipped with "mocked" MCP tools to analyze Google Ads Keyword Planner data and Google SERP data. 

The user will provide you with a canonical "BusinessContext" JSON object containing their business name, type, location, services, target audience, and positioning.

Your job is to generate a highly optimized SEO content strategy containing:
1. A primary keyword with high purchase intent in their local area.
2. 3-5 secondary keywords that support the primary keyword without cannibalizing it.
3. The overall search intent (informational, navigational, commercial, or transactional).
4. 3-5 specific Topic Options for blog posts that will rank for these keywords. 
5. For each topic, indicate if there is a "cannibalizationRisk" (true/false). If true, provide a brief "cannibalizationReason" comparing it to existing or related topics.

CRITICAL INSTRUCTIONS:
- You must ONLY output a valid JSON object matching the schema below.
- Do NOT output any markdown blocks (like \`\`\`json).
- Do NOT output any conversational text.
- JUST JSON.

{
  "keywordStrategy": {
    "primaryKeyword": "...",
    "secondaryKeywords": ["...", "..."],
    "searchIntent": "commercial"
  },
  "topicOptions": [
    {
      "title": "...",
      "description": "...",
      "cannibalizationRisk": false
    },
    {
      "title": "...",
      "description": "...",
      "cannibalizationRisk": true,
      "cannibalizationReason": "..."
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
    const { businessContext, customPrompt, platform } = await req.json();

    if (!businessContext) {
      return NextResponse.json(
        { error: "Missing businessContext payload" },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_PROMPT + (platform === "linkedin" ? "\n\nPLATFORM FOCUS: LinkedIn. Focus on thought-leadership, industry insights, and viral story-based topics rather than just SEO keywords." : ""),
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    let userPrompt = `Here is the verified BusinessContext:\n\n${JSON.stringify(businessContext, null, 2)}`;
    if (customPrompt && typeof customPrompt === "string" && customPrompt.trim().length > 0) {
      userPrompt += `\n\nCRITICAL DIRECTIVE FROM USER FOR TOPICS: "${customPrompt.trim()}". You MUST prioritize topics and keywords that align with this specific request.`;
    }
    if (platform === "linkedin") {
      userPrompt += `\n\nADDITIONAL INSTRUCTION: Since this is for LinkedIn, prioritize topics that spark conversation, challenge status quo, or share personal 'aha' moments related to the business.`;
    }

    // In a full architecture, this step would invoke the MCP client to hit a separate Python server
    // running the Google Ads/SERP tools. Since we don't have that server, we are simulating the MCP output
    // via Gemini's world knowledge.
    const result = await model.generateContent(userPrompt);
    const text = result.response.text().trim();

    // Clean any potential markdown wrapper the LLM might stubbornly include
    const cleanText = text.replace(/^```[a-z]*\n/i, '').replace(/\n```$/i, '').trim();

    // Parse the JSON strategy
    const strategyData = JSON.parse(cleanText);

    return NextResponse.json({ data: strategyData });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Strategy generation failed";
    console.error("Strategy Agent Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
