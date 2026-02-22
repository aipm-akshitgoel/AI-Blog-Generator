import { NextResponse } from "next/server";
import type { OptimizedContent } from "@/lib/types/optimization";
import type { BusinessContext } from "@/lib/types/businessContext";
import type { CTAData } from "@/lib/types/cta";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { optimizedContent, businessContext }: { optimizedContent: OptimizedContent, businessContext: BusinessContext } = body;

        if (!optimizedContent || !businessContext) {
            return NextResponse.json({ error: "Missing optimizedContent or businessContext payload" }, { status: 400 });
        }

        // Simulate fetching a "pre-configured" CTA template for this business
        // In a real app, this would be queried from a database (e.g., Supabase) based on the specific user or business ID.
        // We ensure it's "Consistent" and "Non-editable per blog" post-setup as requested.
        const simulatedCtaTemplate: CTAData = {
            ctaHeadline: `Ready to elevate your look?`,
            ctaCopy: `Ready to elevate your ${businessContext.businessType} experience? Book an appointment at ${businessContext.businessName} today!`,
            ctaButtonText: `Book Now`,
            ctaLink: `https://${businessContext.businessName.toLowerCase().replace(/\s+/g, '')}.com/book`,
            // Optional image placeholder which will be populated later by the Image Agent, or can be a hardcoded pre-setup image.
            ctaImageUrl: undefined
        };

        // Do NOT append the CTA to the markdown here anymore.
        // We let the client-side UI handle appending it after the user has a chance to edit it.
        return NextResponse.json({
            cta: simulatedCtaTemplate,
            updatedMarkdown: optimizedContent.contentMarkdown
        }, { status: 200 });

    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to inject CTA block";
        console.error("CTA Agent Error:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
