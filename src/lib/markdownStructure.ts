/**
 * Split markdown into structural units (headings, GFM tables, body) for safe pipeline passes.
 */

export type MarkdownPart =
    | { type: "heading"; text: string }
    | { type: "table"; text: string }
    | { type: "body"; text: string };

export function isMarkdownTableLine(line: string): boolean {
    const t = line.trim();
    if (/^\|.+\|$/.test(t)) return true;
    // Models sometimes omit the trailing pipe on a row.
    if (/^\|/.test(t) && t.split("|").filter((c) => c.trim()).length >= 2) return true;
    return false;
}

/** Row looks like a GFM table line (pipes, not a separator). */
export function looksLikeMarkdownTableRow(line: string): boolean {
    const t = line.trim();
    if (!t || isMarkdownTableSeparatorLine(t)) return false;
    return isMarkdownTableLine(t);
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

        if (looksLikeMarkdownTableRow(trimmed) || isMarkdownTableSeparatorLine(trimmed)) {
            flushBody();
            const tableLines: string[] = [];
            while (i < lines.length) {
                const l = lines[i]!;
                const lt = l.trim();
                if (!lt) break;
                if (looksLikeMarkdownTableRow(lt) || isMarkdownTableSeparatorLine(lt)) {
                    tableLines.push(l);
                    i++;
                } else {
                    break;
                }
            }
            const joined = tableLines.join("\n");
            const repaired = isMarkdownTableBlock(joined) ? joined.trim() : repairMarkdownTableBlock(joined);
            if (repaired && isMarkdownTableBlock(repaired)) {
                parts.push({ type: "table", text: repaired });
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

function normalizeMarkdownTableRow(line: string): string {
    let t = line.trim();
    if (!t.startsWith("|")) t = `| ${t}`;
    if (!t.endsWith("|")) t = `${t} |`;
    return t;
}

function buildMarkdownTableSeparator(columnCount: number): string {
    const n = Math.max(columnCount, 1);
    return `|${Array.from({ length: n }, () => " --- ").join("|")}|`;
}

/** Ensure header + separator + body rows; normalize pipes on each row. */
export function repairMarkdownTableBlock(tableMarkdown: string): string {
    const rawLines = String(tableMarkdown || "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
    if (rawLines.length === 0) return "";

    const lines = rawLines.filter(
        (l) => looksLikeMarkdownTableRow(l) || isMarkdownTableSeparatorLine(l),
    );
    if (lines.length === 0) return tableMarkdown.trim();

    const normalizedRows = lines
        .filter((l) => looksLikeMarkdownTableRow(l))
        .map(normalizeMarkdownTableRow);
    if (normalizedRows.length === 0) return tableMarkdown.trim();

    const header = normalizedRows[0]!;
    const body = normalizedRows.slice(1);
    const colCount = parseTableCells(header).length;
    const separator = buildMarkdownTableSeparator(colCount);

    return [header, separator, ...body].join("\n");
}

/**
 * GFM requires contiguous table rows (no blank lines between them). Optimizer / humanize
 * passes often insert \\n\\n between rows, which makes remark-gfm render each row as a paragraph.
 */
export function compactMarkdownTableBlocks(markdown: string): string {
    const lines = String(markdown || "").split("\n");
    const out: string[] = [];
    let i = 0;

    while (i < lines.length) {
        const trimmed = lines[i]!.trim();

        if (looksLikeMarkdownTableRow(trimmed) || isMarkdownTableSeparatorLine(trimmed)) {
            const tableLines: string[] = [];
            while (i < lines.length) {
                const lt = lines[i]!.trim();
                if (!lt) {
                    i++;
                    continue;
                }
                if (looksLikeMarkdownTableRow(lt) || isMarkdownTableSeparatorLine(lt)) {
                    tableLines.push(lt);
                    i++;
                } else {
                    break;
                }
            }

            const repaired = repairMarkdownTableBlock(tableLines.join("\n"));
            if (repaired && isMarkdownTableBlock(repaired)) {
                if (out.length > 0 && out[out.length - 1]!.trim() !== "") out.push("");
                out.push(...repaired.split("\n"));
                if (i < lines.length && lines[i]!.trim() !== "") out.push("");
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

/**
 * GFM parsers (marked, remark-gfm) require blank lines around table blocks.
 * Models often emit "intro:\n| col |" without spacing — this fixes that.
 */
export function normalizeMarkdownTables(markdown: string): string {
    const compacted = compactMarkdownTableBlocks(String(markdown || ""));
    const lines = compacted.split("\n");
    const out: string[] = [];
    let i = 0;

    while (i < lines.length) {
        const trimmed = lines[i]!.trim();

        if (looksLikeMarkdownTableRow(trimmed) || isMarkdownTableSeparatorLine(trimmed)) {
            if (out.length > 0 && out[out.length - 1]!.trim() !== "") {
                out.push("");
            }

            const tableLines: string[] = [];
            while (i < lines.length) {
                const lt = lines[i]!.trim();
                if (!lt) break;
                if (looksLikeMarkdownTableRow(lt) || isMarkdownTableSeparatorLine(lt)) {
                    tableLines.push(lines[i]!);
                    i++;
                } else {
                    break;
                }
            }

            const joined = tableLines.join("\n");
            const repaired = isMarkdownTableBlock(joined) ? joined : repairMarkdownTableBlock(joined);

            if (repaired && isMarkdownTableBlock(repaired)) {
                out.push(...repaired.split("\n"));
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

/** Links and emphasis inside table cells (from model output). */
function renderTableCellInlineMarkdown(text: string): string {
    let html = escapeHtml(text.trim());
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, href) => {
        const safeHref = String(href).replace(/"/g, "%22");
        return `<a href="${safeHref}">${escapeHtml(String(label))}</a>`;
    });
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    return html;
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

    const thead = `<thead><tr>${headerCells.map((c) => `<th>${renderTableCellInlineMarkdown(c)}</th>`).join("")}</tr></thead>`;
    const tbody =
        rows.length > 0
            ? `<tbody>${rows
                  .map(
                      (cells) =>
                          `<tr>${cells.map((c) => `<td>${renderTableCellInlineMarkdown(c)}</td>`).join("")}</tr>`,
                  )
                  .join("")}</tbody>`
            : "";
    return `<table>${thead}${tbody}</table>`;
}
