import type { BusinessContext } from "@/lib/types/businessContext";
import { sanitizeStrategyPromptText } from "@/lib/azureContentFilter";

export function buildStrategySystemPrompt(platform: "blog" | "linkedin"): string {
  const platformLine =
    platform === "linkedin"
      ? "CURRENT PLATFORM: LINKEDIN — include trendingTopics and inspiration."
      : "CURRENT PLATFORM: BLOG — return keywordStrategy with primaryKeyword and contentDirectory (H1/H2 plan). Do not return topicOptions.";

  return `You are an expert content strategist.

${platformLine}

For BLOG: propose a primary SEO keyword and a content directory — each row is one future blog post with an H1 title and its H2 section headings. No generic "topics" or blurbs.
For LINKEDIN: propose pillar themes, post hooks, trendingTopics, and inspiration examples.

Use only the business summary and reference site for market context. Do not claim live web access.

REQUIRED OUTPUT FORMAT (JSON ONLY, no markdown fences):
${
  platform === "linkedin"
    ? `{
  "keywordStrategy": {
    "primaryKeyword": "...",
    "secondaryKeywords": ["...", "..."],
    "searchIntent": "informational"
  },
  "topicOptions": [
    { "title": "Post hook", "description": "Angle", "cannibalizationRisk": false }
  ],
  "trendingTopics": [],
  "inspiration": []
}`
    : `{
  "keywordStrategy": {
    "primaryKeyword": "main target keyword phrase",
    "searchIntent": "informational",
    "contentDirectory": [
      {
        "h1": "Full blog post title used as the page H1",
        "h2s": ["First H2 section", "Second H2 section", "Third H2 section"]
      }
    ]
  }
}`
}`;
}

export function buildStrategyUserPrompt(opts: {
  ctx: BusinessContext;
  refDomain: string;
  customText: string;
  platform: "blog" | "linkedin";
  minimal?: boolean;
}): string {
  const { ctx, refDomain, customText, platform, minimal } = opts;
  const direction = sanitizeStrategyPromptText(customText);

  if (minimal) {
    const parts = [
      "Create SEO keyword strategy and a content directory (H1 titles + H2 sections per post) as JSON.",
      direction ? `Focus: ${direction}` : "",
      refDomain ? `Reference site for topic alignment: ${refDomain}` : "",
    ].filter(Boolean);
    return parts.join("\n");
  }

  const lines = [
    "Create keyword strategy and a content directory (H1 blog titles with H2 outlines) for this business.",
    "",
    "Business summary:",
    `- Name: ${ctx.businessName || "Unknown"}`,
    `- Website: ${ctx.domain || "not provided"}`,
    `- Type: ${ctx.businessType || "general"}`,
    `- Audience: ${ctx.targetAudience || "general readers"}`,
    `- Positioning: ${ctx.positioning || "helpful and informative"}`,
  ];

  if (ctx.services?.length) {
    lines.push(`- Offerings: ${ctx.services.slice(0, 8).join(", ")}`);
  }
  if (ctx.location?.country || ctx.location?.city) {
    lines.push(
      `- Location: ${[ctx.location.city, ctx.location.region, ctx.location.country].filter(Boolean).join(", ")}`,
    );
  }
  if (refDomain) {
    lines.push(
      "",
      `Reference site for topic alignment: ${refDomain} (public marketing site; use only for keyword and topic ideas).`,
    );
  }
  if (direction) {
    lines.push("", "Additional direction:", direction);
  }
  if (platform === "linkedin") {
    lines.push("", "Prefer thought-leadership hooks and story-driven LinkedIn post ideas.");
  }

  return lines.join("\n");
}
