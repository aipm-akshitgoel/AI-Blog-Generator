import { AzureOpenAI } from "openai";

export type AzureConfig = {
  endpoint: string;
  apiKey: string;
  deployment: string;
  apiVersion: string;
};

export function getAzureConfig(): AzureConfig | null {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT?.trim();
  const apiKey = process.env.AZURE_OPENAI_API_KEY?.trim();
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT?.trim();
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION?.trim() || "2024-12-01-preview";

  if (!endpoint || !apiKey || !deployment) return null;
  return { endpoint, apiKey, deployment, apiVersion };
}

export function azureConfigDebug() {
  return {
    hasAzureEndpoint: Boolean(process.env.AZURE_OPENAI_ENDPOINT?.trim()),
    hasAzureApiKey: Boolean(process.env.AZURE_OPENAI_API_KEY?.trim()),
    hasAzureDeployment: Boolean(process.env.AZURE_OPENAI_DEPLOYMENT?.trim()),
    azureApiVersion: process.env.AZURE_OPENAI_API_VERSION?.trim() || "2024-12-01-preview",
  };
}

export function createAzureClient(config: AzureConfig) {
  return new AzureOpenAI({
    endpoint: config.endpoint,
    apiKey: config.apiKey,
    apiVersion: config.apiVersion,
  });
}

export function stripOuterMarkdownFence(s: string): string {
  let t = s.trim();
  if (!t.startsWith("```")) return t;
  t = t.replace(/^```(?:json)?\s*/i, "");
  const end = t.lastIndexOf("```");
  if (end >= 0) t = t.slice(0, end);
  return t.trim();
}

export function assistantMessageText(content: unknown): string {
  if (content == null) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const parts: string[] = [];
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const p = part as Record<string, unknown>;
      if (p.type === "text" && typeof p.text === "string") parts.push(p.text);
      else if (typeof p.text === "string") parts.push(p.text);
      else if (p.type === "refusal" && typeof p.refusal === "string") parts.push(p.refusal);
    }
    return parts.join("");
  }
  return String(content);
}
