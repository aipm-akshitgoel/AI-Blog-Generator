import { NextResponse } from "next/server";
import { FAQ_TENANT_COOKIE_NAME, isValidTenantLogin } from "@/lib/faqTenantAuth";
import { FAQ_TENANT_CONFIG, isFaqTenantId } from "@/lib/faqTenantConfig";

type LoginBody = {
  tenant?: unknown;
  username?: unknown;
  password?: unknown;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as LoginBody | null;
  const tenant = String(body?.tenant || "").trim().toLowerCase();
  const username = String(body?.username || "").trim();
  const password = String(body?.password || "");

  if (!isFaqTenantId(tenant)) {
    return NextResponse.json({ success: false, error: "Please select a valid university." }, { status: 400 });
  }

  if (!username || !password) {
    return NextResponse.json({ success: false, error: "Username and password are required." }, { status: 400 });
  }

  if (!isValidTenantLogin(tenant, username, password)) {
    return NextResponse.json({ success: false, error: "Invalid username or password." }, { status: 401 });
  }

  const res = NextResponse.json({
    success: true,
    tenant: {
      id: tenant,
      label: FAQ_TENANT_CONFIG[tenant].label,
    },
  });

  res.cookies.set({
    name: FAQ_TENANT_COOKIE_NAME,
    value: tenant,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 hours
  });

  return res;
}
