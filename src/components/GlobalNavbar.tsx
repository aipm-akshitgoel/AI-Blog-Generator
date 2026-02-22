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
                            <UserButton />
                        </SignedIn>
                    </ClerkLoaded>
                </div>
            </div>
        </header>
    );
}
