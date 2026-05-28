import type { BusinessContext } from "@/lib/types/businessContext";
import { sanitizeStrategyPromptText } from "@/lib/azureContentFilter";
import { buildContentGuidelinesPrompt } from "@/lib/contentGuidelines";

export function buildStrategySystemPrompt(platform: "blog" | "linkedin"): string {
  const platformLine =
    platform === "linkedin"
      ? "CURRENT PLATFORM: LINKEDIN — include trendingTopics and inspiration."
      : "CURRENT PLATFORM: BLOG — return keywordStrategy with primaryKeyword and contentDirectory (full per-post SEO plan). Do not return topicOptions.";

  return `You are an expert content strategist.

${platformLine}

For BLOG: propose a north-star primaryKeyword plus a contentDirectory — each row is one future blog post with H1, per-post primaryKeyword, sections (each H2 with nested h3s), and optional secondaryKeywords, tertiaryKeywords. No generic "topics" or blurbs.
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
    "primaryKeyword": "north-star domain keyword phrase",
    "searchIntent": "informational",
    "contentDirectory": [
      {
        "h1": "Full blog post title used as the page H1",
        "primaryKeyword": "primary SEO phrase for this specific post (required)",
        "sections": [
          {
            "h2": "First H2 section",
            "h3s": ["H3 under first H2", "Another H3 under first H2"]
          },
          {
            "h2": "Second H2 section",
            "h3s": ["H3 under second H2"]
          }
        ],
        "secondaryKeywords": ["supporting phrase", "another phrase"],
        "tertiaryKeywords": ["long-tail phrase", "variant phrase"]
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
      "Create SEO keyword strategy and a content directory (H1, per-post primaryKeyword, sections with H2+h3s, secondaryKeywords, tertiaryKeywords per post) as JSON.",
      direction ? `Focus: ${direction}` : "",
      refDomain ? `Reference site for topic alignment: ${refDomain}` : "",
    ].filter(Boolean);
    return parts.join("\n");
  }

  const safe = (s: string | undefined) => sanitizeStrategyPromptText(s || "");

  const lines = [
    "Create keyword strategy and a content directory (each post: H1, primaryKeyword, sections with H2 and nested h3s, optional secondaryKeywords, tertiaryKeywords) for this business.",
    "",
    "Business summary:",
    `- Name: ${safe(ctx.businessName) || "Unknown"}`,
    `- Website: ${ctx.domain || "not provided"}`,
    `- Type: ${safe(ctx.businessType) || "general"}`,
    `- Audience: ${safe(ctx.targetAudience) || "general readers"}`,
    `- Brand tone: ${safe(ctx.brandTone) || "professional and helpful"}`,
    `- Positioning: ${safe(ctx.positioning) || "helpful and informative"}`,
  ];

  if (ctx.services?.length) {
    lines.push(`- Offerings: ${ctx.services.slice(0, 8).map((s) => safe(s)).filter(Boolean).join(", ")}`);
  }
  if (ctx.location?.country || ctx.location?.city) {
    lines.push(
      `- Location: ${[ctx.location.city, ctx.location.region, ctx.location.country].filter(Boolean).join(", ")}`,
    );
  }
  if (refDomain) {
    lines.push("", `Public website hostname for topic ideas: ${refDomain}`);
  }
  if (direction) {
    lines.push("", "Additional direction:", direction);
  }
  const guidelinesBlock = buildContentGuidelinesPrompt(ctx.contentGuidelines);
  if (guidelinesBlock) {
    lines.push("", guidelinesBlock);
  }
  if (platform === "linkedin") {
    lines.push("", "Prefer thought-leadership hooks and story-driven LinkedIn post ideas.");
  }

  return lines.join("\n");
}

/** Shortest prompt — used after content-filter retries. */
export function buildStrategyUltraMinimalPrompt(opts: {
  refDomain: string;
  customText: string;
  platform: "blog" | "linkedin";
}): string {
  const direction = sanitizeStrategyPromptText(opts.customText);
  if (opts.platform === "linkedin") {
    return ["Create LinkedIn keyword strategy JSON.", direction ? `Focus: ${direction}` : ""]
      .filter(Boolean)
      .join("\n");
  }
  return [
    "Create blog keywordStrategy JSON with contentDirectory (6-8 posts). Each post: h1, primaryKeyword, sections[{h2,h3s[]}], optional secondaryKeywords and tertiaryKeywords.",
    direction ? `Industry focus: ${direction}` : "",
    opts.refDomain ? `Website: ${opts.refDomain}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
