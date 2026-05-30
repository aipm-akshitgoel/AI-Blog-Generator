import { NextResponse } from "next/server";
import { detectAiContentPercentWithStatus, isZeroGptEnabled } from "@/lib/zerogptAiDetection";

export async function GET() {
    return NextResponse.json({ enabled: isZeroGptEnabled() });
}

export async function POST(req: Request) {
    if (!isZeroGptEnabled()) {
        return NextResponse.json(
            { error: "ZeroGPT is disabled.", disabled: true },
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
