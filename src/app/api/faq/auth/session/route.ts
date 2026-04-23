import { NextResponse } from "next/server";
import { getTenantIdFromRequest } from "@/lib/faqTenantAuth";
import { FAQ_TENANT_CONFIG } from "@/lib/faqTenantConfig";

export async function GET(req: Request) {
  const tenantId = getTenantIdFromRequest(req);
  if (!tenantId) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    tenant: {
      id: tenantId,
      label: FAQ_TENANT_CONFIG[tenantId].label,
    },
  });
}
