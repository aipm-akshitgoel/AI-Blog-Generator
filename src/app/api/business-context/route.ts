import { NextResponse } from "next/server";
import {
  createBusinessContext,
  listBusinessContexts,
  updateBusinessContext,
  deleteBusinessContext,
} from "@/lib/businessContextDb";
import type { BusinessContext } from "@/lib/types/businessContext";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const list = await listBusinessContexts(userId);
    return NextResponse.json(list);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list";
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
    businessName,
    domain,
    businessType,
    location,
    services,
    targetAudience,
    positioning,
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
    const list = await listBusinessContexts(userId);
    const existing = list[0]; // User's singleton context

    const contextData = {
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
    };

    if (existing && existing.id) {
      const updated = await updateBusinessContext(existing.id, contextData);
      return NextResponse.json(updated);
    } else {
      const created = await createBusinessContext(contextData, userId);
      return NextResponse.json(created);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save business context";
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
    const message = err instanceof Error ? err.message : "Failed to delete";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
