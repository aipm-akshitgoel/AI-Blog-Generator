import {
  buildFallbackIframeHtml,
  transformMirrorHtml,
  tryReadLocalHtml,
} from "@/lib/ydOnlineMbaMirror";

export const dynamic = "force-dynamic";

export async function GET() {
  const mirror = await tryReadLocalHtml();
  const body = mirror ? transformMirrorHtml(mirror.html) : buildFallbackIframeHtml();

  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": mirror ? "no-store" : "public, max-age=300",
    },
  });
}
