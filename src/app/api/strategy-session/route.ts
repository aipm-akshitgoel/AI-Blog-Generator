import { NextResponse } from "next/server";
import { createStrategySession, getLatestStrategySession, deleteStrategySession } from "@/lib/strategyDb";
import type { StrategySession } from "@/lib/types/strategy";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const businessContextId = searchParams.get("businessContextId");

    try {
        const session = await getLatestStrategySession(businessContextId || undefined);
        return NextResponse.json(session);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch strategy session";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    let body: StrategySession;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    try {
        const created = await createStrategySession(body);
        return NextResponse.json(created);
    } catch (err: any) {
        console.error("Supabase insert error:", err);
        const message = err?.message || err?.details || (err instanceof Error ? err.message : "Failed to save strategy session");
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
        return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    try {
        await deleteStrategySession(id);
        return NextResponse.json({ success: true });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
