"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton, ClerkLoaded } from "@clerk/nextjs";
import Link from "next/link";

export function GlobalNavbar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Hide global navbar on public blog pages to avoid double-headers
    const isPublicPage = pathname.startsWith("/blog");
    if (isPublicPage) return null;

    const isDashboard = pathname === "/dashboard";
    const isSetupMode = pathname.startsWith("/setup");

    return (
        <header className="sticky top-0 z-50 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur">
            <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
                <Link href="/" className="font-bold text-lg text-emerald-400 tracking-tight">
                    Bloggie AI
                </Link>
                <div className="flex items-center gap-6">
                    <ClerkLoaded>
                        <SignedOut>
                            <SignInButton mode="modal">
                                <button className="text-sm font-medium text-neutral-300 hover:text-white transition-colors">Sign In</button>
                            </SignInButton>
                            <SignUpButton mode="modal" forceRedirectUrl="/setup">
                                <button className="text-sm font-medium bg-emerald-600 text-white px-4 py-1.5 rounded-md hover:bg-emerald-500 transition-colors">Sign Up</button>
                            </SignUpButton>
                        </SignedOut>
                        <SignedIn>
                            {isSetupMode && (
                                <Link href="/dashboard" className="text-[11px] font-black text-neutral-500 hover:text-emerald-500 uppercase tracking-widest transition-colors flex items-center gap-1">
                                    DASHBOARD
                                </Link>
                            )}
                            {!isDashboard && !isSetupMode && (
                                <>
                                    <Link href="/dashboard" className="text-sm font-medium text-neutral-300 hover:text-white transition-colors">
                                        Dashboard
                                    </Link>
                                    <Link href="/setup?mode=blog" className="text-sm font-medium bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 px-4 py-1.5 rounded-md hover:bg-emerald-600/30 transition-colors">
                                        + New Blog
                                    </Link>
                                </>
                            )}
                            <a
                                href="mailto:support@bloggieai.com"
                                className="hidden md:flex items-center gap-1.5 text-xs font-black text-neutral-500 hover:text-emerald-500 transition-colors uppercase tracking-widest mr-2"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                                Help
                            </a>
                            <UserButton />
                        </SignedIn>
                    </ClerkLoaded>
                </div>
            </div>
        </header>
    );
}
