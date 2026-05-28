import * as XLSX from "xlsx";
import {
    normalizeDirectoryEntry,
    parseH3GroupsForH2s,
} from "@/lib/contentDirectorySections";
import type { ContentDirectoryEntry } from "@/lib/types/strategy";

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/^-|-$/g, "");
}

function parseListCell(raw: string): string[] {
    return String(raw || "")
        .split(/[|;,\n]+/)
        .map((s) => s.trim())
        .filter(Boolean);
}

function cellValue(cell: unknown): string {
    if (cell == null) return "";
    return String(cell).trim();
}

type SheetLayout = "six-column" | "legacy-two-column";

function detectLayout(rows: string[][]): SheetLayout {
    const header = rows[0] || [];
    const a = cellValue(header[0]).toLowerCase();
    const b = cellValue(header[1]).toLowerCase();
    const c = cellValue(header[2]).toLowerCase();

    if (
        a &&
        (a === "h1" || a.includes("topic") || a.includes("heading")) &&
        b &&
        (b.includes("primary") || b === "keyword" || b.includes("main keyword"))
    ) {
        return "six-column";
    }
    if (
        a &&
        (a === "h1" || a.includes("topic")) &&
        b &&
        (b.includes("h2") || b.includes("section"))
    ) {
        return "legacy-two-column";
    }

    const sample = rows.find((row) => cellValue(row[0])) || [];
    const hasWideRow = [2, 3, 4, 5].some((i) => cellValue(sample[i]));
    if (hasWideRow) return "six-column";

    const bVal = cellValue(sample[1]);
    if (bVal && /[|;]/.test(bVal)) return "legacy-two-column";

    return "six-column";
}

function isHeaderRow(row: string[], layout: SheetLayout): boolean {
    const h1 = cellValue(row[0]).toLowerCase();
    if (!h1) return false;
    if (layout === "six-column") {
        const pk = cellValue(row[1]).toLowerCase();
        return (
            h1 === "h1" ||
            h1 === "heading 1" ||
            (h1.includes("topic") && h1.includes("h1")) ||
            pk === "primary keyword" ||
            pk === "primary" ||
            pk.includes("primary keyword")
        );
    }
    const h2 = cellValue(row[1]).toLowerCase();
    return (
        h1 === "h1" ||
        h1 === "heading 1" ||
        (h1.includes("topic") && h1.includes("h1")) ||
        h2 === "h2" ||
        h2.includes("section")
    );
}

function mergeEntryFields(existing: ContentDirectoryEntry, incoming: ContentDirectoryEntry): void {
    Object.assign(
        existing,
        normalizeDirectoryEntry({
            ...existing,
            primaryKeyword: incoming.primaryKeyword || existing.primaryKeyword,
            h2s: [...new Set([...(existing.h2s ?? []), ...(incoming.h2s ?? [])])],
            h3s: [...new Set([...(existing.h3s ?? []), ...(incoming.h3s ?? [])])],
            secondaryKeywords: [
                ...new Set([...(existing.secondaryKeywords ?? []), ...(incoming.secondaryKeywords ?? [])]),
            ],
            tertiaryKeywords: [
                ...new Set([...(existing.tertiaryKeywords ?? []), ...(incoming.tertiaryKeywords ?? [])]),
            ],
        }),
    );
}

function rowToEntry(row: string[], order: number, layout: SheetLayout): ContentDirectoryEntry | null {
    const h1Raw = cellValue(row[0]);
    if (!h1Raw) return null;

    if (layout === "legacy-two-column") {
        const h2Raw = cellValue(row[1]);
        return normalizeDirectoryEntry({
            id: `dir-${order}-${slugify(h1Raw).slice(0, 48) || order}`,
            order,
            h1: h1Raw,
            h2s: parseListCell(h2Raw),
        });
    }

    const primaryKeyword = cellValue(row[1]);
    const h2Raw = cellValue(row[2]);
    const secondaryRaw = cellValue(row[3]);
    const h3Raw = cellValue(row[4]);
    const tertiaryRaw = cellValue(row[5]);

    const secondaryKeywords = parseListCell(secondaryRaw);
    const tertiaryKeywords = parseListCell(tertiaryRaw);
    const h2s = parseListCell(h2Raw);
    const h3Groups = parseH3GroupsForH2s(h3Raw, h2s.length);
    const sections = h2s.map((h2, i) => ({ h2, h3s: h3Groups[i] ?? [] }));

    return normalizeDirectoryEntry({
        id: `dir-${order}-${slugify(h1Raw).slice(0, 48) || order}`,
        order,
        h1: h1Raw,
        primaryKeyword: primaryKeyword || undefined,
        sections,
        h2s,
        ...(secondaryKeywords.length ? { secondaryKeywords } : {}),
        ...(tertiaryKeywords.length ? { tertiaryKeywords } : {}),
    });
}

/**
 * Parse a content directory spreadsheet.
 *
 * **Six-column (preferred):** A = H1, B = primary keyword (required), C = H2s, D = secondary keywords,
 * E = H3s per H2 (`|` between H2 groups, `;` or `,` within a group), F = tertiary keywords.
 *
 * **Legacy two-column:** A = H1, B = H2s — primary keyword must be supplied elsewhere.
 */
export function parseKeywordPlanRows(rows: string[][]): ContentDirectoryEntry[] {
    const layout = detectLayout(rows);
    const entries: ContentDirectoryEntry[] = [];
    const seenH1 = new Set<string>();

    let order = 0;
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i] || [];
        if (isHeaderRow(row, layout)) continue;

        const entry = rowToEntry(row, order, layout);
        if (!entry) continue;

        const norm = entry.h1.toLowerCase();
        if (seenH1.has(norm)) {
            const existing = entries.find((e) => e.h1.toLowerCase() === norm);
            if (existing) mergeEntryFields(existing, entry);
            continue;
        }
        seenH1.add(norm);
        entries.push(entry);
        order += 1;
    }

    return entries;
}

export function validateDirectoryEntries(
    entries: ContentDirectoryEntry[],
    layout: SheetLayout,
): string | null {
    if (entries.length === 0) {
        return "No H1 topics found. Use column A for H1 (one blog topic per row).";
    }
    if (layout === "legacy-two-column") return null;

    const missing = entries.filter((e) => !e.primaryKeyword?.trim());
    if (missing.length > 0) {
        const examples = missing
            .slice(0, 3)
            .map((e) => `#${e.order + 1} "${e.h1}"`)
            .join(", ");
        return `Primary keyword is required in column B for every row. Missing for: ${examples}${missing.length > 3 ? ` (+${missing.length - 3} more)` : ""}.`;
    }
    return null;
}

export async function parseKeywordPlanFile(file: File): Promise<ContentDirectoryEntry[]> {
    const name = file.name.toLowerCase();
    const buf = await file.arrayBuffer();

    let rows: string[][];

    if (name.endsWith(".csv") || name.endsWith(".tsv") || file.type.includes("csv")) {
        const text = new TextDecoder().decode(buf);
        const delimiter = name.endsWith(".tsv") || text.includes("\t") ? "\t" : ",";
        rows = text
            .split(/\r?\n/)
            .map((line) => line.split(delimiter).map((c) => c.trim().replace(/^"|"$/g, "")));
    } else {
        const workbook = XLSX.read(buf, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
            throw new Error("The spreadsheet has no sheets.");
        }
        const sheet = workbook.Sheets[sheetName];
        rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, {
            header: 1,
            defval: "",
            raw: false,
        }) as string[][];
    }

    const layout = detectLayout(rows);
    const entries = parseKeywordPlanRows(rows);
    const validationError = validateDirectoryEntries(entries, layout);
    if (validationError) {
        throw new Error(validationError);
    }
    return entries;
}
