import { auth } from "@clerk/nextjs/server";
import { getBlogById, saveBlog, deleteBlog } from "@/lib/blogDb";
import { NextResponse } from "next/server";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;
        const blogId = resolvedParams.id;
        const body = await req.json();

        const existingBlog = await getBlogById(blogId, userId);
        if (!existingBlog) {
            return NextResponse.json({ error: "Blog not found" }, { status: 404 });
        }

        // Apply edits (title, markdown, status)
        if (body.title !== undefined) existingBlog.title = body.title;
        if (body.status !== undefined) {
            existingBlog.status = body.status;
            if (body.status === "published" && !existingBlog.liveUrl) {
                existingBlog.liveUrl = `/blog/${existingBlog.slug}`;
            }
        }
        if (body.contentMarkdown !== undefined) {
            existingBlog.payload.content.contentMarkdown = body.contentMarkdown;
        }

        // Apply edits (meta)
        if (existingBlog.payload.meta) {
            if (body.metaTitle !== undefined) existingBlog.payload.meta.title = body.metaTitle;
            if (body.metaDescription !== undefined) existingBlog.payload.meta.description = body.metaDescription;
        }

        // Apply edits (cta)
        if (existingBlog.payload.cta) {
            if (body.ctaHeadline !== undefined) existingBlog.payload.cta.ctaHeadline = body.ctaHeadline;
            if (body.ctaCopy !== undefined) existingBlog.payload.cta.ctaCopy = body.ctaCopy;
            if (body.ctaButtonText !== undefined) existingBlog.payload.cta.ctaButtonText = body.ctaButtonText;
            if (body.ctaLink !== undefined) existingBlog.payload.cta.ctaLink = body.ctaLink;
        }

        // Apply edits (image)
        if (body.bannerImageUrl !== undefined) {
            if (!existingBlog.payload.images) {
                existingBlog.payload.images = {} as any;
            }
            existingBlog.payload.images!.bannerImageUrl = body.bannerImageUrl;
        }
        if (body.imageAltText !== undefined) {
            if (!existingBlog.payload.images) {
                existingBlog.payload.images = {} as any;
            }
            existingBlog.payload.images!.altText = body.imageAltText;
        }

        // Apply edits (category)
        if (body.category !== undefined) {
            (existingBlog as any).category = body.category;
        }

        // Apply edits (schema JSON-LD overrides)
        if (body.articleSchemaJson !== undefined || body.orgSchemaJson !== undefined) {
            if (!existingBlog.payload.schema) {
                existingBlog.payload.schema = { type: 'Article', jsonLd: '{}', validationStatus: 'valid' };
            }
            try {
                // Parse existing @graph or start fresh
                const existing = JSON.parse(existingBlog.payload.schema.jsonLd || '{}');
                const articleTypes = new Set(['Article', 'BlogPosting', 'NewsArticle']);
                let graph: any[] = Array.isArray(existing['@graph']) ? existing['@graph'] : [];

                if (body.articleSchemaJson !== undefined) {
                    const articleNodeStr = body.articleSchemaJson.trim() || '{}';
                    const articleNode = JSON.parse(articleNodeStr);
                    if (Object.keys(articleNode).length > 0) {
                        graph = [...graph.filter((n: any) => !articleTypes.has(n['@type'])), articleNode];
                    } else {
                        graph = graph.filter((n: any) => !articleTypes.has(n['@type']));
                    }
                }
                if (body.orgSchemaJson !== undefined) {
                    const orgNodeStr = body.orgSchemaJson.trim() || '[]';
                    const orgNodes = JSON.parse(orgNodeStr); // may be array or object
                    const orgArr = Array.isArray(orgNodes) ? orgNodes : Object.keys(orgNodes).length > 0 ? [orgNodes] : [];
                    graph = [...graph.filter((n: any) => articleTypes.has(n['@type'])), ...orgArr];
                }

                existingBlog.payload.schema.jsonLd = JSON.stringify({ ...existing, '@graph': graph });
                existingBlog.payload.schema.validationStatus = 'valid';
            } catch {
                return NextResponse.json({ error: 'Invalid JSON in schema editor. Please check your JSON and try again.' }, { status: 400 });
            }
        }

        await saveBlog(existingBlog);

        return NextResponse.json(existingBlog);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;
        const blogId = resolvedParams.id;

        const success = await deleteBlog(blogId, userId);
        if (!success) {
            return NextResponse.json({ error: "Blog not found or could not be deleted" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
