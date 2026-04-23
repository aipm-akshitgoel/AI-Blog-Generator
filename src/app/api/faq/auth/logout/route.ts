import { NextResponse } from "next/server";
import { FAQ_TENANT_COOKIE_NAME } from "@/lib/faqTenantAuth";

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set({
    name: FAQ_TENANT_COOKIE_NAME,
    value: "",
    path: "/",
    maxAge: 0,
  });
  return res;
}
