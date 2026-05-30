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
