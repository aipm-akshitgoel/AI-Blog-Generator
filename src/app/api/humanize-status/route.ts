import { NextResponse } from "next/server";
import { getAiHumanizeConfig } from "@/lib/aiHumanize";

/** Quick check that AI Humanize env vars are loaded on this deployment (no secrets returned). */
export async function GET() {
    const cfg = getAiHumanizeConfig();
    return NextResponse.json({
        configured: Boolean(cfg),
        emailSet: Boolean(process.env.AI_HUMANIZE_EMAIL?.trim()),
        model: cfg?.model ?? null,
    });
}
