import { auth } from "@clerk/nextjs/server";
import { getBlogById, saveBlog, deleteBlog } from "@/lib/blogDb";
import { persistBlogImageUrl } from "@/lib/blogImageStorage";
import { injectSchemaArticleImage } from "@/lib/schemaArticleImage";
import { extractPageLevelSchemaJsonLd } from "@/lib/pageSchema";
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
            existingBlog.payload.images!.bannerImageUrl = await persistBlogImageUrl(body.bannerImageUrl, {
                slug: existingBlog.slug,
                variant: "banner",
            });
            if (existingBlog.payload.schema) {
                existingBlog.payload.schema = injectSchemaArticleImage(
                    existingBlog.payload.schema,
                    existingBlog.payload.images!.bannerImageUrl,
                    existingBlog.payload.images!.altText,
                );
            }
        }
        if (body.imageAltText !== undefined) {
            if (!existingBlog.payload.images) {
                existingBlog.payload.images = {} as any;
            }
            existingBlog.payload.images!.altText = body.imageAltText;
            if (existingBlog.payload.schema && existingBlog.payload.images?.bannerImageUrl) {
                existingBlog.payload.schema = injectSchemaArticleImage(
                    existingBlog.payload.schema,
                    existingBlog.payload.images.bannerImageUrl,
                    existingBlog.payload.images.altText,
                );
            }
        }

        // Apply edits (category)
        if (body.category !== undefined) {
            (existingBlog as any).category = body.category;
        }

        // Apply edits (page-level schema JSON-LD only — no domain/org schema)
        if (body.pageSchemaJson !== undefined || body.articleSchemaJson !== undefined) {
            const raw = (body.pageSchemaJson ?? body.articleSchemaJson ?? "").trim();
            if (!existingBlog.payload.schema) {
                existingBlog.payload.schema = { type: "BlogPosting", jsonLd: "{}", validationStatus: "valid" };
            }
            try {
                const pageOnly = extractPageLevelSchemaJsonLd(raw || "{}");
                existingBlog.payload.schema.jsonLd = pageOnly;
                existingBlog.payload.schema.validationStatus = "valid";
            } catch {
                return NextResponse.json({ error: "Invalid JSON in schema editor. Please check your JSON and try again." }, { status: 400 });
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
