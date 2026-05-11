/**
 * Clerk middleware (Next.js requires this file to be named middleware.ts).
 * Uses clerkMiddleware() from @clerk/nextjs/server per official App Router quickstart.
 */
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/setup(.*)", "/test(.*)"]);
const FAQ_TENANT_COOKIE_NAME = "faq_tenant_session";

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;
  if (
    pathname === "/ai-faq" ||
    pathname.startsWith("/ai-faq/app") ||
    pathname === "/ai-faq-test" ||
    pathname.startsWith("/ai-faq-test/app")
  ) {
    const loginPath = pathname.startsWith("/ai-faq-test") ? "/ai-faq-test" : "/ai-faq";
    const appPath = pathname.startsWith("/ai-faq-test") ? "/ai-faq-test/app" : "/ai-faq/app";
    const cacheControl = (req.headers.get("cache-control") || "").toLowerCase();
    const pragma = (req.headers.get("pragma") || "").toLowerCase();
    const isHardRefreshHint =
      cacheControl.includes("no-cache") || cacheControl.includes("max-age=0") || pragma.includes("no-cache");
    const secFetchDest = (req.headers.get("sec-fetch-dest") || "").toLowerCase();
    const secFetchMode = (req.headers.get("sec-fetch-mode") || "").toLowerCase();
    const isDocumentNavigation =
      req.method === "GET" &&
      (secFetchDest === "document" || secFetchDest === "iframe") &&
      (secFetchMode === "navigate" || secFetchMode === "nested-navigate");
    const isFaqPageRoute = pathname === loginPath || pathname.startsWith(appPath);

    // Only clear tenant session on explicit browser document reload/navigation.
    // Background fetches during prod push may include no-cache hints and must not log the user out.
    if (isHardRefreshHint && isDocumentNavigation && isFaqPageRoute) {
      const to = new URL(loginPath, req.url);
      const response = NextResponse.redirect(to);
      response.cookies.set({
        name: FAQ_TENANT_COOKIE_NAME,
        value: "",
        path: "/",
        maxAge: 0,
      });
      return response;
    }

    const hasFaqSession = Boolean(req.cookies.get(FAQ_TENANT_COOKIE_NAME)?.value);
    if (pathname.startsWith(appPath) && !hasFaqSession) {
      const to = new URL(loginPath, req.url);
      return NextResponse.redirect(to);
    }
    if (pathname === loginPath && hasFaqSession) {
      const to = new URL(appPath, req.url);
      return NextResponse.redirect(to);
    }
  }

  if (isProtectedRoute(req)) {
    const { userId, redirectToSignIn } = await auth();
    if (!userId) {
      return redirectToSignIn();
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and extensioned static files.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Ensure Clerk middleware runs on API/trpc routes where auth() is used.
    "/(api|trpc)(.*)",
  ],
};
