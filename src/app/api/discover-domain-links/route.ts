import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { discoverDomainLinks } from "@/lib/domainLinks";

export async function POST(req: Request) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let body: { url?: string; domain?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const url = String(body.url || body.domain || "").trim();
    if (!url) {
        return NextResponse.json({ error: "A website URL or domain is required." }, { status: 400 });
    }

    try {
        const links = await discoverDomainLinks(url);
        return NextResponse.json({ links });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to discover links";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
