/** Domain / site-wide schema types — never generated or published by Bloggie AI. */
export const DOMAIN_LEVEL_SCHEMA_TYPES = new Set([
    "Organization",
    "Corporation",
    "LocalBusiness",
    "WebSite",
    "ProfessionalService",
    "EducationalOrganization",
    "CollegeOrUniversity",
    "HairSalon",
    "BeautySalon",
    "HealthAndBeautyBusiness",
    "Store",
    "Restaurant",
    "FinancialService",
    "LegalService",
    "MedicalOrganization",
]);

/** Allowed page-level schema for a single blog post. */
export const PAGE_LEVEL_SCHEMA_TYPES = new Set([
    "Article",
    "BlogPosting",
    "NewsArticle",
    "FAQPage",
    "BreadcrumbList",
    "WebPage",
]);

function getNodeTypes(node: Record<string, unknown>): string[] {
    const raw = node["@type"];
    if (Array.isArray(raw)) return raw.map(String);
    if (typeof raw === "string") return [raw];
    return [];
}

function isDomainLevelNode(node: Record<string, unknown>): boolean {
    return getNodeTypes(node).some((t) => DOMAIN_LEVEL_SCHEMA_TYPES.has(t));
}

function isPageLevelNode(node: Record<string, unknown>): boolean {
    if (isDomainLevelNode(node)) return false;
    return getNodeTypes(node).some((t) => PAGE_LEVEL_SCHEMA_TYPES.has(t));
}

/**
 * Keeps only page-level JSON-LD (Article/BlogPosting, FAQPage, etc.).
 * Strips Organization, LocalBusiness, WebSite, and other domain-level nodes.
 */
export function extractPageLevelSchemaJsonLd(jsonLd: string): string {
    if (!jsonLd?.trim()) return "{}";
    try {
        const parsed = JSON.parse(jsonLd) as Record<string, unknown>;
        if (Array.isArray(parsed["@graph"])) {
            const graph = (parsed["@graph"] as Record<string, unknown>[]).filter(
                (n) => n && typeof n === "object" && isPageLevelNode(n),
            );
            if (graph.length === 0) return "{}";
            const ctx = parsed["@context"] ?? "https://schema.org";
            if (graph.length === 1) {
                return JSON.stringify({ "@context": ctx, ...graph[0] });
            }
            return JSON.stringify({ "@context": ctx, "@graph": graph });
        }
        if (isPageLevelNode(parsed)) {
            return JSON.stringify(parsed);
        }
        return "{}";
    } catch {
        return "{}";
    }
}

const SCHEMA_REFERENCE_MAX_CHARS = 6_000;

/** Reference skeleton from the last published post — same shape, for prompt consistency. */
export function buildSchemaStructureReference(jsonLd: string): string | null {
    const pageLevel = extractPageLevelSchemaJsonLd(jsonLd);
    if (!pageLevel || pageLevel === "{}") return null;
    const trimmed =
        pageLevel.length <= SCHEMA_REFERENCE_MAX_CHARS
            ? pageLevel
            : `${pageLevel.slice(0, SCHEMA_REFERENCE_MAX_CHARS)}\n…[truncated]`;
    return trimmed;
}
