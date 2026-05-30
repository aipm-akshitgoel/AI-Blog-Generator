/**
 * Split markdown into structural units (headings, GFM tables, body) for safe pipeline passes.
 */

export type MarkdownPart =
    | { type: "heading"; text: string }
    | { type: "table"; text: string }
    | { type: "body"; text: string };

export function isMarkdownTableLine(line: string): boolean {
    const t = line.trim();
    return /^\|.+\|$/.test(t);
}

export function isMarkdownTableSeparatorLine(line: string): boolean {
    const t = line.trim();
    return /^\|?[\s|:-]+\|$/.test(t) && /-/.test(t);
}

export function isMarkdownTableBlock(text: string): boolean {
    const lines = String(text || "")
        .trim()
        .split("\n")
        .filter((l) => l.trim());
    if (lines.length < 2) return false;
    if (!isMarkdownTableLine(lines[0]!)) return false;
    if (!lines.some((l) => isMarkdownTableSeparatorLine(l))) return false;
    return lines.every((l) => isMarkdownTableLine(l) || isMarkdownTableSeparatorLine(l));
}

export function splitMarkdownPreservingStructure(markdown: string): MarkdownPart[] {
    const parts: MarkdownPart[] = [];
    const lines = String(markdown || "").split("\n");
    let bodyLines: string[] = [];

    const flushBody = () => {
        const text = bodyLines.join("\n").trim();
        bodyLines = [];
        if (!text) return;
        if (isMarkdownTableBlock(text)) {
            parts.push({ type: "table", text });
        } else {
            parts.push({ type: "body", text });
        }
    };

    let i = 0;
    while (i < lines.length) {
        const line = lines[i]!;
        const trimmed = line.trim();

        if (/^#{1,6}\s+/.test(line)) {
            flushBody();
            parts.push({ type: "heading", text: line });
            i++;
            continue;
        }

        if (isMarkdownTableLine(trimmed)) {
            flushBody();
            const tableLines: string[] = [];
            while (i < lines.length) {
                const l = lines[i]!;
                const lt = l.trim();
                if (!lt) break;
                if (isMarkdownTableLine(lt) || isMarkdownTableSeparatorLine(lt)) {
                    tableLines.push(l);
                    i++;
                } else {
                    break;
                }
            }
            if (tableLines.length >= 2 && isMarkdownTableBlock(tableLines.join("\n"))) {
                parts.push({ type: "table", text: tableLines.join("\n").trim() });
            } else {
                bodyLines.push(...tableLines);
            }
            continue;
        }

        bodyLines.push(line);
        i++;
    }
    flushBody();

    return parts.length > 0 ? parts : [{ type: "body", text: String(markdown || "").trim() }];
}

/**
 * GFM parsers (marked, remark-gfm) require blank lines around table blocks.
 * Models often emit "intro:\n| col |" without spacing — this fixes that.
 */
export function normalizeMarkdownTables(markdown: string): string {
    const lines = String(markdown || "").split("\n");
    const out: string[] = [];
    let i = 0;

    while (i < lines.length) {
        const trimmed = lines[i]!.trim();

        if (isMarkdownTableLine(trimmed)) {
            if (out.length > 0 && out[out.length - 1]!.trim() !== "") {
                out.push("");
            }

            const tableLines: string[] = [];
            while (i < lines.length) {
                const lt = lines[i]!.trim();
                if (!lt) break;
                if (isMarkdownTableLine(lt) || isMarkdownTableSeparatorLine(lt)) {
                    tableLines.push(lines[i]!);
                    i++;
                } else {
                    break;
                }
            }

            if (tableLines.length >= 2 && isMarkdownTableBlock(tableLines.join("\n"))) {
                out.push(...tableLines);
                if (i < lines.length && lines[i]!.trim() !== "") {
                    out.push("");
                }
            } else {
                out.push(...tableLines);
            }
            continue;
        }

        out.push(lines[i]!);
        i++;
    }

    return out.join("\n");
}

/** Split body copy into paragraph/table units (tables stay multi-line blocks). */
export function splitMarkdownBodyBlocks(text: string): string[] {
    const trimmed = String(text || "").trim();
    if (!trimmed) return [];

    const parts = splitMarkdownPreservingStructure(trimmed);
    const blocks: string[] = [];

    for (const part of parts) {
        if (part.type === "table") {
            blocks.push(part.text);
            continue;
        }
        if (part.type === "heading") {
            blocks.push(part.text);
            continue;
        }
        for (const block of part.text.split(/\n\n+/).map((b) => b.trim()).filter(Boolean)) {
            blocks.push(block);
        }
    }

    return blocks;
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function parseTableCells(row: string): string[] {
    return row
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((c) => c.trim());
}

/** Markdown table → HTML for readability API and previews. */
export function markdownTableToHtml(tableMarkdown: string): string {
    const lines = String(tableMarkdown || "")
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && (isMarkdownTableLine(l) || isMarkdownTableSeparatorLine(l)));
    if (lines.length < 2) return "";

    const headerCells = parseTableCells(lines[0]!);
    let bodyStart = 1;
    if (lines[1] && isMarkdownTableSeparatorLine(lines[1])) {
        bodyStart = 2;
    }

    const rows: string[][] = [];
    for (let i = bodyStart; i < lines.length; i++) {
        if (!isMarkdownTableLine(lines[i]!)) continue;
        rows.push(parseTableCells(lines[i]!));
    }

    const thead = `<thead><tr>${headerCells.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}</tr></thead>`;
    const tbody =
        rows.length > 0
            ? `<tbody>${rows
                  .map(
                      (cells) =>
                          `<tr>${cells.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`,
                  )
                  .join("")}</tbody>`
            : "";
    return `<table>${thead}${tbody}</table>`;
}
