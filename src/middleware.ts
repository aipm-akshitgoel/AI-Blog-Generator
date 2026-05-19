/**
 * Clerk middleware (Next.js requires this file to be named middleware.ts).
 * Uses clerkMiddleware() from @clerk/nextjs/server per official App Router quickstart.
 */
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isHardDocumentRefresh } from "@/lib/hardRefresh";
const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/setup(.*)", "/test(.*)", "/test-dashboard(.*)"]);
const isAuthRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);
const isOAuthCallbackRoute = createRouteMatcher([
  "/sign-in/sso-callback",
  "/sign-up/sso-callback",
]);
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
    const isFaqPageRoute = pathname === loginPath || pathname.startsWith(appPath);

    // Only clear tenant session on explicit browser document reload/navigation.
    // Background fetches during prod push may include no-cache hints and must not log the user out.
    if (isHardDocumentRefresh(req) && isFaqPageRoute) {
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

  const { userId, redirectToSignIn } = await auth();

  if (isProtectedRoute(req)) {
    if (!userId) {
      return redirectToSignIn({ returnBackUrl: req.url });
    }
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "private, no-store, no-cache, must-revalidate");
    return response;
  }

  // Let Clerk finish OAuth on the callback route before redirecting away.
  if (isAuthRoute(req) && userId && !isOAuthCallbackRoute(req)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
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
