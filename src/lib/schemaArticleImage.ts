import type { SchemaData } from "@/lib/types/schema";
import { toAbsolutePublicUrl } from "@/lib/publicSiteUrl";
import { isCrawlerFriendlyImageUrl } from "@/lib/publicSiteUrl";

const ARTICLE_TYPES = new Set(["Article", "BlogPosting", "NewsArticle"]);

function imageValue(url: string, altText?: string) {
    const absolute = toAbsolutePublicUrl(url);
    if (altText?.trim()) {
        return { "@type": "ImageObject", url: absolute, caption: altText.trim() };
    }
    return absolute;
}

function applyImageToArticleNode(node: Record<string, unknown>, imageUrl: string, altText?: string) {
    if (!ARTICLE_TYPES.has(String(node["@type"] ?? ""))) return;
    node.image = imageValue(imageUrl, altText);
}

/** Ensures Article/BlogPosting JSON-LD includes a crawlable hero image URL. */
export function injectSchemaArticleImage(
    schema: SchemaData,
    imageUrl: string,
    altText?: string,
): SchemaData {
    if (!schema?.jsonLd?.trim() || !imageUrl?.trim() || !isCrawlerFriendlyImageUrl(toAbsolutePublicUrl(imageUrl))) {
        return schema;
    }

    try {
        const parsed = JSON.parse(schema.jsonLd) as Record<string, unknown>;
        if (Array.isArray(parsed["@graph"])) {
            for (const node of parsed["@graph"] as Record<string, unknown>[]) {
                applyImageToArticleNode(node, imageUrl, altText);
            }
        } else {
            applyImageToArticleNode(parsed, imageUrl, altText);
        }
        return { ...schema, jsonLd: JSON.stringify(parsed) };
    } catch {
        return schema;
    }
}
