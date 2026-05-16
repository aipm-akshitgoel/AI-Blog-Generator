import { promises as fs } from "node:fs";
import path from "node:path";
import { cwd } from "node:process";

const LEGACY_DOWNLOADS_HTML = "/Users/akshitgoel/Downloads/YD Online MBA.html";
const LEGACY_DOWNLOADS_ASSETS = "/Users/akshitgoel/Downloads/YD Online MBA_files";

const REPO_MIRROR_DIR = path.join(cwd(), "public", "yd-online-mba-mirror");

/** Official page used only when no local mirror files exist (e.g. on Vercel before mirror is committed). */
export const YD_ONLINE_MBA_FALLBACK_URL = "https://www.yourdegree.com/online-mba/";

export type ResolvedMirror = {
  kind: "html";
  html: string;
};

function normalizeMirrorRoot(raw: string | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  return path.resolve(trimmed);
}

export async function tryReadLocalHtml(): Promise<ResolvedMirror | null> {
  const envRoot = normalizeMirrorRoot(process.env.YD_ONLINE_MBA_MIRROR_ROOT);
  const envHtml = process.env.YD_ONLINE_MBA_HTML_PATH?.trim();

  const candidates: string[] = [];

  if (envHtml) {
    candidates.push(path.resolve(envHtml));
  }

  if (envRoot) {
    candidates.push(path.join(envRoot, "YD Online MBA.html"));
  }

  candidates.push(path.join(REPO_MIRROR_DIR, "YD Online MBA.html"));
  candidates.push(LEGACY_DOWNLOADS_HTML);

  for (const htmlPath of candidates) {
    try {
      const html = await fs.readFile(htmlPath, "utf8");
      return { kind: "html", html };
    } catch {
      // try next
    }
  }

  return null;
}

export function buildFallbackMirrorHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Online MBA | YourDegree</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f6f7f9; color: #1a1a1a; }
    main { max-width: 32rem; padding: 2rem; text-align: center; }
    a { color: #0b57d0; }
  </style>
</head>
<body>
  <main>
    <h1>Online MBA</h1>
    <p>YourDegree blocks this page from loading inside an embedded frame. Open the live page in a new tab, or add a local mirror under <code>public/yd-online-mba-mirror/</code>.</p>
    <p><a href="${YD_ONLINE_MBA_FALLBACK_URL}" target="_blank" rel="noopener noreferrer">Open ${YD_ONLINE_MBA_FALLBACK_URL}</a></p>
  </main>
</body>
</html>`;
}

export function transformMirrorHtml(rawHtml: string): string {
  const withBase = rawHtml.includes("<base href=")
    ? rawHtml
    : rawHtml.replace("<head>", '<head><base href="/yd-online-mba/">');
  return withBase
    .replaceAll("./YD Online MBA_files/", "/yd-online-mba-assets/")
    .replaceAll("YD Online MBA_files/", "/yd-online-mba-assets/");
}

/** Absolute path to an asset file under any known mirror, or null. */
export async function resolveMirrorAssetPath(assetRelativePath: string): Promise<string | null> {
  const normalized = path.normalize(assetRelativePath).replace(/^(\.\.[/\\])+/, "");

  const envRoot = normalizeMirrorRoot(process.env.YD_ONLINE_MBA_MIRROR_ROOT);
  const roots = [
    envRoot ? path.join(envRoot, "YD Online MBA_files") : null,
    path.join(REPO_MIRROR_DIR, "YD Online MBA_files"),
    LEGACY_DOWNLOADS_ASSETS,
  ].filter((r): r is string => Boolean(r));

  for (const root of roots) {
    const resolvedRoot = path.resolve(root);
    const full = path.join(resolvedRoot, normalized);
    if (!full.startsWith(resolvedRoot)) continue;
    try {
      await fs.access(full);
      return full;
    } catch {
      // continue
    }
  }
  return null;
}
