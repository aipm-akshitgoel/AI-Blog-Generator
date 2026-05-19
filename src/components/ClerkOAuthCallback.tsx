"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { CLERK_AFTER_AUTH_URL } from "@/lib/clerkAuth";

/** Finishes Google/OAuth redirect; shows loading until Clerk navigates to the app. */
export function ClerkOAuthCallback() {
  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] w-full flex-col items-center justify-center bg-neutral-950 p-6">
      <div className="mx-auto flex max-w-sm flex-col items-center gap-4 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500" />
        <p className="text-sm font-semibold text-white">Completing sign in…</p>
        <p className="text-xs text-neutral-500">You&apos;ll be redirected in a moment.</p>
      </div>
      <AuthenticateWithRedirectCallback
        signInForceRedirectUrl={CLERK_AFTER_AUTH_URL}
        signUpForceRedirectUrl={CLERK_AFTER_AUTH_URL}
        signInFallbackRedirectUrl={CLERK_AFTER_AUTH_URL}
        signUpFallbackRedirectUrl={CLERK_AFTER_AUTH_URL}
      />
    </main>
  );
}
