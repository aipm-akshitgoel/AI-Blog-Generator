import {
  buildFallbackMirrorHtml,
  tryReadLocalHtml,
  transformMirrorHtml,
} from "@/lib/ydOnlineMbaMirror";

export const runtime = "nodejs";

function htmlResponse(html: string): Response {
  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export async function GET() {
  const mirror = await tryReadLocalHtml();
  if (mirror) {
    return htmlResponse(transformMirrorHtml(mirror.html));
  }
  return htmlResponse(buildFallbackMirrorHtml());
}
