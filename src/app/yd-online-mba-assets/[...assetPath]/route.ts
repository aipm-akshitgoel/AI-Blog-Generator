import { promises as fs } from "node:fs";
import path from "node:path";
import { resolveMirrorAssetPath } from "@/lib/ydOnlineMbaMirror";

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".woff":
      return "font/woff";
    case ".woff2":
      return "font/woff2";
    case ".ttf":
      return "font/ttf";
    case ".ico":
      return "image/x-icon";
    case ".map":
      return "application/json; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ assetPath: string[] }> },
) {
  const { assetPath } = await params;
  const relative = assetPath.join("/");

  const fullPath = await resolveMirrorAssetPath(relative);
  if (!fullPath) {
    return new Response("Asset not found.", { status: 404 });
  }

  try {
    const buffer = await fs.readFile(fullPath);
    return new Response(buffer, {
      status: 200,
      headers: {
        "content-type": getContentType(fullPath),
        "cache-control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response("Asset not found.", { status: 404 });
  }
}
