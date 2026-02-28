import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

export async function POST(req: Request) {
    if (!apiKey) {
        return NextResponse.json({ error: "GEMINI_API_KEY is not set" }, { status: 500 });
    }

    try {
        const { url } = await req.json();
        if (!url || !url.startsWith("http")) {
            return NextResponse.json({ error: "A valid URL (http/https) is required." }, { status: 400 });
        }

        // 1. Fetch website HTML
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; BloggieBot/1.0; +http://bloggieai.com)",
            },
        });

        if (!response.ok) {
            return NextResponse.json({ error: `Failed to fetch URL. Status: ${response.status}` }, { status: 400 });
        }

        let html = await response.text();

        // 2. Naive cleanup to save tokens (remove head, scripts, styles, svgs)
        html = html.replace(/<head[^>]*>([\s\S]*?)<\/head>/gi, "");
        html = html.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, "");
        html = html.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, "");
        html = html.replace(/<svg[^>]*>([\s\S]*?)<\/svg>/gi, "");
        html = html.replace(/<!--([\s\S]*?)-->/gi, "");

        // Strip HTML tags entirely to just get raw text, replacing common block tags with spaces/newlines
        let text = html
            .replace(/<\/(div|p|h1|h2|h3|h4|h5|h6|li|tr)>/gi, "\n")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        // Truncate to roughly 15-20k tokens worth of characters just in case it's a massive site
        if (text.length > 75000) {
            text = text.slice(0, 75000);
        }

        // 3. Pass text to Gemini for extraction
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: `You are an expert business analyst and data extractor. 
You will be given the raw text scraped from a business's website.
Your objective is to extract the core business details and format them into a strict JSON object.

REQUIRED JSON FORMAT:
{
  "businessName": "The actual name of the business (guess from headers/copyright if needed)",
  "businessType": "Categorize as e.g. salon, spa, barbershop, clinic, bakery, agency, etc.",
  "location": {
    "city": "Extracted city (or empty string)",
    "region": "Extracted state/region (or empty string)",
    "country": "Extracted country (or empty string)"
  },
  "services": ["Service 1", "Service 2", "etc (max 10)"],
  "targetAudience": "A 1-sentence description of who they are trying to reach based on their copy/vibes",
  "positioning": "A 1-sentence description of their brand tone (e.g., High-end luxury, fast & affordable, holistic & organic)"
}

CRITICAL INSTRUCTIONS:
- You MUST only return the raw JSON object. NO markdown blocks like \`\`\`json. NO conversational text.
- If you absolutely cannot find a piece of information, make your best educated guess based on the context, or leave it as an empty string.`,
            generationConfig: {
                responseMimeType: "application/json",
            }
        });

        const prompt = `Here is the scraped text from ${url}:\n\n${text}`;
        const result = await model.generateContent(prompt);
        let extractedText = result.response.text().trim();
        extractedText = extractedText.replace(/^```[a-z]*\n/i, '').replace(/\n```$/i, '').trim();

        const contextData = JSON.parse(extractedText);

        // Inject the domain back into the data
        const domainUrl = new URL(url);
        contextData.domain = domainUrl.hostname;

        return NextResponse.json({ data: contextData });

    } catch (err: any) {
        console.error("Scrape Error:", err);
        return NextResponse.json({ error: err.message || "Failed to parse website content." }, { status: 500 });
    }
}
