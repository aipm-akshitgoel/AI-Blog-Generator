/** Matches Supabase `blog-images` bucket limit in supabase/012_blog_images_storage.sql */
export const BLOG_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

/** Target max before upload (headroom for encoding overhead). */
export const BLOG_IMAGE_MAX_BYTES_SAFE = Math.floor(BLOG_IMAGE_MAX_BYTES * 0.95);

export const BLOG_IMAGE_MAX_MB = BLOG_IMAGE_MAX_BYTES / (1024 * 1024);

export function exceedsBlogImageLimit(byteSize: number): boolean {
    return byteSize > BLOG_IMAGE_MAX_BYTES_SAFE;
}

export function getDataUrlByteSize(dataUrl: string): number {
    const match = /^data:[^;]+;base64,(.+)$/i.exec(dataUrl.trim());
    if (!match) return 0;
    const base64 = match[1];
    const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
    return Math.floor((base64.length * 3) / 4) - padding;
}

export function formatBlogImageSizeError(context: string): string {
    return `${context} exceeds the ${BLOG_IMAGE_MAX_MB}MB storage limit. Use a smaller image or regenerate.`;
}
