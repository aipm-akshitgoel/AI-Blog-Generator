import { NextResponse } from "next/server";
import {
  createBusinessContext,
  listBusinessContexts,
  updateBusinessContext,
  deleteBusinessContext,
} from "@/lib/businessContextDb";
import type { BusinessContext } from "@/lib/types/businessContext";
import { auth } from "@clerk/nextjs/server";
import { formatSupabaseWriteError } from "@/lib/supabaseServerClient";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform") as "blog" | "linkedin" | null;

  try {
    const list = await listBusinessContexts(userId, platform || undefined);
    return NextResponse.json(list);
  } catch (err) {
    const message = formatSupabaseWriteError(
      err instanceof Error ? err.message : "Failed to list",
    );
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Partial<BusinessContext>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    platform = "blog",
    businessName,
    domain,
    businessType,
    location,
    services,
    targetAudience,
    positioning,
    brandTone,
    contentGuidelines,
    seoDefaults,
  } = body;

  if (
    !businessName ||
    !businessType ||
    !targetAudience ||
    !positioning ||
    !Array.isArray(services)
  ) {
    return NextResponse.json(
      {
        error:
          "Missing required fields: businessName, businessType, location (object), services (array), targetAudience, positioning",
      },
      { status: 400 },
    );
  }

  try {
    const list = await listBusinessContexts(userId, platform as "blog" | "linkedin");
    const existing = list[0]; // User's singleton context for this platform

    const contextData: any = {
      platform,
      businessName: String(businessName).trim(),
      domain: domain ? String(domain).trim() : undefined,
      businessType: businessType as BusinessContext["businessType"],
      location: {
        city: location?.city,
        region: location?.region,
        country: location?.country,
      },
      services: services.map(String).filter(Boolean),
      targetAudience: String(targetAudience).trim(),
      positioning: String(positioning).trim(),
      brandTone: brandTone ? String(brandTone).trim() : undefined,
      contentGuidelines: contentGuidelines ?? undefined,
      seoDefaults: seoDefaults ?? undefined,
    };

    const guidelinesFromBody = body.contentGuidelines;
    const brandToneFromBody = body.brandTone?.trim() || undefined;

    if (existing && existing.id) {
      const updated = await updateBusinessContext(existing.id, contextData);
      return NextResponse.json({
        ...updated,
        brandTone: updated.brandTone ?? brandToneFromBody,
        contentGuidelines: updated.contentGuidelines ?? guidelinesFromBody,
        seoDefaults: updated.seoDefaults ?? body.seoDefaults,
      });
    } else {
      const created = await createBusinessContext(contextData, userId);
      return NextResponse.json({
        ...created,
        brandTone: created.brandTone ?? brandToneFromBody,
        contentGuidelines: created.contentGuidelines ?? guidelinesFromBody,
        seoDefaults: created.seoDefaults ?? body.seoDefaults,
      });
    }
  } catch (err) {
    const message = formatSupabaseWriteError(
      err instanceof Error ? err.message : "Failed to save business context",
    );
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing ID" }, { status: 400 });
  }

  try {
    await deleteBusinessContext(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = formatSupabaseWriteError(
      err instanceof Error ? err.message : "Failed to delete",
    );
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
