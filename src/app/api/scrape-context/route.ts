import { NextResponse } from "next/server";
import { assistantMessageText, azureConfigDebug, createAzureClient, getAzureConfig, stripOuterMarkdownFence } from "@/lib/azureOpenAI";

export async function POST(req: Request) {
    const azure = getAzureConfig();

    if (!azure) {
        return NextResponse.json({
            error: "Azure OpenAI is not configured on the server",
            debug: azureConfigDebug(),
        }, { status: 500 });
    }

    try {
        const { url } = await req.json();
        if (!url || !url.startsWith("http")) {
            return NextResponse.json({ error: "A valid URL (http/https) is required." }, { status: 400 });
        }

        // 1. Fetch website HTML
        let pageResponse: Response;
        try {
            pageResponse = await fetch(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (compatible; BloggieBot/1.0; +http://bloggieai.com)",
                },
            });
        } catch (fetchErr: any) {
            const causeCode = fetchErr?.cause?.code;
            const detail = causeCode ? ` (${causeCode})` : "";
            return NextResponse.json(
                { error: `Unable to fetch the website URL${detail}. Please verify the URL and SSL certificate.` },
                { status: 400 },
            );
        }

        if (!pageResponse.ok) {
            return NextResponse.json({ error: `Failed to fetch URL. Status: ${pageResponse.status}` }, { status: 400 });
        }

        let html = await pageResponse.text();

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

        // 3. Pass text to Azure OpenAI for extraction
        const client = createAzureClient(azure);

        const prompt = `You are an expert business analyst and data extractor. 
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
- If you absolutely cannot find a piece of information, make your best educated guess based on the context, or leave it as an empty string.

Website URL: ${url}

Scraped text:
${text}`;

        const aiResponse = await client.chat.completions.create({
            model: azure.deployment,
            max_completion_tokens: 1800,
            messages: [
                { role: "system", content: "Return ONLY a valid JSON object." },
                { role: "user", content: prompt }
            ]
        });

        const raw = assistantMessageText((aiResponse as any)?.choices?.[0]?.message?.content);
        const extractedText = stripOuterMarkdownFence(raw);
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
