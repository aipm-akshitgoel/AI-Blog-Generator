"use client";

import { SignedIn, SignedOut, SignUpButton } from "@clerk/nextjs";
import Link from "next/link";
import { CLERK_AFTER_AUTH_URL } from "@/lib/clerkAuth";

export function HomepageCTA() {
  return (
    <>
      <SignedOut>
        <SignUpButton mode="redirect" forceRedirectUrl={CLERK_AFTER_AUTH_URL}>
          <button className="rounded-xl border border-emerald-500/30 bg-emerald-600/10 px-8 py-4 text-lg font-bold text-emerald-400 transition-all hover:bg-emerald-600 hover:text-white hover:border-emerald-500 hover:scale-105 shadow-xl shadow-emerald-900/20 inline-flex items-center gap-2">
            Get started
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </SignUpButton>
      </SignedOut>
      <SignedIn>
        <Link
          href="/dashboard"
          className="rounded-xl border border-emerald-500/30 bg-emerald-600 px-8 py-4 text-lg font-bold text-white transition-all hover:bg-emerald-500 hover:border-emerald-400 hover:scale-105 shadow-xl shadow-emerald-900/20 inline-flex items-center gap-2"
        >
          Go to Dashboard
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </SignedIn>
    </>
  );
}
