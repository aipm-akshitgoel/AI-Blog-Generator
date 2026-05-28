import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { BLOG_IMAGE_MAX_BYTES, formatBlogImageSizeError } from "@/lib/blogImageLimits";
import { ensureBlogImageBuffer } from "@/lib/blogImageCompress";

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = (formData as any).get?.("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        if (file.size > BLOG_IMAGE_MAX_BYTES) {
            return NextResponse.json({ error: formatBlogImageSizeError("Upload") }, { status: 400 });
        }

        const rawBuffer = Buffer.from(await file.arrayBuffer());
        const contentType = file.type || "image/png";
        const { buffer, ext } = await ensureBlogImageBuffer(rawBuffer, contentType);

        // Ensure the public/uploads directory exists
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        try {
            await mkdir(uploadDir, { recursive: true });
        } catch (e) {
            // Ignore if directory already exists
        }

        const filename = `${crypto.randomBytes(8).toString("hex")}.${ext}`;
        const filepath = path.join(uploadDir, filename);

        await writeFile(filepath, buffer);

        // Return the public URL
        return NextResponse.json({ url: `/uploads/${filename}` });
    } catch (e: any) {
        console.error("Upload error:", e);
        return NextResponse.json({ error: e.message || "Failed to upload image" }, { status: 500 });
    }
}
