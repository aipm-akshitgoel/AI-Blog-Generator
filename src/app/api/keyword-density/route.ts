import { NextResponse } from "next/server";
import type { BlogPost } from "@/lib/types/content";
import type { ContentConstraints } from "@/lib/types/contentSpec";
import { verifyKeywordPlanForPost } from "@/lib/keywordPlanVerification";

export async function POST(req: Request) {
    let body: {
        markdown?: string;
        contentMarkdown?: string;
        post?: BlogPost;
        constraints?: ContentConstraints | null;
        strategyPrimary?: string;
    };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const markdown = body.markdown ?? body.contentMarkdown ?? "";
    const post = body.post;
    if (!markdown.trim()) {
        return NextResponse.json({ error: "Missing markdown content" }, { status: 400 });
    }
    if (!post) {
        return NextResponse.json({ error: "Missing post payload for keyword plan" }, { status: 400 });
    }

    try {
        const verification = await verifyKeywordPlanForPost(post, markdown, {
            constraints: body.constraints ?? null,
            strategyPrimary: body.strategyPrimary,
        });
        if (!verification) {
            return NextResponse.json(
                { error: "No keyword plan on this article — writer must set keywordPlan during drafting." },
                { status: 404 },
            );
        }
        return NextResponse.json(verification);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Keyword density check failed";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
