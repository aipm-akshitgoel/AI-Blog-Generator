import "server-only";
import {
    BLOG_IMAGE_MAX_BYTES_SAFE,
    exceedsBlogImageLimit,
    formatBlogImageSizeError,
    getDataUrlByteSize,
} from "@/lib/blogImageLimits";

type CompressedImage = { buffer: Buffer; contentType: string; ext: string };

/** Resize/re-encode until the buffer fits under the Supabase bucket limit. */
export async function compressImageBufferToLimit(buffer: Buffer): Promise<CompressedImage> {
    if (!exceedsBlogImageLimit(buffer.length)) {
        return { buffer, contentType: "image/png", ext: "png" };
    }

    const sharp = (await import("sharp")).default;
    let quality = 82;
    let width = 1600;

    for (let attempt = 0; attempt < 10; attempt++) {
        const out = await sharp(buffer)
            .rotate()
            .resize({ width, withoutEnlargement: true })
            .jpeg({ quality, mozjpeg: true })
            .toBuffer();

        if (!exceedsBlogImageLimit(out.length)) {
            return { buffer: out, contentType: "image/jpeg", ext: "jpg" };
        }

        quality = Math.max(45, quality - 8);
        width = Math.max(720, Math.floor(width * 0.85));
    }

    throw new Error(formatBlogImageSizeError("Image"));
}

export async function ensureBlogImageDataUrl(dataUrl: string): Promise<string | null> {
    const trimmed = dataUrl.trim();
    if (!trimmed.startsWith("data:")) return trimmed;

    const byteSize = getDataUrlByteSize(trimmed);
    if (!exceedsBlogImageLimit(byteSize)) return trimmed;

    const match = /^data:([^;]+);base64,(.+)$/i.exec(trimmed);
    if (!match) return null;

    try {
        const input = Buffer.from(match[2], "base64");
        const { buffer, contentType } = await compressImageBufferToLimit(input);
        return `data:${contentType};base64,${buffer.toString("base64")}`;
    } catch (err) {
        console.warn("[blogImageCompress] Could not compress data URL to limit:", err);
        return null;
    }
}

export async function ensureBlogImageBuffer(buffer: Buffer, contentType: string): Promise<CompressedImage> {
    if (!exceedsBlogImageLimit(buffer.length)) {
        const ext = contentType.includes("jpeg") ? "jpg" : contentType.includes("webp") ? "webp" : "png";
        return { buffer, contentType, ext };
    }
    return compressImageBufferToLimit(buffer);
}
