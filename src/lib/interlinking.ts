import type { BusinessContext } from "@/lib/types/businessContext";
import type { InterlinkingRules } from "@/lib/types/contentSpec";
import {
    isSameSiteHref,
    normalizeSitePath,
    siteOriginFromDomain,
    toAbsoluteSiteHref,
} from "@/lib/domainLinks";

export type ApprovedLink = {
    href: string;
    anchorText: string;
    target: "blog" | "service" | "page";
};

const MARKDOWN_LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;

const EXTERNAL_LINK_HINT_RE =
    /\b(popular\s+sources?|authoritative|authority\s+sites?|external\s+links?|outbound|outgoing\s+links?|third[- ]party|\.edu\b|wikipedia|government\s+sites?|reputable\s+sources?)\b/i;

export function wantsExternalAuthorityLinks(rules?: InterlinkingRules | null): boolean {
    return EXTERNAL_LINK_HINT_RE.test(rules?.instructions ?? "");
}

export function countMarkdownLinks(markdown: string): number {
    return [...String(markdown || "").matchAll(MARKDOWN_LINK_RE)].length;
}

export function extractLinksFromMarkdown(markdown: string): ApprovedLink[] {
    const seen = new Set<string>();
    const links: ApprovedLink[] = [];
    for (const match of String(markdown || "").matchAll(MARKDOWN_LINK_RE)) {
        const anchorText = match[1]?.trim();
        const href = match[2]?.trim();
        if (!href || !anchorText || seen.has(href)) continue;
        seen.add(href);
        const isExternal = /^https?:\/\//i.test(href);
        links.push({
            href,
            anchorText,
            target: isExternal ? "page" : href.includes("/blog/") ? "blog" : "page",
        });
    }
    return links;
}

function filterToSiteLinks(
    links: ApprovedLink[],
    origin: string | null,
): ApprovedLink[] {
    if (!origin) return [];
    const seen = new Set<string>();
    const out: ApprovedLink[] = [];
    for (const link of links) {
        const path = normalizeSitePath(link.href, origin);
        if (!path || seen.has(path)) continue;
        seen.add(path);
        out.push({
            href: path,
            anchorText: link.anchorText.trim(),
            target: link.target,
        });
    }
    return out;
}

function fallbackLinksFromDomain(
    ctx: Pick<BusinessContext, "domain" | "services" | "businessName"> | null | undefined,
): ApprovedLink[] {
    const origin = siteOriginFromDomain(ctx?.domain);
    if (!origin) return [];

    const name = ctx?.businessName?.trim() || "Home";
    const fallbacks: ApprovedLink[] = [{ href: "/", anchorText: name, target: "page" }];
    for (const service of ctx?.services || []) {
        const label = service.trim();
        if (!label) continue;
        fallbacks.push({
            href: `/services#${label.toLowerCase().replace(/\s+/g, "-")}`,
            anchorText: label,
            target: "service",
        });
    }
    return filterToSiteLinks(fallbacks, origin);
}

/** Approved targets: profile internalLinks + extras (e.g. published blogs). No invented paths. */
export function deriveApprovedLinks(
    ctx: Pick<BusinessContext, "domain" | "internalLinks" | "services" | "businessName"> | null | undefined,
    extra: ApprovedLink[] = [],
): ApprovedLink[] {
    const origin = siteOriginFromDomain(ctx?.domain);
    const combined = [...(ctx?.internalLinks || []), ...extra];
    const filtered = filterToSiteLinks(combined, origin);
    if (filtered.length > 0) return filtered;
    return fallbackLinksFromDomain(ctx);
}

export function buildApprovedLinksForContent(
    _markdown: string,
    ctx: Pick<BusinessContext, "domain" | "internalLinks" | "services" | "businessName"> | null | undefined,
    extra: ApprovedLink[] = [],
): ApprovedLink[] {
    return deriveApprovedLinks(ctx, extra);
}

function splitBodyParagraphs(markdown: string): { paragraphs: string[] } {
    const paragraphs: string[] = [];
    const blocks = String(markdown || "").split(/\n\n+/);

    for (const block of blocks) {
        const trimmed = block.trim();
        if (!trimmed) continue;
        if (/^#{1,6}\s/m.test(trimmed) && !trimmed.includes("\n")) {
            paragraphs.push(trimmed);
            continue;
        }
        const lines = trimmed.split(/\n/).map((l) => l.trim()).filter(Boolean);
        if (lines.length <= 1) {
            paragraphs.push(trimmed);
        } else {
            for (const line of lines) {
                paragraphs.push(line.replace(/^[-*]\s+/, ""));
            }
        }
    }

    return { paragraphs: paragraphs.length ? paragraphs : [""] };
}

function isLinkableParagraph(p: string): boolean {
    const t = p.trim();
    if (!t || t.length < 12) return false;
    if (/^#{1,6}\s/.test(t)) return false;
    if (/^```/.test(t)) return false;
    if (/^>\s/.test(t)) return false;
    return true;
}

function paragraphHasHref(paragraph: string, href: string, domain?: string): boolean {
    const abs = toAbsoluteSiteHref(href, domain);
    const origin = siteOriginFromDomain(domain);
    const path = normalizeSitePath(href, origin);
    if (paragraph.includes(href) || (abs && paragraph.includes(abs))) return true;
    if (path && (paragraph.includes(`](${path})`) || paragraph.includes(path))) return true;
    return false;
}

function paragraphAlreadyHasLink(paragraph: string): boolean {
    return /\[[^\]]+\]\([^)]+\)/.test(paragraph);
}

const GENERIC_ANCHOR_RE =
    /^(home|click here|read more|learn more|view all|here|this page|our site|related on your site)$/i;

const SITE_OWNER_HEADING_RE = /^related on your site$/i;

function humanizeSlugSegment(segment: string): string {
    return segment
        .replace(/[-_]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Reader-facing link label for end-of-article “explore next” bullets (not site-admin copy). */
function userFacingLinkLabel(
    link: ApprovedLink,
    domain?: string,
    businessName?: string,
): string {
    const origin = siteOriginFromDomain(domain);
    const path = normalizeSitePath(link.href, origin) ?? link.href;
    const anchor = link.anchorText.trim();

    const generic =
        !anchor ||
        GENERIC_ANCHOR_RE.test(anchor) ||
        SITE_OWNER_HEADING_RE.test(anchor) ||
        (/^home$/i.test(anchor) && (path === "/" || path === ""));

    if (!generic && anchor.length >= 10 && anchor.split(/\s+/).length >= 2) {
        return anchor;
    }

    const segments = path.split("/").filter(Boolean);
    const brand = businessName?.trim();

    if (segments.length === 0) {
        return brand ? `Explore programs on ${brand}` : "Browse programs and guides";
    }

    const last = segments[segments.length - 1] ?? "";
    const phrase = humanizeSlugSegment(last);
    const pathHint = segments.join("/").toLowerCase();

    if (/^blog$/i.test(last) && segments.length === 1) {
        return "Read more articles and guides";
    }

    if (/\/blog\//i.test(path) || segments[0] === "blog") {
        return phrase.length > 3 ? `Read: ${phrase}` : "Read this article";
    }

    if (/mba|degree|course|program|admission|university|college/i.test(pathHint)) {
        if (segments.length === 1) {
            return `Compare ${phrase} options`;
        }
        return `Compare ${phrase} programs`;
    }

    if (/pricing|plans?|cost/i.test(pathHint)) {
        return "See pricing and plans";
    }

    if (/contact|about|faq|help/i.test(pathHint)) {
        if (/contact/i.test(pathHint)) return "Get in touch";
        if (/about/i.test(pathHint)) return brand ? `About ${brand}` : "About us";
        if (/faq|help/i.test(pathHint)) return "Browse FAQs";
    }

    if (segments.length === 1) {
        return `Explore ${phrase}`;
    }

    return `Learn more about ${phrase}`;
}

function userFacingRelatedSectionHeading(): string {
    return "Explore next";
}

/** Single words that often mean something different in body copy than on a course/URL slug page. */
const AMBIGUOUS_SLUG_WORDS = new Set([
    "infrastructure",
    "support",
    "governance",
    "research",
    "program",
    "programs",
    "course",
    "courses",
    "degree",
    "degrees",
    "management",
    "admission",
    "admissions",
    "overview",
    "about",
    "contact",
    "services",
    "service",
    "resources",
    "resource",
    "guide",
    "guides",
    "fees",
    "fee",
    "placement",
    "placements",
    "curriculum",
    "syllabus",
    "faculty",
    "campus",
    "eligibility",
    "benefits",
    "career",
    "careers",
    "learning",
    "education",
    "university",
    "college",
    "school",
    "student",
    "students",
    "online",
    "mba",
]);

const PATH_TOKEN_STOP_WORDS = new Set([
    "www",
    "http",
    "https",
    "blog",
    "page",
    "post",
    "the",
    "and",
    "for",
    "with",
]);

function humanizeSlug(segment: string): string {
    return segment
        .split(/[-_]+/)
        .filter(Boolean)
        .map((w) => (w.length <= 3 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
        .join(" ");
}

function linkPathSegments(link: ApprovedLink, domain?: string): string[] {
    const origin = siteOriginFromDomain(domain);
    const path =
        normalizeSitePath(toAbsoluteSiteHref(link.href, domain) || link.href, origin) || link.href;
    return path.split("/").filter(Boolean);
}

/** Distinctive tokens from URL + anchor — used to verify the paragraph is about this target page. */
function extractSpecificTopicTokens(link: ApprovedLink, domain?: string): string[] {
    const tokens = new Set<string>();

    for (const seg of linkPathSegments(link, domain)) {
        for (const word of seg.split(/[-_]+/)) {
            const w = word.toLowerCase();
            if (w.length < 4) continue;
            if (PATH_TOKEN_STOP_WORDS.has(w) || AMBIGUOUS_SLUG_WORDS.has(w)) continue;
            tokens.add(w);
        }
    }

    for (const word of link.anchorText.split(/\s+/)) {
        const w = word.replace(/[^a-z0-9]/gi, "").toLowerCase();
        if (w.length < 4) continue;
        if (PATH_TOKEN_STOP_WORDS.has(w) || AMBIGUOUS_SLUG_WORDS.has(w)) continue;
        tokens.add(w);
    }

    return [...tokens];
}

/**
 * Paragraph must mention what the target page is actually about — not a homonym of one slug word.
 * e.g. NAAC "infrastructure" must not link to /online-mba/.../infrastructure/ without Bharati/MBA context.
 */
export function paragraphMatchesLinkContext(
    paragraph: string,
    link: ApprovedLink,
    domain?: string,
): boolean {
    const plain = String(paragraph || "")
        .replace(MARKDOWN_LINK_RE, "$1")
        .toLowerCase();
    if (!plain.trim()) return false;

    const specificTokens = extractSpecificTopicTokens(link, domain);
    if (specificTokens.length > 0) {
        return specificTokens.some((t) => plain.includes(t));
    }

    const anchor = link.anchorText.trim();
    if (!anchor || GENERIC_ANCHOR_RE.test(anchor)) return false;

    const anchorWords = anchor
        .split(/\s+/)
        .map((w) => w.replace(/[^a-z0-9]/gi, "").toLowerCase())
        .filter((w) => w.length >= 3);

    if (anchorWords.length < 2) return false;

    const required = anchorWords.filter(
        (w) => !PATH_TOKEN_STOP_WORDS.has(w) && !AMBIGUOUS_SLUG_WORDS.has(w),
    );
    if (required.length >= 2) {
        return required.every((w) => plain.includes(w));
    }

    return anchorWords.length >= 3 && anchorWords.every((w) => plain.includes(w));
}

function isAmbiguousPhrase(phrase: string): boolean {
    const words = phrase.trim().split(/\s+/);
    return words.length === 1 && AMBIGUOUS_SLUG_WORDS.has(words[0].toLowerCase());
}

/** Body phrases that are too broad to point at a university/specialization URL. */
const GENERIC_BODY_PHRASES = new Set([
    "degree programs",
    "degree program",
    "online learning",
    "online education",
    "higher education",
    "business school",
    "college degree",
    "career goals",
]);

function isGenericBodyPhrase(phrase: string): boolean {
    const p = phrase.trim().toLowerCase();
    if (GENERIC_BODY_PHRASES.has(p)) return true;
    const words = p.split(/\s+/);
    if (words.length === 2 && words.every((w) => AMBIGUOUS_SLUG_WORDS.has(w))) return true;
    return false;
}

function linkPathDepth(link: ApprovedLink, domain?: string): number {
    return linkPathSegments(link, domain).length;
}

/** Program pages like /online-mba/university/finance — not valid for generic anchors. */
function isDeepProgramPath(link: ApprovedLink, domain?: string): boolean {
    const segs = linkPathSegments(link, domain);
    if (segs.length >= 3) return true;
    const path = segs.join("/").toLowerCase();
    if (segs.length >= 2 && /university|college|patil|amity|chandigarh|finance|marketing|human.resource|hr\b|bba|bca|mca/i.test(path)) {
        return true;
    }
    return false;
}

/** Whether this phrase may use the given target URL (generic phrases → homepage or shallow hubs only). */
function linkAllowedForPhrase(phrase: string, link: ApprovedLink, domain?: string): boolean {
    const phraseLower = phrase.trim().toLowerCase();
    const origin = siteOriginFromDomain(domain);
    const path = normalizeSitePath(toAbsoluteSiteHref(link.href, domain) || link.href, origin) ?? "";

    if (isGenericBodyPhrase(phrase)) {
        if (/^degree\s+programs?$/.test(phraseLower) || /^online\s+(learning|education)$/.test(phraseLower) || phraseLower === "higher education") {
            return path === "/" || path === "";
        }
        if (/^mba\s+programs?$/.test(phraseLower) || phraseLower === "online mba") {
            const depth = linkPathDepth(link, domain);
            return depth === 0 || (depth === 1 && /^online-mba$/i.test(linkPathSegments(link, domain)[0] ?? ""));
        }
        return !isDeepProgramPath(link, domain) && linkPathDepth(link, domain) <= 1;
    }

    if (isDeepProgramPath(link, domain)) return false;
    return true;
}

function sortApprovedShallowFirst(links: ApprovedLink[], domain?: string): ApprovedLink[] {
    const origin = siteOriginFromDomain(domain);
    return [...links].sort((a, b) => {
        const da = linkPathDepth(a, domain);
        const db = linkPathDepth(b, domain);
        if (da !== db) return da - db;
        const pa = normalizeSitePath(a.href, origin);
        const pb = normalizeSitePath(b.href, origin);
        if (pa === "/") return -1;
        if (pb === "/") return 1;
        return 0;
    });
}

/** Phrases to search in paragraph text, longest first — multi-word and contextual only. */
function phraseCandidatesForLink(link: ApprovedLink, domain?: string): string[] {
    const segments = linkPathSegments(link, domain);
    const candidates: string[] = [];

    const anchor = link.anchorText.trim();
    if (anchor.length >= 4 && !GENERIC_ANCHOR_RE.test(anchor) && !isAmbiguousPhrase(anchor)) {
        candidates.push(anchor);
        const words = anchor.split(/\s+/);
        if (words.length >= 2) {
            for (let len = Math.min(5, words.length); len >= 2; len--) {
                for (let i = 0; i <= words.length - len; i++) {
                    const phrase = words.slice(i, i + len).join(" ");
                    if (!isAmbiguousPhrase(phrase)) candidates.push(phrase);
                }
            }
        }
    }

    for (let i = 0; i < segments.length; i++) {
        for (let j = i + 2; j <= segments.length; j++) {
            const phrase = segments.slice(i, j).map(humanizeSlug).join(" ");
            if (phrase.length >= 6 && !isAmbiguousPhrase(phrase)) {
                candidates.push(phrase);
            }
        }
    }

    return [...new Set(candidates.map((c) => c.trim()).filter((c) => c.length >= 6))].sort(
        (a, b) => b.length - a.length,
    );
}

/** Match phrase only on whole words (avoids linking "program" inside "programmes"). */
function findWholePhraseInParagraph(
    paragraph: string,
    phrase: string,
): { index: number; length: number } | null {
    const needle = phrase.trim();
    if (!needle || needle.length < 3) return null;

    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = escaped.replace(/\s+/g, "\\s+");
    const re = new RegExp(`(?<![a-z0-9])${pattern}(?![a-z0-9])`, "i");
    const match = re.exec(paragraph);
    if (!match || match.index == null) return null;
    return { index: match.index, length: match[0].length };
}

function rangeOverlapsMarkdownLink(paragraph: string, start: number, end: number): boolean {
    for (const m of paragraph.matchAll(MARKDOWN_LINK_RE)) {
        const idx = m.index ?? -1;
        if (idx < 0) continue;
        const linkEnd = idx + m[0].length;
        if (start < linkEnd && end > idx) return true;
    }
    return false;
}

function insertLinkOnPhrase(paragraph: string, phrase: string, href: string): string | null {
    const needle = phrase.trim();
    if (!needle || needle.length < 3) return null;
    if (paragraph.includes(`](${href})`)) return null;

    const found = findWholePhraseInParagraph(paragraph, needle);
    if (!found) return null;

    const { index: idx, length } = found;
    const before = paragraph.slice(0, idx);
    const match = paragraph.slice(idx, idx + length);
    const after = paragraph.slice(idx + length);

    if (before.endsWith("[") || after.startsWith("](")) return null;
    if (/\[[^\]]*$/.test(before)) return null;
    if (rangeOverlapsMarkdownLink(paragraph, idx, idx + length)) return null;

    return `${before}[${match}](${href})${after}`;
}

function insertLinkContextual(
    paragraph: string,
    link: ApprovedLink,
    domain?: string,
): string | null {
    if (!paragraphMatchesLinkContext(paragraph, link, domain)) return null;

    const href = toAbsoluteSiteHref(link.href, domain);
    for (const phrase of phraseCandidatesForLink(link, domain)) {
        if (isAmbiguousPhrase(phrase)) continue;
        const result = insertLinkOnPhrase(paragraph, phrase, href);
        if (result && paragraphMatchesLinkContext(result, link, domain)) return result;
    }
    return null;
}

const TOPICAL_BRIDGE_TERMS = [
    "degree",
    "degrees",
    "college",
    "university",
    "universities",
    "program",
    "programs",
    "career",
    "mba",
    "accreditation",
    "naac",
    "education",
    "business school",
    "online learning",
];

function paragraphPlainText(paragraph: string): string {
    return String(paragraph || "")
        .replace(MARKDOWN_LINK_RE, "$1")
        .toLowerCase();
}

/** Looser match when enforcing min link counts — still blocks unrelated niche pages. */
function paragraphMatchesLinkForEnforcement(
    paragraph: string,
    link: ApprovedLink,
    domain?: string,
): boolean {
    if (paragraphMatchesLinkContext(paragraph, link, domain)) return true;

    if (isDeepProgramPath(link, domain)) return false;

    const plain = paragraphPlainText(paragraph);
    const pathLower = linkPathSegments(link, domain).join("/").toLowerCase();
    const anchorLower = link.anchorText.toLowerCase();
    const topicalHint = `${pathLower} ${anchorLower}`;

    const linkAboutEducation = /mba|degree|college|university|program|course|education|accreditation|career/i.test(
        topicalHint,
    );
    if (!linkAboutEducation) return false;

    return TOPICAL_BRIDGE_TERMS.some((t) => plain.includes(t));
}

function phraseCandidatesForEnforcement(
    link: ApprovedLink,
    domain: string | undefined,
    paragraph: string,
): string[] {
    const strict = phraseCandidatesForLink(link, domain);
    const plain = paragraphPlainText(paragraph);
    const extra: string[] = [];

    const anchor = link.anchorText.trim();
    const words = anchor.split(/\s+/).filter(Boolean);
    for (let len = 2; len <= Math.min(5, words.length); len++) {
        for (let i = 0; i <= words.length - len; i++) {
            const phrase = words.slice(i, i + len).join(" ");
            if (
                phrase.length >= 4 &&
                !isAmbiguousPhrase(phrase) &&
                plain.includes(phrase.toLowerCase())
            ) {
                extra.push(phrase);
            }
        }
    }

    for (const phrase of [
        "online MBA",
        "MBA program",
        "MBA programs",
        "MBA programmes",
        "degree program",
        "degree programs",
        "degree programme",
        "degree programmes",
        "college degree",
        "career goals",
        "accreditation",
        "NAAC",
        "university",
        "colleges",
    ]) {
        if (plain.includes(phrase.toLowerCase()) && !isAmbiguousPhrase(phrase)) {
            extra.push(phrase);
        }
    }

    return [...new Set([...strict, ...extra])]
        .filter((c) => c.length >= 3 && !isAmbiguousPhrase(c))
        .sort((a, b) => b.length - a.length);
}

function insertLinkForEnforcement(
    paragraph: string,
    link: ApprovedLink,
    domain?: string,
): string | null {
    if (!paragraphMatchesLinkForEnforcement(paragraph, link, domain)) return null;

    const href = toAbsoluteSiteHref(link.href, domain);
    for (const phrase of phraseCandidatesForEnforcement(link, domain, paragraph)) {
        const result = insertLinkOnPhrase(paragraph, phrase, href);
        if (!result) continue;
        if (isAmbiguousPhrase(phrase)) continue;
        if (paragraphMatchesLinkContext(result, link, domain)) return result;
        if (!linkAllowedForPhrase(phrase, link, domain)) continue;
        if (!isDeepProgramPath(link, domain)) return result;
    }
    return null;
}

function appendRelatedLinksBlock(
    markdown: string,
    links: ApprovedLink[],
    domain?: string,
    businessName?: string,
): string {
    if (links.length === 0) return markdown;
    const items = links.map((link) => {
        const href = toAbsoluteSiteHref(link.href, domain);
        const label = userFacingLinkLabel(link, domain, businessName);
        return `- [${label}](${href})`;
    });
    return `${markdown.trimEnd()}\n\n### ${userFacingRelatedSectionHeading()}\n\n${items.join("\n")}`;
}

/** Remove on-site links where the surrounding paragraph does not match the target page topic. */
export function stripContextuallyInvalidLinksFromMarkdown(
    markdown: string,
    approved: ApprovedLink[],
    domain?: string,
): string {
    const origin = siteOriginFromDomain(domain);
    const byPath = new Map<string, ApprovedLink>();
    for (const link of approved) {
        const path = normalizeSitePath(link.href, origin);
        if (path) byPath.set(path, link);
    }

    const paragraphs = splitBodyParagraphs(markdown).paragraphs;
    for (let i = 0; i < paragraphs.length; i++) {
        paragraphs[i] = paragraphs[i].replace(MARKDOWN_LINK_RE, (full, anchor, href) => {
            const path = normalizeSitePath(href, origin);
            const link: ApprovedLink =
                path && byPath.has(path)
                    ? byPath.get(path)!
                    : { href, anchorText: anchor, target: "page" };
            if (isGenericBodyPhrase(anchor) && isDeepProgramPath(link, domain)) return anchor;
            if (!path || !byPath.has(path)) {
                if (paragraphMatchesLinkContext(paragraphs[i], link, domain)) return full;
                return anchor;
            }
            if (paragraphMatchesLinkContext(paragraphs[i], link, domain)) return full;
            return anchor;
        });
    }

    return paragraphs.join("\n\n");
}

/** Rewrite same-site relative markdown links to full https URLs (for editor display). */
export function rewriteMarkdownInternalLinksToAbsolute(
    markdown: string,
    domain?: string,
): string {
    const origin = siteOriginFromDomain(domain);
    if (!origin) return markdown;

    return String(markdown || "").replace(MARKDOWN_LINK_RE, (full, anchor, href) => {
        const path = normalizeSitePath(href, origin);
        if (!path) return full;
        const abs = toAbsoluteSiteHref(path, domain);
        return abs && abs !== href ? `[${anchor}](${abs})` : full;
    });
}

function withAbsoluteHrefs(links: ApprovedLink[], domain?: string): ApprovedLink[] {
    return links.map((l) => ({
        ...l,
        href: toAbsoluteSiteHref(l.href, domain) || l.href,
    }));
}

/**
 * Ensures contentMarkdown meets min/max link counts using approved internal targets only.
 */
export function ensureInternalLinksInMarkdown(
    markdown: string,
    approved: ApprovedLink[],
    rules?: InterlinkingRules | null,
    domain?: string,
    businessName?: string,
): { contentMarkdown: string; injected: ApprovedLink[] } {
    const min =
        rules?.minLinks != null && rules.minLinks > 0 ? Math.round(rules.minLinks) : 0;
    const max =
        rules?.maxLinks != null && rules.maxLinks > 0 ? Math.round(rules.maxLinks) : 0;

    if (!min || approved.length === 0) {
        return { contentMarkdown: markdown, injected: [] };
    }

    const approvedAbs = sortApprovedShallowFirst(withAbsoluteHrefs(approved, domain), domain);
    const injected: ApprovedLink[] = [];
    const paragraphs = splitBodyParagraphs(markdown).paragraphs;
    const linkableIdx = paragraphs
        .map((p, i) => (isLinkableParagraph(p) ? i : -1))
        .filter((i) => i >= 0);

    if (linkableIdx.length === 0) {
        return { contentMarkdown: markdown, injected: [] };
    }

    let count = countMarkdownLinks(markdown);
    let paraCursor = 0;
    const maxAttempts = Math.max(min * 6, linkableIdx.length * approvedAbs.length * 3);

    for (let attempt = 0; attempt < maxAttempts && count < min; attempt++) {
        if (max > 0 && count >= max) break;
        const pIdx = linkableIdx[paraCursor % linkableIdx.length];
        paraCursor++;

        if (paragraphAlreadyHasLink(paragraphs[pIdx])) continue;

        let updated: string | null = null;
        let usedLink: ApprovedLink | null = null;

        for (const link of approvedAbs) {
            if (paragraphHasHref(paragraphs[pIdx], link.href, domain)) continue;
            updated = insertLinkContextual(paragraphs[pIdx], link, domain);
            if (updated) {
                usedLink = link;
                break;
            }
        }
        if (!updated) {
            for (const link of approvedAbs) {
                if (paragraphHasHref(paragraphs[pIdx], link.href, domain)) continue;
                updated = insertLinkForEnforcement(paragraphs[pIdx], link, domain);
                if (updated) {
                    usedLink = link;
                    break;
                }
            }
        }
        if (!updated || !usedLink) continue;

        paragraphs[pIdx] = updated;
        injected.push(usedLink);
        count++;
    }

    let contentMarkdown = rewriteMarkdownInternalLinksToAbsolute(
        paragraphs.join("\n\n"),
        domain,
    );

    if (count < min) {
        const origin = siteOriginFromDomain(domain);
        const usedPaths = new Set<string>();
        for (const match of contentMarkdown.matchAll(MARKDOWN_LINK_RE)) {
            const path = normalizeSitePath(match[2], origin);
            if (path) usedPaths.add(path);
        }
        const remaining = approvedAbs.filter((link) => {
            const path = normalizeSitePath(link.href, origin);
            return path && !usedPaths.has(path);
        });
        if (remaining.length > 0) {
            contentMarkdown = appendRelatedLinksBlock(
                contentMarkdown,
                remaining.slice(0, min - count),
                domain,
                businessName,
            );
            for (const link of remaining.slice(0, min - count)) {
                injected.push(link);
            }
        }
    }

    return { contentMarkdown, injected };
}

/** Remove markdown links whose href is not on the approved list (same site paths only). */
export function stripUnapprovedLinksFromMarkdown(
    markdown: string,
    approved: ApprovedLink[],
    domain?: string,
): string {
    const origin = siteOriginFromDomain(domain);
    const allowed = new Set(approved.map((a) => normalizeSitePath(a.href, origin)).filter(Boolean));
    if (allowed.size === 0) {
        return String(markdown || "").replace(MARKDOWN_LINK_RE, "$1");
    }

    return String(markdown || "").replace(MARKDOWN_LINK_RE, (full, anchor, href) => {
        const path = normalizeSitePath(href, origin);
        if (path && allowed.has(path)) return full;
        if (/^https?:\/\//i.test(href)) return anchor;
        return anchor;
    });
}

/** Apply interlinking rules on the client or server after optimization. */
export function applyInterlinkingToContent(
    markdown: string,
    ctx: Pick<BusinessContext, "domain" | "internalLinks" | "services" | "businessName"> | null | undefined,
    rules: InterlinkingRules | null | undefined,
    extraLinks: ApprovedLink[] = [],
): { contentMarkdown: string; injected: ApprovedLink[] } {
    const approved = buildApprovedLinksForContent(markdown, ctx, extraLinks);
    let normalized = rewriteMarkdownInternalLinksToAbsolute(markdown, ctx?.domain);
    normalized = stripContextuallyInvalidLinksFromMarkdown(normalized, approved, ctx?.domain);
    const { contentMarkdown, injected } = ensureInternalLinksInMarkdown(
        normalized,
        approved,
        rules ?? undefined,
        ctx?.domain,
        ctx?.businessName,
    );
    return { contentMarkdown, injected };
}

export function mergeOptimizedLinks(
    contentMarkdown: string,
    modelLinks: ApprovedLink[] | undefined,
    injected: ApprovedLink[],
    approved: ApprovedLink[],
    domain?: string,
): ApprovedLink[] {
    const origin = siteOriginFromDomain(domain);
    const allowedPaths = new Set(
        approved.map((a) => normalizeSitePath(a.href, origin)).filter(Boolean) as string[],
    );

    const seen = new Set<string>();
    const merged: ApprovedLink[] = [];

    const push = (link: ApprovedLink) => {
        const path = normalizeSitePath(link.href, origin);
        if (!path || !allowedPaths.has(path) || seen.has(path)) return;
        seen.add(path);
        merged.push({ ...link, href: path });
    };

    for (const link of [...(modelLinks || []), ...injected, ...extractLinksFromMarkdown(contentMarkdown)]) {
        if (!isSameSiteHref(link.href, origin)) continue;
        push(link);
    }

    return merged;
}

export function linkCountSummary(
    contentMarkdown: string,
    rules?: InterlinkingRules | null,
): { count: number; min?: number; max?: number; metMin: boolean } {
    const count = countMarkdownLinks(contentMarkdown);
    const min = rules?.minLinks != null && rules.minLinks > 0 ? rules.minLinks : undefined;
    const max = rules?.maxLinks != null && rules.maxLinks > 0 ? rules.maxLinks : undefined;
    return {
        count,
        min,
        max,
        metMin: min == null || count >= min,
    };
}
