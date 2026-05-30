import { NextResponse } from "next/server";
import { detectAiContentPercentWithStatus, getZeroGptConfig } from "@/lib/zerogptAiDetection";

export async function POST(req: Request) {
    const config = getZeroGptConfig();
    if (!config) {
        return NextResponse.json(
            { error: "ZEROGPT_API_KEY is not configured on the server." },
            { status: 503 },
        );
    }

    let body: { markdown?: string; contentMarkdown?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const markdown = body.markdown ?? body.contentMarkdown ?? "";
    if (!markdown.trim()) {
        return NextResponse.json({ error: "Missing markdown content" }, { status: 400 });
    }

    try {
        const { result, error } = await detectAiContentPercentWithStatus(markdown);
        if (!result) {
            return NextResponse.json(
                { error: error ?? "Could not parse AI detection response from ZeroGPT." },
                { status: 502 },
            );
        }

        return NextResponse.json(result);
    } catch (err) {
        const message = err instanceof Error ? err.message : "AI detection check failed";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
