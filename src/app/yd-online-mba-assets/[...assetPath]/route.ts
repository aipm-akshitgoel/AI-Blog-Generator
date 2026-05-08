import { promises as fs } from "node:fs";
import path from "node:path";

const SOURCE_ASSET_ROOT = "/Users/akshitgoel/Downloads/YD Online MBA_files";

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
  const unsafePath = assetPath.join("/");
  const normalizedPath = path.normalize(unsafePath).replace(/^(\.\.[/\\])+/, "");
  const fullPath = path.join(SOURCE_ASSET_ROOT, normalizedPath);

  if (!fullPath.startsWith(SOURCE_ASSET_ROOT)) {
    return new Response("Invalid asset path.", { status: 400 });
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

