"use client";

import { useAuth } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { CLERK_SIGN_IN_URL } from "@/lib/clerkAuth";

const PROTECTED_PREFIXES = ["/dashboard", "/setup", "/test", "/test-dashboard"];

function isProtectedPath(pathname: string) {
    return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * Client-side backstop: after sign-out, cached RSC can still show /dashboard briefly.
 * Hard refresh with no session should land on sign-in, not a stale protected page.
 */
export function AuthSessionGuard() {
    const { isLoaded, isSignedIn } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (!isLoaded || isSignedIn || !isProtectedPath(pathname)) return;
        router.replace(CLERK_SIGN_IN_URL);
    }, [isLoaded, isSignedIn, pathname, router]);

    return null;
}
