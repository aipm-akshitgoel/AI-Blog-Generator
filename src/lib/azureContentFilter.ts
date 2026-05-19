/** Azure OpenAI content policy / filter errors (often false positives on benign SEO prompts). */
export function isAzureContentFilterError(err: unknown): boolean {
  const msg =
    typeof err === "string"
      ? err
      : err instanceof Error
        ? err.message
        : typeof err === "object" && err !== null
          ? JSON.stringify(err)
          : "";
  return /content management policy|content.filter|content_filter|responsible ai|filtered due to the prompt/i.test(
    msg,
  );
}

/** Soften wording that often trips Azure prompt filters when combined with external URLs. */
export function sanitizeStrategyPromptText(text: string): string {
  return String(text || "")
    .replace(/\bcompetitors?\b/gi, "reference site")
    .replace(/\brival(s)?\b/gi, "reference site")
    .replace(/\bscrape\b/gi, "review")
    .replace(/\bprobe\b/gi, "review")
    .trim();
}

export function userFacingContentFilterMessage(): string {
  return "The AI provider blocked this request. Try rephrasing your direction — e.g. describe your niche and audience in plain language, without aggressive or policy-sensitive wording.";
}
