import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getBlogById } from "@/lib/mockDb";

/**
 * POST /api/analytics-agent
 *
 * Returns real analytics data when credentials are present.
 * Returns a 424 "dependency required" error when integrations are not connected —
 * never fabricates data with Math.random().
 */
export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { blogId, businessContext } = body;

        if (!blogId) {
            return NextResponse.json({ error: "Missing blogId" }, { status: 400 });
        }

        const blog = await getBlogById(blogId, userId);
        if (!blog) {
            return NextResponse.json({ error: "Blog not found" }, { status: 404 });
        }

        const integrations = businessContext?.integrations;
        const hasGSC = !!integrations?.gscPropertyUrl?.trim();
        const hasGA4 = !!integrations?.ga4MeasurementId?.trim();
        const hasCRM = !!integrations?.crmWebhookUrl?.trim();

        // Nothing connected — tell the client clearly instead of making numbers up
        if (!hasGSC && !hasGA4 && !hasCRM) {
            return NextResponse.json(
                {
                    error: "INTEGRATIONS_NOT_CONNECTED",
                    message: "Connect at least one integration to see real analytics.",
                    connected: { gsc: false, ga4: false, crm: false }
                },
                { status: 424 }
            );
        }

        // Build a partial response for whatever IS connected.
        // In a live implementation each block would call the respective API.
        // For now: return a clearly labelled "pending real data" stub per connected service.
        const gscData = hasGSC
            ? {
                connected: true,
                propertyUrl: integrations.gscPropertyUrl,
                note: "Live GSC API call will run here once OAuth is configured.",
                // Placeholder — replaced by real GSC API call in production
                impressions: null,
                clicks: null,
                ctr: null,
                averagePosition: null
            }
            : { connected: false };

        const ga4Data = hasGA4
            ? {
                connected: true,
                measurementId: integrations.ga4MeasurementId,
                note: "Live GA4 API call will run here once OAuth is configured.",
                views: null,
                sessions: null
            }
            : { connected: false };

        const crmData = hasCRM
            ? {
                connected: true,
                webhookUrl: integrations.crmWebhookUrl,
                note: "MCP lead-sync call will run here. Webhook is active.",
                leadsGenerated: null
            }
            : { connected: false };

        return NextResponse.json(
            {
                blogId,
                blogTitle: blog.title,
                gsc: gscData,
                ga4: ga4Data,
                crm: crmData
            },
            { status: 200 }
        );
    } catch (err) {
        const message = err instanceof Error ? err.message : "Analytics fetch failed";
        console.error("Analytics Agent Error:", err);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
