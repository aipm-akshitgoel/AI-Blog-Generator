import * as XLSX from "xlsx";
import type { ContentDirectoryEntry } from "@/lib/types/strategy";

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/^-|-$/g, "");
}

function parseH2Cell(raw: string): string[] {
    return String(raw || "")
        .split(/[|;,\n]+/)
        .map((s) => s.trim())
        .filter(Boolean);
}

function cellValue(cell: unknown): string {
    if (cell == null) return "";
    return String(cell).trim();
}

/**
 * Parse a 2-column sheet: col A = H1 (blog topic), col B = H2s (comma/semicolon/pipe separated).
 * Rows with empty H1 are skipped. H1 order in file = blog priority.
 */
export function parseKeywordPlanRows(rows: string[][]): ContentDirectoryEntry[] {
    const entries: ContentDirectoryEntry[] = [];
    const seenH1 = new Set<string>();

    let order = 0;
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i] || [];
        const h1Raw = cellValue(row[0]);
        const h2Raw = cellValue(row[1]);

        if (!h1Raw) continue;

        const lower = h1Raw.toLowerCase();
        if (
            i === 0 &&
            (lower === "h1" ||
                lower === "heading 1" ||
                (lower.includes("topic") && lower.includes("h1")))
        ) {
            continue;
        }

        const norm = h1Raw.toLowerCase();
        if (seenH1.has(norm)) {
            const existing = entries.find((e) => e.h1.toLowerCase() === norm);
            if (existing && h2Raw) {
                const extra = parseH2Cell(h2Raw);
                existing.h2s = [...new Set([...existing.h2s, ...extra])];
            }
            continue;
        }
        seenH1.add(norm);

        entries.push({
            id: `dir-${order}-${slugify(h1Raw).slice(0, 48) || order}`,
            order,
            h1: h1Raw,
            h2s: parseH2Cell(h2Raw),
        });
        order += 1;
    }

    return entries;
}

export async function parseKeywordPlanFile(file: File): Promise<ContentDirectoryEntry[]> {
    const name = file.name.toLowerCase();
    const buf = await file.arrayBuffer();

    if (name.endsWith(".csv") || name.endsWith(".tsv") || file.type.includes("csv")) {
        const text = new TextDecoder().decode(buf);
        const delimiter = name.endsWith(".tsv") || text.includes("\t") ? "\t" : ",";
        const rows = text
            .split(/\r?\n/)
            .map((line) => line.split(delimiter).map((c) => c.trim().replace(/^"|"$/g, "")));
        return parseKeywordPlanRows(rows);
    }

    const workbook = XLSX.read(buf, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
        throw new Error("The spreadsheet has no sheets.");
    }
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, {
        header: 1,
        defval: "",
        raw: false,
    }) as string[][];
    return parseKeywordPlanRows(rows);
}
