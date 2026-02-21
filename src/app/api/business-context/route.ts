import { NextResponse } from "next/server";
import {
  createBusinessContext,
  listBusinessContexts,
} from "@/lib/businessContextDb";
import type { BusinessContext } from "@/lib/types/businessContext";

export async function GET() {
  try {
    const list = await listBusinessContexts();
    return NextResponse.json(list);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let body: Partial<BusinessContext>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    businessName,
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
    const created = await createBusinessContext({
      businessName: String(businessName).trim(),
      businessType: businessType as BusinessContext["businessType"],
      location: {
        city: location?.city,
        region: location?.region,
        country: location?.country,
      },
      services: services.map(String).filter(Boolean),
      targetAudience: String(targetAudience).trim(),
      positioning: String(positioning).trim(),
    });
    return NextResponse.json(created);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
