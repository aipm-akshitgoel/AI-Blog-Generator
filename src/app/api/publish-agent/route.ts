import { NextResponse } from "next/server";
import type { OptimizedContent } from "@/lib/types/optimization";
import type { BusinessContext } from "@/lib/types/businessContext";
import type { ImageMetadata } from "@/lib/types/image";
import type { CTAData } from "@/lib/types/cta";
import type { PublishPayload } from "@/lib/types/publish";
import type { MetaOption } from "@/lib/types/meta";
import type { SchemaData } from "@/lib/types/schema";
import { auth } from "@clerk/nextjs/server";
import { saveBlog, type SavedBlog } from "@/lib/mockDb";

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const {
            optimizedContent,
            businessContext,
            images,
            cta,
            meta,
            schema,
            templateId,
            saveAsDraft,
        }: {
            optimizedContent: OptimizedContent,
            businessContext: BusinessContext,
            images: ImageMetadata,
            cta: CTAData,
            meta: MetaOption,
            schema: SchemaData,
            templateId?: string,
            saveAsDraft?: boolean,
        } = body;

        if (!optimizedContent || !businessContext || !images || !cta || !meta || !schema) {
            return NextResponse.json({ error: "Missing required payloads for publishing" }, { status: 400 });
        }

        // Skip the simulated CMS delay for drafts (batch saves should be fast)
        if (!saveAsDraft) {
            await new Promise(resolve => setTimeout(resolve, 2500));
        }

        const blogStatus = saveAsDraft ? "draft" : "published";
        const simulatedSlug = optimizedContent.slug || meta.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const liveUrl = saveAsDraft ? null : `/blog/${simulatedSlug}`;

        const successPayload: PublishPayload = {
            status: blogStatus as any,
            publishUrl: liveUrl || `/blog/${simulatedSlug}`,
            publishedAt: new Date().toISOString(),
            platform: saveAsDraft ? "Draft" : "Webflow"
        };

        // Save the composed blog to our mock database
        const blogRecord: SavedBlog = {
            id: `blog_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId,
            status: blogStatus as any,
            title: optimizedContent.title,
            slug: simulatedSlug,
            createdAt: new Date().toISOString(),
            templateId: templateId || "minimal",
            liveUrl: liveUrl || undefined,
            category: meta.category,
            payload: {
                content: optimizedContent,
                cta,
                images,
                meta,
                schema
            }
        };

        await saveBlog(blogRecord);

        return NextResponse.json({ publishData: successPayload }, { status: 200 });

    } catch (err) {
        const message = err instanceof Error ? err.message : "Publishing failed catastrophically";
        console.error("Publish Agent Error:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
