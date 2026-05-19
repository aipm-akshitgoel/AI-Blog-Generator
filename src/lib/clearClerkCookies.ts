import type { NextRequest, NextResponse } from "next/server";

function isClerkSessionCookie(name: string): boolean {
  return (
    name.startsWith("__session") ||
    name.startsWith("__clerk") ||
    name.startsWith("__refresh") ||
    name === "__client_uat"
  );
}

/** Expire Clerk session cookies on the response so the next request is signed out. */
export function clearClerkCookies(req: NextRequest, response: NextResponse): void {
  for (const { name } of req.cookies.getAll()) {
    if (!isClerkSessionCookie(name)) continue;
    response.cookies.set({ name, value: "", path: "/", maxAge: 0 });
  }
}
