"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import {
    CLERK_AFTER_ACCOUNT_DELETE_URL,
    CLERK_SIGN_IN_URL,
    isClerkOAuthCallbackPath,
} from "@/lib/clerkAuth";

async function serverSessionReady(maxAttempts = 6, delayMs = 350): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch("/api/auth/status", { credentials: "include", cache: "no-store" });
      const data = (await res.json()) as { authenticated?: boolean };
      if (data.authenticated) return true;
    } catch {
      /* retry */
    }
    if (attempt < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return false;
}

/**
 * Clerk client can keep `isSignedIn` after server cookies were cleared (sign-out,
 * hard refresh on protected routes). That hides SignIn and loops dashboard ↔ sign-in.
 */
export function StaleClerkSessionSync() {
  const { isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const pathname = usePathname();
  const isChecking = useRef(false);

  useEffect(() => {
    if (!isSignedIn) {
      isChecking.current = false;
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || isChecking.current) return;
    if (isClerkOAuthCallbackPath(pathname)) return;

    isChecking.current = true;
    void (async () => {
      try {
        const authenticated = await serverSessionReady();
        if (authenticated) return;
        const afterDelete =
            typeof window !== "undefined" &&
            new URLSearchParams(window.location.search).get("deleted") === "1";
        await signOut({
            redirectUrl: afterDelete ? CLERK_AFTER_ACCOUNT_DELETE_URL : CLERK_SIGN_IN_URL,
        });
      } catch {
        isChecking.current = false;
      }
    })();
  }, [isLoaded, isSignedIn, pathname, signOut]);

  return null;
}
