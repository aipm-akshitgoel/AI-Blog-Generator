import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import type { OptimizedContent } from "@/lib/types/optimization";
import type { BusinessContext } from "@/lib/types/businessContext";
import type { MetaOption } from "@/lib/types/meta";
import type { SchemaData } from "@/lib/types/schema";
import type { ImageMetadata } from "@/lib/types/image";
import { injectSchemaArticleImage } from "@/lib/schemaArticleImage";
import { getLastPublishedBlogByUserId } from "@/lib/blogDb";
import {
    buildSchemaStructureReference,
    extractPageLevelSchemaJsonLd,
} from "@/lib/pageSchema";
import type { SeoDefaults } from "@/lib/types/businessContext";
import { sanitizeJsonString } from "@/lib/sanitizeJson";
import { assistantMessageText, azureConfigDebug, createAzureClient, getAzureConfig, stripOuterMarkdownFence } from "@/lib/azureOpenAI";

const SYSTEM_PROMPT = `You are an expert technical SEO specialist. Generate PAGE-LEVEL JSON-LD only for a single blog post.

ALLOWED @type values: BlogPosting (preferred), Article, NewsArticle, FAQPage (when FAQs exist and enabled), BreadcrumbList (optional).
NEVER include domain-level or site-wide schema: Organization, LocalBusiness, WebSite, Corporation, EducationalOrganization, or any business/brand entity. Those are managed on the customer's domain separately — not by this tool.

If a REFERENCE STRUCTURE from a previous published post is provided, match its JSON shape (@graph layout if used, node @type values, property keys) while filling all values from the CURRENT post.

Return ONLY valid JSON matching this wrapper:
{
  "type": "BlogPosting",
  "jsonLd": "{ ... stringified JSON-LD object ... }",
  "validationStatus": "valid"
}
The jsonLd field must be an escaped JSON string of the JSON-LD object (use @context https://schema.org).`;

export async function POST(req: Request) {
    const azure = getAzureConfig();
    if (!azure) {
        return NextResponse.json({ error: "Azure OpenAI is not configured on the server", debug: azureConfigDebug() }, { status: 500 });
    }

    let body: {
        optimizedContent?: OptimizedContent;
        businessContext?: BusinessContext;
        meta?: MetaOption;
        seoDefaults?: SeoDefaults;
        images?: ImageMetadata;
        customPrompt?: string;
    };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { optimizedContent, businessContext, meta, seoDefaults, images, customPrompt } = body;
    if (!optimizedContent || !businessContext || !meta) {
        return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    try {
        const { userId } = await auth();
        let referenceStructure: string | null = null;
        let referencePostTitle: string | null = null;

        if (userId) {
            const lastPublished = await getLastPublishedBlogByUserId(userId);
            if (lastPublished?.payload?.schema?.jsonLd) {
                referenceStructure = buildSchemaStructureReference(lastPublished.payload.schema.jsonLd);
                if (referenceStructure) {
                    referencePostTitle = lastPublished.title;
                }
            }
        }

        const client = createAzureClient(azure);
        const bannerHint = images?.bannerImageUrl?.trim()
            ? `\nHero image URL (use as Article/BlogPosting "image" when crawlable HTTPS): ${images.bannerImageUrl.trim()}`
            : "";

        const customHint = customPrompt?.trim()
            ? `\n\nPublisher schema instructions (apply in addition to page-level rules):\n${customPrompt.trim()}`
            : "";

        const referenceHint = referenceStructure
            ? `\n\nREFERENCE STRUCTURE (from last published post${referencePostTitle ? `: "${referencePostTitle}"` : ""} on this account — match this shape for the new post):\n${referenceStructure}`
            : "\n\nNo previous published post on this account — use a standard BlogPosting + optional FAQPage layout.";

        const prompt = `Business Name: ${businessContext.businessName}
Industry: ${businessContext.businessType}
Target Audience: ${businessContext.targetAudience}

Blog Title: ${meta.title}
Meta Description: ${meta.description}${bannerHint}

Content:
${optimizedContent.contentMarkdown}

FAQs:
${JSON.stringify(optimizedContent.faqs ?? [])}

SEO Defaults:
${JSON.stringify(seoDefaults || {}, null, 2)}

Preferred schema type: ${seoDefaults?.defaultSchemaType || "BlogPosting"}
Include FAQ schema by default: ${seoDefaults?.includeFaqSchemaByDefault ?? true}
Page URL path (for @id/mainEntityOfPage): /blog/${optimizedContent.slug || "post"}${referenceHint}${customHint}`;

        const response = await client.chat.completions.create({
            model: azure.deployment,
            max_completion_tokens: 2200,
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: prompt },
            ],
        });
        const text = assistantMessageText((response as any)?.choices?.[0]?.message?.content);
        const clean = sanitizeJsonString(stripOuterMarkdownFence(text));

        let payload: SchemaData = JSON.parse(clean);
        payload = {
            ...payload,
            jsonLd: extractPageLevelSchemaJsonLd(payload.jsonLd),
            validationStatus: "valid",
        };

        if (images?.bannerImageUrl) {
            payload = injectSchemaArticleImage(payload, images.bannerImageUrl, images.altText);
            payload = {
                ...payload,
                jsonLd: extractPageLevelSchemaJsonLd(payload.jsonLd),
            };
        }

        return NextResponse.json(
            {
                schemaData: payload,
                usedReferenceFrom: referencePostTitle,
            },
            { status: 200 },
        );
    } catch (err) {
        const message = err instanceof Error ? err.message : "Schema generation failed";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
