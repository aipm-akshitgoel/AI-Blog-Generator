import "server-only";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { supabaseServer } from "@/lib/supabaseServerClient";
import type { ImageMetadata } from "@/lib/types/image";
import { getPublicSiteUrl, isCrawlerFriendlyImageUrl, toAbsolutePublicUrl } from "@/lib/publicSiteUrl";
import { ensureBlogImageBuffer } from "@/lib/blogImageCompress";
import { exceedsBlogImageLimit, formatBlogImageSizeError } from "@/lib/blogImageLimits";

const BUCKET = "blog-images";

export { isCrawlerFriendlyImageUrl };

function isSupabaseBlogImageUrl(url: string): boolean {
    return url.includes("/storage/v1/object/public/blog-images/");
}

function needsPersistence(url: string): boolean {
    const u = url.trim();
    if (!u) return false;
    if (u.startsWith("data:")) return true;
    if (u.startsWith("/uploads/")) return true;
    if (isSupabaseBlogImageUrl(u)) return false;
    return false;
}

async function sourceToBuffer(sourceUrl: string): Promise<{ buffer: Buffer; contentType: string; ext: string }> {
    if (sourceUrl.startsWith("data:")) {
        const match = /^data:([^;]+);base64,(.+)$/i.exec(sourceUrl);
        if (!match) throw new Error("Invalid data URL for blog image");
        const contentType = match[1];
        const buffer = Buffer.from(match[2], "base64");
        const ext = contentType.includes("jpeg") ? "jpg" : contentType.includes("webp") ? "webp" : "png";
        return { buffer, contentType, ext };
    }

    const absolute = toAbsolutePublicUrl(sourceUrl);
    const res = await fetch(absolute, { signal: AbortSignal.timeout(60_000) });
    if (!res.ok) throw new Error(`Failed to fetch image (${res.status}): ${absolute}`);
    const contentType = res.headers.get("content-type") || "image/png";
    const buffer = Buffer.from(await res.arrayBuffer());
    const ext = contentType.includes("jpeg") ? "jpg" : contentType.includes("webp") ? "webp" : "png";
    return { buffer, contentType, ext };
}

async function uploadToSupabase(buffer: Buffer, contentType: string, objectPath: string): Promise<string | null> {
    const { error } = await supabaseServer.storage.from(BUCKET).upload(objectPath, buffer, {
        contentType,
        upsert: true,
    });
    if (error) {
        console.error("[blogImageStorage] Supabase upload failed:", error.message);
        return null;
    }
    const { data } = supabaseServer.storage.from(BUCKET).getPublicUrl(objectPath);
    return data.publicUrl;
}

async function uploadToLocalPublic(buffer: Buffer, ext: string): Promise<string> {
    const uploadDir = path.join(process.cwd(), "public", "uploads", "blog");
    await mkdir(uploadDir, { recursive: true });
    const filename = `${crypto.randomBytes(12).toString("hex")}.${ext}`;
    await writeFile(path.join(uploadDir, filename), buffer);
    return `${getPublicSiteUrl()}/uploads/blog/${filename}`;
}

/**
 * Stores ephemeral images (data: URLs, local /uploads) in Supabase Storage when available,
 * otherwise falls back to public/uploads/blog on disk (local dev).
 */
export async function persistBlogImageUrl(
    sourceUrl: string,
    opts: { slug: string; variant: "banner" | "cta" },
): Promise<string> {
    const trimmed = sourceUrl.trim();
    if (!trimmed) return trimmed;

    if (!needsPersistence(trimmed)) {
        return toAbsolutePublicUrl(trimmed);
    }

    let { buffer, contentType, ext } = await sourceToBuffer(trimmed);
    ({ buffer, contentType, ext } = await ensureBlogImageBuffer(buffer, contentType));
    if (exceedsBlogImageLimit(buffer.length)) {
        throw new Error(formatBlogImageSizeError("Image"));
    }

    const safeSlug = opts.slug.replace(/[^a-z0-9-]/gi, "-").slice(0, 80) || "post";
    const objectPath = `${safeSlug}/${opts.variant}-${Date.now()}.${ext}`;

    const supabaseUrl = await uploadToSupabase(buffer, contentType, objectPath);
    if (supabaseUrl) return supabaseUrl;

    return uploadToLocalPublic(buffer, ext);
}

export async function persistBlogImages(images: ImageMetadata, slug: string): Promise<ImageMetadata> {
    const bannerImageUrl = await persistBlogImageUrl(images.bannerImageUrl, { slug, variant: "banner" });
    const ctaImageUrl = images.ctaImageUrl
        ? await persistBlogImageUrl(images.ctaImageUrl, { slug, variant: "cta" })
        : undefined;
    return { ...images, bannerImageUrl, ...(ctaImageUrl ? { ctaImageUrl } : {}) };
}
