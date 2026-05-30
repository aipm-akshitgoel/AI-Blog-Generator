/**
 * Shared readability editorial rules — plain professional English, not telegraphic staccato.
 * Used by readability loops and documented for agents in AGENTS.md.
 */

/** Flesch-Kincaid grade ceiling (inclusive). 10 ≈ 9th–10th grade, adult-friendly. */
export const READABILITY_EDITORIAL_GRADE_MAX = 10;

export const READABILITY_EDITORIAL_RULES = `
Readability goals (Flesch-Kincaid grade 9–10, adult professional tone):
- Write clear plain English for educated adults and working professionals — NOT childish or telegraphic copy.
- Vary sentence length: mix short punchy lines with medium sentences (about 15–25 words) when one idea needs context.
- Do NOT break one idea into three choppy sentences (e.g. "You can study online. You can study from home. You can keep your job."). Combine into one or two natural sentences, OR use a bullet list.
- When a paragraph lists 3+ parallel items (steps, features, benefits, requirements, exam types), convert them to a markdown bullet list (- item) after one short lead-in sentence. Do not leave them as separate one-line paragraphs.
- Keep paragraphs to 2–4 sentences when possible; use bullets for scannable lists instead of many single-sentence blocks.
- Prefer common words over jargon, but keep standard industry terms (UGC, NAAC, MBA, eligibility) when the article is about education or careers.
- Do NOT add rhetorical question chains ("Will X help? Yes, it can. Who sets rules? The UGC.").
- Avoid repetitive filler ("Many readers search for…", "This helps you…") in back-to-back paragraphs.
- Preserve every ## and ### heading text exactly unless a tiny wording change is required.
- Preserve all [anchor](url) links exactly (URLs and anchor text).
- Preserve GFM markdown tables; do not flatten tables into plain text.
- No em-dashes (—). Avoid "delve", "elevate", "moreover", "in today's landscape".
`.trim();

export const READABILITY_IMPROVE_SUMMARY =
    "Improve readability to about 9th–10th grade (plain professional English). Simplify wording where needed, use bullets for lists, and keep a natural flowing voice — do not chop every sentence short.";

export function buildReadabilityRetryHint(
    gradeLabel: string,
    fleschScore: number,
    attempt: number,
    maxAttempts: number,
): string {
    return `Readability is still above target (${gradeLabel}, Flesch ease ${fleschScore}). Attempt ${attempt} of ${maxAttempts}.

Simplify vocabulary and long sentences, but do NOT use telegraphic staccato. Convert parallel points to bullet lists instead of many tiny sentences. Target grade 10 or below.`;
}
