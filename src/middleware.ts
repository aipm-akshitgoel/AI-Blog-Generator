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
    const isHardReload = cacheControl.includes("no-cache") || pragma.includes("no-cache");

    if (isHardReload) {
      const response =
        pathname === loginPath
          ? NextResponse.next()
          : NextResponse.redirect(new URL(loginPath, req.url));
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
