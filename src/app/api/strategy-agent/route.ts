import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { sanitizeJsonString } from "@/lib/sanitizeJson";
import {
    buildMinimalBusinessContext,
    canRunStrategyAgent,
    mergeContextWithReference,
    resolveStrategyReferenceDomain,
} from "@/lib/strategyInputs";
import { extractRouteError } from "@/lib/formatApiError";
import {
    isAzureContentFilterError,
    userFacingContentFilterMessage,
} from "@/lib/azureContentFilter";
import { buildStrategySystemPrompt, buildStrategyUserPrompt } from "@/lib/buildStrategyPrompt";
import { normalizeBlogStrategyResponse } from "@/lib/contentDirectory";
import { assistantMessageText, azureConfigDebug, createAzureClient, getAzureConfig, stripOuterMarkdownFence } from "@/lib/azureOpenAI";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const azure = getAzureConfig();
  if (!azure) {
    return NextResponse.json(
      { error: "Azure OpenAI is not configured on the server", debug: azureConfigDebug() },
      { status: 500 }
    );
  }

  try {
    const { businessContext, referenceDomain, customPrompt, platform = "blog" } = await req.json();
    const customText = typeof customPrompt === "string" ? customPrompt : "";
    const platformKey = platform === "linkedin" ? "linkedin" : "blog";

    const refDomain =
      resolveStrategyReferenceDomain(businessContext, customText) ||
      (typeof referenceDomain === "string" ? resolveStrategyReferenceDomain(null, referenceDomain) : "");

    if (!canRunStrategyAgent(businessContext, customText)) {
      return NextResponse.json(
        {
          error: "Add a short custom direction (niche, audience, or a website to reference).",
        },
        { status: 400 },
      );
    }

    const baseContext =
      businessContext ?? buildMinimalBusinessContext({ domain: refDomain, platform: platformKey });
    const ctxForStrategy = mergeContextWithReference(baseContext, refDomain);

    const client = createAzureClient(azure);
    const systemPrompt = buildStrategySystemPrompt(platformKey);

    const runCompletion = async (minimal: boolean) => {
      const userPrompt = buildStrategyUserPrompt({
        ctx: ctxForStrategy,
        refDomain,
        customText,
        platform: platformKey,
        minimal,
      });

      return client.chat.completions.create({
        model: azure.deployment,
        max_completion_tokens: 2000,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });
    };

    let response;
    try {
      response = await runCompletion(false);
    } catch (firstErr) {
      if (!isAzureContentFilterError(firstErr)) throw firstErr;
      response = await runCompletion(true);
    }

    const choice = (response as { choices?: Array<{ finish_reason?: string; message?: { content?: unknown } }> })
      ?.choices?.[0];
    if (choice?.finish_reason === "content_filter") {
      response = await runCompletion(true);
    }

    const text = assistantMessageText(choice?.message?.content);
    if (!text.trim()) {
      return NextResponse.json({ error: userFacingContentFilterMessage() }, { status: 422 });
    }

    const cleanText = sanitizeJsonString(stripOuterMarkdownFence(text));
    const strategyData = JSON.parse(cleanText) as Record<string, unknown>;

    const payload =
      platformKey === "blog"
        ? normalizeBlogStrategyResponse(strategyData, {
            businessContextId: ctxForStrategy.id,
            referenceDomain: refDomain || undefined,
          })
        : strategyData;

    return NextResponse.json({ data: payload });
  } catch (err) {
    if (isAzureContentFilterError(err)) {
      return NextResponse.json({ error: userFacingContentFilterMessage() }, { status: 422 });
    }
    const message = extractRouteError(err, "Strategy generation failed");
    console.error("Strategy Agent Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
