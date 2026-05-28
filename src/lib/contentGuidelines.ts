import type { ContentGuidelines } from "@/lib/types/businessContext";

const MAX_LINES = 40;

export function parseGuidelineLines(text: string, max = MAX_LINES): string[] {
    return String(text ?? "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, max);
}

export function guidelinesToText(items?: string[]): string {
    return (items ?? []).join("\n");
}

export function normalizeContentGuidelines(
    raw?: ContentGuidelines | null,
): ContentGuidelines | undefined {
    if (!raw) return undefined;
    const dos = (raw.dos ?? []).map((s) => String(s).trim()).filter(Boolean).slice(0, MAX_LINES);
    const donts = (raw.donts ?? []).map((s) => String(s).trim()).filter(Boolean).slice(0, MAX_LINES);
    if (!dos.length && !donts.length) return undefined;
    return { dos, donts };
}

export function parseContentGuidelinesFromDb(
    value: unknown,
): ContentGuidelines | undefined {
    if (!value || typeof value !== "object") return undefined;
    const o = value as Record<string, unknown>;
    return normalizeContentGuidelines({
        dos: Array.isArray(o.dos) ? o.dos.map(String) : [],
        donts: Array.isArray(o.donts) ? o.donts.map(String) : [],
    });
}

export function buildContentGuidelinesFromText(
    dosText: string,
    dontsText: string,
): ContentGuidelines | undefined {
    return normalizeContentGuidelines({
        dos: parseGuidelineLines(dosText),
        donts: parseGuidelineLines(dontsText),
    });
}

/** Prompt block for content-agent, optimize-content, etc. */
export function buildContentGuidelinesPrompt(
    guidelines?: ContentGuidelines | null,
): string {
    const g = normalizeContentGuidelines(guidelines);
    if (!g) return "";

    const lines: string[] = [
        "DOMAIN CONTENT GUIDELINES (account-level — mandatory for every blog on this domain):",
    ];
    if (g.dos?.length) {
        lines.push("DO:");
        for (const rule of g.dos) lines.push(`- ${rule}`);
    }
    if (g.donts?.length) {
        lines.push("DON'T:");
        for (const rule of g.donts) lines.push(`- ${rule}`);
    }
    lines.push(
        "Apply these rules when writing, editing, or optimizing. They override generic SEO habits when they conflict.",
    );
    return lines.join("\n");
}

export function hasContentGuidelines(guidelines?: ContentGuidelines | null): boolean {
    return !!normalizeContentGuidelines(guidelines);
}
