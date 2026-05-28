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
    const isInfiLearnMode = pathname.startsWith("/infi-learn");
    const isSignInPage = pathname.startsWith("/sign-in");
    const isOAuthCallback = pathname.includes("/sso-callback");
    if (isOAuthCallback) return null;
    const isDashboardHub = pathname === "/dashboard" || pathname === "/test-dashboard";

    const primaryAuthClass = isLinkedinMode
        ? "bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-md transition-colors uppercase tracking-widest text-[10px] font-black"
        : isInfiLearnMode
            ? "bg-slate-900 hover:bg-slate-800 text-white px-4 py-1.5 rounded-md transition-colors uppercase tracking-widest text-[10px] font-black"
        : "bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-md transition-colors uppercase tracking-widest text-[10px] font-black";
    const secondaryAuthClass =
        isInfiLearnMode
            ? "text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            : "text-sm font-medium text-neutral-300 hover:text-white transition-colors";

    const brandName = isLinkedinMode ? "LinkedIn Ghostwriter" : isInfiLearnMode ? "Infi Smart" : "Bloggie AI";
    const brandColor = isLinkedinMode ? "text-blue-500" : isInfiLearnMode ? "text-slate-900" : "text-emerald-400";
    const brandHref = isLinkedinMode ? "/linkedin" : isInfiLearnMode ? "/infi-learn" : "/";
    const headerClass = isInfiLearnMode
        ? "sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur"
        : "sticky top-0 z-50 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur";
    const dashboardLinkClass = isInfiLearnMode
        ? "text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
        : "text-sm font-medium text-neutral-300 hover:text-white transition-colors";
    const setupDashboardLinkClass = isInfiLearnMode
        ? "text-[11px] font-black text-slate-500 hover:text-slate-900 uppercase tracking-widest transition-colors flex items-center gap-1"
        : "text-[11px] font-black text-neutral-500 hover:text-emerald-500 uppercase tracking-widest transition-colors flex items-center gap-1";

    return (
        <header className={headerClass}>
            <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
                <Link href={brandHref} className={`font-bold text-lg ${brandColor} tracking-tight uppercase`}>
                    {brandName}
                </Link>
                <div className="flex items-center gap-6">
                    <ClerkLoaded>
                        <SignedOut>
                            {isInfiLearnMode ? (
                                <div
                                    aria-label="Mentor profile placeholder"
                                    className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-slate-500"
                                >
                                    <svg
                                        aria-hidden="true"
                                        viewBox="0 0 24 24"
                                        className="h-5 w-5"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                    >
                                        <circle cx="12" cy="8" r="3.5" />
                                        <path d="M5.5 19c1.4-3.2 4-4.8 6.5-4.8s5.1 1.6 6.5 4.8" />
                                    </svg>
                                </div>
                            ) : (
                                <>
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
                                </>
                            )}
                        </SignedOut>
                        <SignedIn>
                            {isSetupMode && (
                                <Link href={pathname.startsWith("/test") ? "/test-dashboard" : "/dashboard"} className={setupDashboardLinkClass}>
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
                                        <Link href="/dashboard" className={dashboardLinkClass}>
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
