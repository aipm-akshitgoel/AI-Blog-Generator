import { promises as fs } from "node:fs";

const SOURCE_HTML_PATH = "/Users/akshitgoel/Downloads/YD Online MBA.html";

export async function GET() {
  try {
    const rawHtml = await fs.readFile(SOURCE_HTML_PATH, "utf8");
    const withBase = rawHtml.includes("<base href=")
      ? rawHtml
      : rawHtml.replace("<head>", '<head><base href="/yd-online-mba/">');
    const html = withBase
      .replaceAll("./YD Online MBA_files/", "/yd-online-mba-assets/")
      .replaceAll("YD Online MBA_files/", "/yd-online-mba-assets/");

    return new Response(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? `Unable to read source file at ${SOURCE_HTML_PATH}: ${error.message}`
        : `Unable to read source file at ${SOURCE_HTML_PATH}.`;

    return new Response(
      `<!doctype html><html><body><h1>YD Online MBA source not found</h1><p>${message}</p></body></html>`,
      {
        status: 500,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
        },
      },
    );
  }
}

