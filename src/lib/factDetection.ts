import type { FactSource } from "@/lib/types/factSource";

/** Detect factual claims in draft markdown for inline editor citations. */
export function autoDetectFactSources(markdown: string): FactSource[] {
    const content = String(markdown || "");
    if (!content.trim()) return [];

    const found: FactSource[] = [];
    const usedExcerpts = new Set<string>();

    const add = (excerpt: string, source: string, url?: string) => {
        const trimmed = excerpt.replace(/\s+/g, " ").trim();
        if (trimmed.length < 6 || trimmed.length > 220) return;
        const key = trimmed.toLowerCase();
        if (usedExcerpts.has(key)) return;
        if (!content.includes(trimmed) && !content.toLowerCase().includes(key)) return;
        usedExcerpts.add(key);
        found.push({
            id: `auto-${found.length + 1}`,
            excerpt: trimmed,
            source,
            url,
        });
    };

    const sentences = content.split(/(?<=[.!?])\s+|\n+/).filter((s) => s.trim().length > 12);

    for (const sentence of sentences) {
        const s = sentence.replace(/^#+\s*/, "").trim();
        if (!s) continue;

        const hasCurrency = /₹|\bINR\b|\bUSD\b|\$\d/i.test(s);
        const hasPercent = /\d+(?:\.\d+)?\s*%/.test(s);
        const hasYear = /\b20[2-3]\d\b/.test(s);
        const hasStat = /\b\d{1,3}(?:,\d{3})+\b/.test(s);
        const hasFactKeyword =
            /\b(fees?|tuition|costs?|salary|package|eligibility|admission|duration|months?|years?|ugc|aicte|accredited|accreditation|placement|roi|semester|minimum|maximum|criteria|requirements?)\b/i.test(
                s,
            );

        if (hasCurrency || hasPercent || (hasYear && hasFactKeyword) || (hasStat && hasFactKeyword)) {
            let source = "Program / industry reference";
            if (/\bfees?|tuition|costs?\b/i.test(s)) source = "Fee & cost data";
            else if (/\beligibility|admission|criteria|requirements?\b/i.test(s)) source = "Eligibility criteria";
            else if (/\bugc|aicte|accredit/i.test(s)) source = "Regulatory / accreditation";
            else if (/\bsalary|package|placement|roi\b/i.test(s)) source = "Career outcomes";
            add(s, source);
        }
    }

    const phrasePatterns: Array<{ re: RegExp; source: string }> = [
        { re: /₹[\d,]+(?:\s*(?:lakhs?|lakh|crores?|cr))?[^.]{0,40}/gi, source: "Fee & cost data" },
        { re: /\b\d+(?:\.\d+)?\s*(?:%|percent)\b[^.]{0,30}/gi, source: "Statistical reference" },
        { re: /\b20[2-3]\d\b[^.]{0,50}/gi, source: "Current year reference" },
        { re: /\b(?:fees?|tuition)\b[^.]{0,70}/gi, source: "Fee & cost data" },
        { re: /\beligibility\b[^.]{0,90}/gi, source: "Eligibility criteria" },
        { re: /\bUGC[\s-]*(?:approved|recognition|entitled)[^.]{0,60}/gi, source: "UGC guidelines" },
    ];

    for (const { re, source } of phrasePatterns) {
        for (const match of content.matchAll(re)) {
            add(match[0], source);
            if (found.length >= 20) break;
        }
        if (found.length >= 20) break;
    }

    return found.slice(0, 18);
}
