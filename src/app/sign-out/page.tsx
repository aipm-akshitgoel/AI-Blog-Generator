"use client";

import { useClerk } from "@clerk/nextjs";
import { useEffect } from "react";
import { CLERK_SIGNED_OUT_HOME_URL } from "@/lib/clerkAuth";

export default function SignOutPage() {
  const { signOut, loaded } = useClerk();

  useEffect(() => {
    if (!loaded) return;
    void signOut({ redirectUrl: CLERK_SIGNED_OUT_HOME_URL });
  }, [loaded, signOut]);

  return (
    <main className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center bg-neutral-950 text-neutral-400 text-sm">
      Signing out…
    </main>
  );
}
