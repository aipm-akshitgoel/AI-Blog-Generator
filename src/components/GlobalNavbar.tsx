"use client";

import { usePathname } from "next/navigation";
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton, ClerkLoaded } from "@clerk/nextjs";
import Link from "next/link";
import { CLERK_AFTER_AUTH_URL, CLERK_AFTER_SIGN_OUT_URL } from "@/lib/clerkAuth";
import { clerkUserButtonAppearance } from "@/lib/clerkAppearance";

export function GlobalNavbar() {
    const pathname = usePathname();

    // Hide global navbar on public blog pages and test templates to avoid double-headers
    const isPublicPage =
        pathname.startsWith("/blog") ||
        pathname === "/test-template" ||
        pathname.startsWith("/ai-faq") ||
        pathname.startsWith("/ai-faq-test") ||
        pathname.startsWith("/yd-online-mba");
    if (isPublicPage) return null;

    const isSetupMode = pathname.startsWith("/setup") || pathname.startsWith("/test");
    const isLinkedinMode = pathname.startsWith("/linkedin");
    const isSignInPage = pathname.startsWith("/sign-in");
    const isOAuthCallback = pathname.includes("/sso-callback");
    if (isOAuthCallback) return null;
    const isDashboardHub = pathname === "/dashboard" || pathname === "/test-dashboard";

    const primaryAuthClass = isLinkedinMode
        ? "bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-md transition-colors uppercase tracking-widest text-[10px] font-black"
        : "bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-md transition-colors uppercase tracking-widest text-[10px] font-black";
    const secondaryAuthClass =
        "text-sm font-medium text-neutral-300 hover:text-white transition-colors";

    const brandName = isLinkedinMode ? "LinkedIn Ghostwriter" : "Bloggie AI";
    const brandColor = isLinkedinMode ? "text-blue-500" : "text-emerald-400";
    const brandHref = isLinkedinMode ? "/linkedin" : "/";

    return (
        <header className="sticky top-0 z-50 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur">
            <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
                <Link href={brandHref} className={`font-bold text-lg ${brandColor} tracking-tight uppercase`}>
                    {brandName}
                </Link>
                <div className="flex items-center gap-6">
                    <ClerkLoaded>
                        <SignedOut>
                            <SignInButton
                                mode="redirect"
                                forceRedirectUrl={isLinkedinMode ? "/linkedin" : CLERK_AFTER_AUTH_URL}
                            >
                                <button
                                    className={isSignInPage ? primaryAuthClass : secondaryAuthClass}
                                >
                                    Sign In
                                </button>
                            </SignInButton>
                            <SignUpButton
                                mode="redirect"
                                forceRedirectUrl={isLinkedinMode ? "/linkedin" : CLERK_AFTER_AUTH_URL}
                            >
                                <button
                                    className={!isSignInPage ? primaryAuthClass : secondaryAuthClass}
                                >
                                    Sign Up
                                </button>
                            </SignUpButton>
                        </SignedOut>
                        <SignedIn>
                            {isSetupMode && (
                                <Link href={pathname.startsWith("/test") ? "/test-dashboard" : "/dashboard"} className="text-[11px] font-black text-neutral-500 hover:text-emerald-500 uppercase tracking-widest transition-colors flex items-center gap-1">
                                    DASHBOARD
                                </Link>
                            )}

                            {!isSetupMode && (
                                <div className="flex items-center gap-6">
                                    {isLinkedinMode ? (
                                        <>
                                            {/* LinkedIn Ghostwriter specific links would go here */}
                                        </>
                                    ) : !isDashboardHub ? (
                                        <Link href="/dashboard" className="text-sm font-medium text-neutral-300 hover:text-white transition-colors">
                                            Dashboard
                                        </Link>
                                    ) : null}
                                </div>
                            )}
                            <UserButton
                                afterSignOutUrl={CLERK_AFTER_SIGN_OUT_URL}
                                appearance={clerkUserButtonAppearance}
                            />
                        </SignedIn>
                    </ClerkLoaded>
                </div>
            </div>
        </header>
    );
}
