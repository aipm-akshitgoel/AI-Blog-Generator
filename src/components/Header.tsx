"use client";

import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import Link from "next/link";
import { CLERK_AFTER_AUTH_URL, CLERK_AFTER_SIGN_OUT_URL } from "@/lib/clerkAuth";
import { clerkUserButtonAppearance } from "@/lib/clerkAppearance";

/**
 * Header using Clerk's official components (SignInButton, SignUpButton, UserButton).
 * Root layout also inlines this pattern; this component is for reuse if needed.
 */
export function Header() {
  return (
    <header className="border-b border-neutral-800 bg-neutral-950/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link href="/" className="font-semibold text-neutral-100">
          Bloggie AI
        </Link>
        <div className="flex items-center gap-4">
          <SignedOut>
            <SignInButton mode="redirect" forceRedirectUrl={CLERK_AFTER_AUTH_URL} />
            <SignUpButton mode="redirect" forceRedirectUrl={CLERK_AFTER_AUTH_URL} />
          </SignedOut>
          <SignedIn>
            <UserButton
              afterSignOutUrl={CLERK_AFTER_SIGN_OUT_URL}
              appearance={clerkUserButtonAppearance}
            />
          </SignedIn>
        </div>
      </div>
    </header>
  );
}
