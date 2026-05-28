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
    isAzureRateLimitError,
    userFacingContentFilterMessage,
    userFacingRateLimitMessage,
} from "@/lib/azureContentFilter";
import {
    buildStrategySystemPrompt,
    buildStrategyUltraMinimalPrompt,
    buildStrategyUserPrompt,
} from "@/lib/buildStrategyPrompt";
import { normalizeBlogStrategyResponse } from "@/lib/contentDirectory";
import { assistantMessageText, azureConfigDebug, createAzureClient, getAzureConfig, stripOuterMarkdownFence } from "@/lib/azureOpenAI";

type PromptMode = "full" | "minimal" | "ultra";

export async function POST(req: Request) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const azure = getAzureConfig();
    if (!azure) {
        return NextResponse.json(
            { error: "Azure OpenAI is not configured on the server", debug: azureConfigDebug() },
            { status: 500 },
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

        const buildUserPrompt = (mode: PromptMode) => {
            if (mode === "ultra") {
                return buildStrategyUltraMinimalPrompt({
                    refDomain,
                    customText,
                    platform: platformKey,
                });
            }
            return buildStrategyUserPrompt({
                ctx: ctxForStrategy,
                refDomain,
                customText,
                platform: platformKey,
                minimal: mode === "minimal",
            });
        };

        const runCompletion = async (mode: PromptMode) => {
            return client.chat.completions.create({
                model: azure.deployment,
                max_completion_tokens: 4096,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: buildUserPrompt(mode) },
                ],
            });
        };

        const modes: PromptMode[] = ["full", "minimal", "ultra"];
        let response: Awaited<ReturnType<typeof runCompletion>> | undefined;
        let lastFilterErr: unknown;

        for (const mode of modes) {
            try {
                response = await runCompletion(mode);
                const choice = response.choices?.[0];
                if (choice?.finish_reason === "content_filter") {
                    lastFilterErr = new Error("content_filter");
                    continue;
                }
                const text = assistantMessageText(choice?.message?.content);
                if (!text.trim()) {
                    lastFilterErr = new Error("empty_response");
                    continue;
                }
                break;
            } catch (err) {
                if (isAzureRateLimitError(err)) {
                    return NextResponse.json({ error: userFacingRateLimitMessage() }, { status: 429 });
                }
                if (isAzureContentFilterError(err)) {
                    lastFilterErr = err;
                    continue;
                }
                throw err;
            }
        }

        if (!response) {
            return NextResponse.json({ error: userFacingContentFilterMessage() }, { status: 422 });
        }

        const choice = response.choices?.[0];
        if (choice?.finish_reason === "content_filter" || lastFilterErr) {
            return NextResponse.json({ error: userFacingContentFilterMessage() }, { status: 422 });
        }

        const text = assistantMessageText(choice?.message?.content);
        if (!text.trim()) {
            return NextResponse.json({ error: userFacingContentFilterMessage() }, { status: 422 });
        }

        const cleanText = sanitizeJsonString(stripOuterMarkdownFence(text));
        let strategyData: Record<string, unknown>;
        try {
            strategyData = JSON.parse(cleanText) as Record<string, unknown>;
        } catch {
            return NextResponse.json(
                {
                    error: "The AI returned an invalid strategy format. Try again or use Manual directory (Excel).",
                },
                { status: 422 },
            );
        }

        const payload =
            platformKey === "blog"
                ? normalizeBlogStrategyResponse(strategyData, {
                      businessContextId: ctxForStrategy.id,
                      referenceDomain: refDomain || undefined,
                  })
                : strategyData;

        return NextResponse.json({ data: payload });
    } catch (err) {
        if (isAzureRateLimitError(err)) {
            return NextResponse.json({ error: userFacingRateLimitMessage() }, { status: 429 });
        }
        if (isAzureContentFilterError(err)) {
            return NextResponse.json({ error: userFacingContentFilterMessage() }, { status: 422 });
        }
        const message = extractRouteError(err, "Strategy generation failed");
        console.error("Strategy Agent Error:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
