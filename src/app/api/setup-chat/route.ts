import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

const SYSTEM_PROMPT = `
You are a friendly, concise, and expert business setup assistant. Your goal is to gather all necessary information from the user to build a complete "BusinessContext".

You need to collect the following information:
1. businessName (string) - START WITH THIS.
2. domain (string, e.g., "https://yoursalon.com") - Ask for this after the name, politely.
3. businessType (exact string, must be one of: "salon", "spa", "barbershop", "other")
4. location (object with optional fields: city, region, country)
5. services (array of strings, e.g., ["Haircut", "Color", "Balayage"])
6. targetAudience (string describing the ideal clientele)
7. positioning (string describing how the business wants to be perceived)

Instructions:
- Ask ONE logical question at a time to gather the missing information.
- Start by asking for the business name.
- Once you have the name, ask for the website URL with a polite tone, explaining that it helps with SEO and internal linking optimization. (e.g., "Great! And to help us better optimize your SEO and internal linking, could you share your website URL if you have one?")
- If they don't have a website yet, that's fine; move on to the next question.
- Be conversational and encouraging.
- Once you have reasonably gathered ALL the required information, you MUST output ONLY a valid JSON object matching the following structure, with NO markdown formatting, NO backticks, and NO conversational text before or after:

{
  "domain": "...",
  "businessName": "...",
  "businessType": "...",
  "location": {
    "city": "...",
    "region": "...",
    "country": "..."
  },
  "services": ["...", "..."],
  "targetAudience": "...",
  "positioning": "..."
}

CRITICAL: If you output JSON, it must be the ONLY output. If you are asking a question, output plain text.
`;

export async function POST(req: Request) {
    if (!apiKey) {
        return NextResponse.json(
            { error: "GEMINI_API_KEY is not set in .env.local" },
            { status: 500 },
        );
    }

    let body: { messages?: { role: string; content: string }[] };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json(
            { error: "Invalid JSON body" },
            { status: 400 },
        );
    }

    const messages = body.messages;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return NextResponse.json(
            { error: "Missing or invalid messages array" },
            { status: 400 },
        );
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            systemInstruction: `You are an AI specialized in capturing local SEO context. Your goal is to gather all necessary information from the user to build a complete "BusinessContext" for local SEO optimization.

You need to collect the following information:
1. businessName (string) - START WITH THIS.
2. domain (string, e.g., "https://yoursalon.com") - Ask for this after the name, politely.
3. businessType (exact string, must be one of: "salon", "spa", "barbershop", "other")
4. location (object with optional fields: city, region, country)
5. services (array of strings, e.g., ["Haircut", "Color", "Balayage"])
6. targetAudience (string describing the ideal clientele)
7. positioning (string describing how the business wants to be perceived)

Instructions:
- Ask ONE logical question at a time to gather the missing information.
- Start by asking for the business name.
- Once you have the name, ask for the website URL with a polite tone, explaining that it helps with SEO and internal linking optimization. (e.g., "Great! And to help us better optimize your SEO and internal linking, could you share your website URL if you have one?")
- If they don't have a website yet, that's fine; move on to the next question.
- Be conversational and encouraging.
- Once you have reasonably gathered ALL the required information, you MUST output ONLY a valid JSON object matching the following structure, with NO markdown formatting, NO backticks, and NO conversational text before or after:

{
  "domain": "...",
  "businessName": "...",
  "businessType": "...",
  "location": {
    "city": "...",
    "region": "...",
    "country": "..."
  },
  "services": ["...", "..."],
  "targetAudience": "...",
  "positioning": "..."
}

CRITICAL: If you output JSON, it must be the ONLY output. If you are asking a question, output plain text.`,
        });

        let validMessages = messages.slice(0, -1);

        // Gemini expects the history to start with a 'user' message.
        // Drop any leading 'model' messages (like the initial status greeting).
        while (validMessages.length > 0 && validMessages[0].role !== "user") {
            validMessages.shift();
        }

        const history = validMessages.map((msg) => ({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.content }],
        }));

        const lastMessage = messages[messages.length - 1].content;

        const chat = model.startChat({
            history,
        });

        const result = await chat.sendMessage(lastMessage);
        const text = result.response.text().trim();

        // Check if the response is JSON (meaning complete)
        try {
            // Remove any potential markdown json blocks if the model accidentally wrapped it
            const cleanText = text.replace(/^```[a-z]*\n/i, '').replace(/\n```$/i, '').trim();
            const jsonData = JSON.parse(cleanText);

            // If it parsed successfully, we assume it's the final completed context
            return NextResponse.json({ complete: true, data: jsonData });
        } catch {
            // Not JSON, so it's a follow-up question
            return NextResponse.json({ complete: false, text });
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : "Gemini request failed";
        return NextResponse.json(
            { error: message },
            { status: 500 },
        );
    }
}
