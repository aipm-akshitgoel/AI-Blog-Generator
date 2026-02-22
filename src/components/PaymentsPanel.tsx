"use client";

import { useState } from "react";

export function PaymentsPanel() {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="mb-8 rounded-xl border border-neutral-800 bg-neutral-900/40 p-1">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 md:p-6 text-left focus:outline-none rounded-lg hover:bg-neutral-800/50 transition-colors group"
            >
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        Payments & Billing
                    </h3>
                    <p className="text-sm text-neutral-400 mt-1">Manage your subscription, view invoices, and update your payment methods.</p>
                </div>
                <div className="flex items-center gap-4">
                    <span className="hidden md:inline-flex px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        Coming Soon
                    </span>
                    <svg
                        className={`w-5 h-5 text-neutral-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {isExpanded && (
                <div className="p-4 md:p-6 border-t border-neutral-800 animate-in slide-in-from-top-4 duration-300">
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-amber-900/20 group-hover:scale-105 transition-transform duration-500">
                            <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <h4 className="text-xl font-black text-white mb-2 uppercase tracking-tight">Pro Features Unlocking Soon</h4>
                        <p className="text-neutral-400 max-w-sm mx-auto mb-6">
                            We are currently beta testing our premium AI models and high-volume publishing tiers. Billing will be enabled securely via Stripe in our V1 release.
                        </p>

                        <div className="w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex items-center justify-between opacity-50 cursor-not-allowed">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-6 bg-neutral-800 rounded flex items-center justify-center border border-neutral-700">
                                    <svg className="w-6 h-4 text-neutral-500" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                                    </svg>
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-bold text-white">Credit Card</p>
                                    <p className="text-xs text-neutral-500">Stripe Integration Pending</p>
                                </div>
                            </div>
                            <button disabled className="text-xs font-bold text-neutral-600 uppercase tracking-widest px-3 py-1.5 rounded-md bg-neutral-900 border border-neutral-800">Disabled</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
