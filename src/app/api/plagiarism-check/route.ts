import { NextResponse } from "next/server";
import type { OptimizedContent } from "@/lib/types/optimization";
import type { PlagiarismReport } from "@/lib/types/plagiarism";

export async function POST(req: Request) {
    let body: { optimizedContent?: OptimizedContent };

    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { optimizedContent } = body;

    if (!optimizedContent) {
        return NextResponse.json({ error: "Missing optimizedContent" }, { status: 400 });
    }

    // TODO: In a production environment, this is where you would call out to an
    // MCP (Model Context Protocol) tool like Copyscape to check the `contentMarkdown`.
    // Because no such MCP is currently hooked up, we will simulate the check here.

    // Simulate a 2-second check
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // For demonstration purposes, we'll pretend the article passed safely,
    // but we will flag one small section with a low similarity score to show what the UI looks like.

    const mockReport: PlagiarismReport = {
        isSafe: true,
        overallSimilarity: 4,
        flaggedSections: [
            {
                textSegment: "Discover the ultimate relaxation experience in our state-of-the-art facility.",
                similarityScore: 85,
                sourceUrl: "https://example-spa-template.com",
            }
        ]
    };

    return NextResponse.json({ report: mockReport }, { status: 200 });
}
