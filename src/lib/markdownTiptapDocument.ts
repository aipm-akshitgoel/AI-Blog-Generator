import type { Extensions, JSONContent } from "@tiptap/core";
import { generateJSON } from "@tiptap/html";
import { marked } from "marked";
import { wrapTableCellsForTipTap } from "@/lib/markdownHtml";
import {
    isMarkdownTableBlock,
    isMarkdownTableLine,
    isMarkdownTableSeparatorLine,
    normalizeMarkdownTables,
    splitMarkdownPreservingStructure,
} from "@/lib/markdownStructure";

function parseTableCells(row: string): string[] {
    return row
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((c) => c.trim());
}

function parseGfmTableRows(tableMarkdown: string): { header: string[]; body: string[][] } | null {
    const lines = String(tableMarkdown || "")
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && (isMarkdownTableLine(l) || isMarkdownTableSeparatorLine(l)));
    if (lines.length < 2 || !isMarkdownTableBlock(lines.join("\n"))) return null;

    const header = parseTableCells(lines[0]!);
    let bodyStart = 1;
    if (lines[1] && isMarkdownTableSeparatorLine(lines[1])) {
        bodyStart = 2;
    }

    const body: string[][] = [];
    for (let i = bodyStart; i < lines.length; i++) {
        if (!isMarkdownTableLine(lines[i]!)) continue;
        body.push(parseTableCells(lines[i]!));
    }

    return { header, body };
}

function cellParagraph(text: string): JSONContent {
    const t = text.trim();
    return {
        type: "paragraph",
        content: t ? [{ type: "text", text: t }] : [],
    };
}

/** Build a native TipTap table node (reliable vs HTML import). */
export function markdownTableToTiptapJson(tableMarkdown: string): JSONContent | null {
    const parsed = parseGfmTableRows(tableMarkdown);
    if (!parsed || parsed.header.length === 0) return null;

    const headerRow: JSONContent = {
        type: "tableRow",
        content: parsed.header.map((text) => ({
            type: "tableHeader",
            content: [cellParagraph(text)],
        })),
    };

    const bodyRows: JSONContent[] = parsed.body.map((cells) => ({
        type: "tableRow",
        content: cells.map((text) => ({
            type: "tableCell",
            content: [cellParagraph(text)],
        })),
    }));

    return {
        type: "table",
        content: [headerRow, ...bodyRows],
    };
}

/**
 * Markdown → TipTap document JSON. Tables are built as real table nodes, not HTML import.
 */
export async function markdownToTiptapDocument(
    markdown: string,
    extensions: Extensions,
): Promise<JSONContent> {
    const normalized = normalizeMarkdownTables(String(markdown || ""));
    const parts = splitMarkdownPreservingStructure(normalized);
    const docContent: JSONContent[] = [];

    for (const part of parts) {
        if (part.type === "table") {
            const tableNode = markdownTableToTiptapJson(part.text);
            if (tableNode) {
                docContent.push(tableNode);
            } else {
                const html = wrapTableCellsForTipTap(
                    `<p>${part.text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`,
                );
                const fragment = generateJSON(html, extensions);
                if (fragment.content?.length) docContent.push(...fragment.content);
            }
            continue;
        }

        if (part.type === "heading") {
            const m = part.text.match(/^(#{1,6})\s+(.+?)\s*$/);
            if (m) {
                docContent.push({
                    type: "heading",
                    attrs: { level: m[1].length },
                    content: [{ type: "text", text: m[2].trim() }],
                });
            }
            continue;
        }

        const text = part.text.trim();
        if (!text) continue;

        const html = wrapTableCellsForTipTap(String(await marked.parse(text)));
        const fragment = generateJSON(html, extensions);
        if (fragment.content?.length) {
            docContent.push(...fragment.content);
        }
    }

    return {
        type: "doc",
        content: docContent.length > 0 ? docContent : [{ type: "paragraph" }],
    };
}

export function tiptapDocumentHasTable(doc: JSONContent): boolean {
    let found = false;
    const walk = (node: JSONContent | undefined) => {
        if (!node || found) return;
        if (node.type === "table") {
            found = true;
            return;
        }
        node.content?.forEach(walk);
    };
    walk(doc);
    return found;
}
