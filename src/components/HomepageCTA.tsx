"use client";

import { SignUpButton } from "@clerk/nextjs";

export function HomepageCTA() {
    return (
        <SignUpButton mode="modal" forceRedirectUrl="/setup">
            <button className="rounded-xl border border-emerald-500/30 bg-emerald-600/10 px-8 py-4 text-lg font-bold text-emerald-400 transition-all hover:bg-emerald-600 hover:text-white hover:border-emerald-500 hover:scale-105 shadow-xl shadow-emerald-900/20 inline-flex items-center gap-2">
                Get Started Now
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
            </button>
        </SignUpButton>
    );
}
