"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CLERK_AFTER_AUTH_URL } from "@/lib/clerkAuth";

export function SignInGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setReady(true);
      return;
    }

    void (async () => {
      try {
        const res = await fetch("/api/auth/status", { credentials: "include", cache: "no-store" });
        const data = (await res.json()) as { authenticated?: boolean };
        if (data.authenticated) {
          router.replace(CLERK_AFTER_AUTH_URL);
          return;
        }
      } catch {
        // StaleClerkSessionSync will sign out; keep waiting
      }
      setReady(false);
    })();
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setReady(true);
    }
  }, [isLoaded, isSignedIn]);

  if (!isLoaded || !ready) {
    return (
      <p className="text-sm text-neutral-400" role="status">
        Loading sign in…
      </p>
    );
  }

  return <>{children}</>;
}
