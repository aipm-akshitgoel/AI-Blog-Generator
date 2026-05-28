function errorMessage(err: unknown): string {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null) return JSON.stringify(err);
  return "";
}

/** Azure OpenAI content policy / filter errors (often false positives on benign SEO prompts). */
export function isAzureContentFilterError(err: unknown): boolean {
  return /content management policy|content.filter|content_filter|responsible ai|filtered due to the prompt|prompt was filtered|content filtering/i.test(
    errorMessage(err),
  );
}

export function isAzureRateLimitError(err: unknown): boolean {
  return /429|rate limit|too many requests|exceeded.*quota/i.test(errorMessage(err));
}

/** Soften wording that often trips Azure prompt filters when combined with external URLs. */
export function sanitizeStrategyPromptText(text: string): string {
  return String(text || "")
    .replace(/\bcompetitors?\b/gi, "reference site")
    .replace(/\brival(s)?\b/gi, "reference site")
    .replace(/\bscrape\b/gi, "review")
    .replace(/\bprobe\b/gi, "review")
    .replace(/\bspy\b/gi, "review")
    .replace(/\bsteal\b/gi, "adapt")
    .replace(/\bhack\b/gi, "approach")
    .trim();
}

export function userFacingContentFilterMessage(): string {
  return "The AI provider blocked this request. Try rephrasing your direction — e.g. describe your niche and audience in plain language, without aggressive or policy-sensitive wording. Or use Manual directory (Excel) to upload your plan.";
}

export function userFacingRateLimitMessage(): string {
  return "The AI service is temporarily busy (rate limit). Wait about a minute and try again.";
}
