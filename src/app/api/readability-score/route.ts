import { NextResponse } from "next/server";
import {
    fetchReadabilityScore,
    getSeoReviewToolsApiKey,
    meetsReadabilityTarget,
} from "@/lib/seoReviewToolsReadability";

export async function POST(req: Request) {
    const apiKey = getSeoReviewToolsApiKey();
    if (!apiKey) {
        return NextResponse.json(
            {
                error: "SEO_REVIEW_TOOLS_API_KEY is not configured on the server.",
            },
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
        const result = await fetchReadabilityScore(markdown, apiKey);
        if (!result) {
            return NextResponse.json(
                { error: "Could not measure readability (article too short or empty)." },
                { status: 502 },
            );
        }

        return NextResponse.json({
            ...result,
            targetMet: meetsReadabilityTarget(result.gradeLevel),
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Readability check failed";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
