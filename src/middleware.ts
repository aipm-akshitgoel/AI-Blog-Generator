/**
 * Clerk middleware (Next.js requires this file to be named middleware.ts).
 * Uses clerkMiddleware() from @clerk/nextjs/server per official App Router quickstart.
 */
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/setup(.*)", "/test(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    const { userId, redirectToSignIn } = await auth();
    if (!userId) {
      return redirectToSignIn();
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals, all API/trpc routes, /ai-faq static SPA, and extensioned static files.
    "/((?!api|trpc|_next|ai-faq|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
