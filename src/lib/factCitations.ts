import type { Node as ProseMirrorNode } from "prosemirror-model";
import type { FactSource } from "@/lib/types/factSource";

export type ResolvedFactSource = FactSource & { start: number; end: number };

export type AnnotatedSegment =
    | { type: "text"; value: string }
    | { type: "cited"; excerpt: string; source: ResolvedFactSource; index: number };

function normalizeForSearch(text: string): string {
    return text.replace(/\s+/g, " ").trim().toLowerCase();
}

export function resolveSourcePositions(
    content: string,
    sources: FactSource[],
): ResolvedFactSource[] {
    const resolved: ResolvedFactSource[] = [];
    const usedRanges: Array<{ start: number; end: number }> = [];

    const overlaps = (start: number, end: number) =>
        usedRanges.some((r) => start < r.end && end > r.start);

    for (const source of sources) {
        let start = source.startIndex;
        let end = source.endIndex;

        if (
            start != null &&
            end != null &&
            start >= 0 &&
            end > start &&
            end <= content.length &&
            content.slice(start, end) === source.excerpt
        ) {
            if (!overlaps(start, end)) {
                resolved.push({ ...source, start, end });
                usedRanges.push({ start, end });
            }
            continue;
        }

        const idx = content.indexOf(source.excerpt);
        if (idx >= 0) {
            const endIdx = idx + source.excerpt.length;
            if (!overlaps(idx, endIdx)) {
                resolved.push({ ...source, start: idx, end: endIdx });
                usedRanges.push({ start: idx, end: endIdx });
            }
            continue;
        }

        const normContent = normalizeForSearch(content);
        const normExcerpt = normalizeForSearch(source.excerpt);
        if (normExcerpt.length < 8) continue;
        const normIdx = normContent.indexOf(normExcerpt);
        if (normIdx < 0) continue;

        const before = content.slice(0, normIdx);
        const roughStart = before.length;
        const roughEnd = roughStart + source.excerpt.length;
        if (!overlaps(roughStart, roughEnd)) {
            resolved.push({ ...source, start: roughStart, end: roughEnd });
            usedRanges.push({ start: roughStart, end: roughEnd });
        }
    }

    return resolved.sort((a, b) => a.start - b.start);
}

export function buildAnnotatedSegments(
    content: string,
    sources: FactSource[],
): AnnotatedSegment[] {
    const positioned = resolveSourcePositions(content, sources);
    if (positioned.length === 0) {
        return content ? [{ type: "text", value: content }] : [];
    }

    const segments: AnnotatedSegment[] = [];
    let cursor = 0;

    positioned.forEach((source, i) => {
        if (source.start > cursor) {
            segments.push({ type: "text", value: content.slice(cursor, source.start) });
        }
        if (source.start >= cursor) {
            segments.push({
                type: "cited",
                excerpt: content.slice(source.start, source.end),
                source,
                index: i + 1,
            });
            cursor = source.end;
        }
    });

    if (cursor < content.length) {
        segments.push({ type: "text", value: content.slice(cursor) });
    }

    return segments;
}

/** Map a plain-text offset in the editor document to a ProseMirror position. */
function buildDocTextIndex(doc: ProseMirrorNode): { text: string; posAt: number[] } {
    const chars: string[] = [];
    const posAt: number[] = [];
    doc.nodesBetween(0, doc.content.size, (node, pos) => {
        if (!node.isText || !node.text) return;
        for (let i = 0; i < node.text.length; i++) {
            chars.push(node.text[i]);
            posAt.push(pos + i);
        }
    });
    return { text: chars.join(""), posAt };
}

function indexMapFromNormalized(
    text: string,
    posAt: number[],
    normIdx: number,
    normLen: number,
): { from: number; to: number } | null {
    const normToOrig: number[] = [];
    let normPos = 0;
    for (let i = 0; i < text.length; i++) {
        if (/\s/.test(text[i])) {
            if (normPos === 0 || normToOrig[normToOrig.length - 1] !== i - 1) {
                normToOrig.push(i);
                normPos++;
            }
            continue;
        }
        normToOrig.push(i);
        normPos++;
    }
    const startOrig = normToOrig[normIdx];
    const endOrig = normToOrig[normIdx + normLen - 1];
    if (startOrig == null || endOrig == null) return null;
    const from = posAt[startOrig];
    const to = posAt[endOrig];
    if (from == null || to == null) return null;
    return { from, to: to + 1 };
}

/** Find excerpt range inside a TipTap/ProseMirror document for inline citation highlights. */
export function findExcerptInProseMirrorDoc(
    doc: ProseMirrorNode,
    excerpt: string,
): { from: number; to: number } | null {
    const target = excerpt.trim();
    if (target.length < 4) return null;

    const { text, posAt } = buildDocTextIndex(doc);
    if (!text) return null;

    let idx = text.indexOf(target);
    if (idx >= 0) {
        const from = posAt[idx];
        const to = posAt[idx + target.length - 1];
        if (from != null && to != null) return { from, to: to + 1 };
    }

    const normText = normalizeForSearch(text);
    const normTarget = normalizeForSearch(target);
    if (normTarget.length < 8) return null;
    const normIdx = normText.indexOf(normTarget);
    if (normIdx < 0) return null;
    return indexMapFromNormalized(text, posAt, normIdx, normTarget.length);
}

export function resolveSourcePositionsInDoc(
    doc: ProseMirrorNode,
    sources: FactSource[],
): Array<ResolvedFactSource & { from: number; to: number }> {
    const resolved: Array<ResolvedFactSource & { from: number; to: number }> = [];
    const used: Array<{ from: number; to: number }> = [];

    const overlaps = (from: number, to: number) =>
        used.some((r) => from < r.to && to > r.from);

    for (const source of sources) {
        const range = findExcerptInProseMirrorDoc(doc, source.excerpt);
        if (!range || overlaps(range.from, range.to)) continue;
        resolved.push({
            ...source,
            start: range.from,
            end: range.to,
            from: range.from,
            to: range.to,
        });
        used.push(range);
    }

    return resolved.sort((a, b) => a.from - b.from);
}
