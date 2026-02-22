"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { BusinessContext } from "@/lib/types/businessContext";

interface DomainSetupPanelProps {
    businessContext: BusinessContext | null;
    onUpdate?: (updated: BusinessContext) => void;
}

export function DomainSetupPanel({ businessContext, onUpdate }: DomainSetupPanelProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        if (searchParams.get("setup_panel") === "domain") {
            setIsExpanded(true);
            setTimeout(() => {
                document.getElementById("domain-setup-panel")?.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 100);
        }
    }, [searchParams]);
    const [domain, setDomain] = useState(businessContext?.domain || "");
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
    const [locallyLinked, setLocallyLinked] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        setSaveStatus("idle");

        try {
            const res = await fetch("/api/business-context", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...businessContext,
                    domain: domain.trim(),
                }),
            });

            if (!res.ok) throw new Error("Failed to save domain");

            const updated = await res.json();
            onUpdate?.(updated);
            router.refresh();
            setSaveStatus("success");
            setLocallyLinked(true);
            setTimeout(() => setSaveStatus("idle"), 3000);
        } catch (err) {
            setSaveStatus("error");
        } finally {
            setSaving(false);
        }
    };

    const isConnected = locallyLinked || !!businessContext?.domain;

    return (
        <div id="domain-setup-panel" className="mb-8 rounded-xl border border-neutral-800 bg-neutral-900/40 p-1">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 md:p-6 text-left focus:outline-none rounded-lg hover:bg-neutral-800/50 transition-colors"
            >
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                        Website Connection
                    </h3>
                    <p className="text-sm text-neutral-400 mt-1">Connect your domain to start publishing and tracking real-world SEO performance.</p>
                </div>
                <div className="flex items-center gap-4">
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${isConnected
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                        }`}>
                        {isConnected ? "Linked" : "Disconnected"}
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
                <div className="p-4 md:p-6 border-t border-neutral-800 animate-in slide-in-from-top-4 duration-300 space-y-8">
                    {/* Stage 1: Identification */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-black text-neutral-900">1</span>
                            <label className="text-sm font-bold text-neutral-200">Where is your blog living?</label>
                        </div>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={domain}
                                onChange={(e) => setDomain(e.target.value)}
                                className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                                placeholder="e.g. https://www.yoursalon.com"
                            />
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className={`rounded-lg px-6 py-3 text-sm font-bold text-white transition-all active:scale-95 flex items-center gap-2 ${saveStatus === "success"
                                    ? "bg-emerald-500"
                                    : "bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
                                    }`}
                            >
                                {saving ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Saving...
                                    </>
                                ) : saveStatus === "success" ? (
                                    <>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                        </svg>
                                        Linked
                                    </>
                                ) : isConnected ? (
                                    "Update Domain"
                                ) : (
                                    "Link Domain"
                                )}
                            </button>
                        </div>
                        {saveStatus === "success" && (
                            <p className="text-xs text-emerald-500 mt-2 flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                                Domain linked! Keep going to Stage 2.
                            </p>
                        )}
                        <p className="text-xs text-neutral-500 mt-2">Entering your domain tells us where to point your content hooks and SEO tags.</p>
                    </div>

                    {/* Stage 2: DNS Connection */}
                    <div className={`${isConnected ? "opacity-100" : "opacity-30 pointer-events-none"} transition-opacity`}>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-700 text-[10px] font-black text-white">2</span>
                            <label className="text-sm font-bold text-neutral-200">Technically Connect via DNS</label>
                        </div>

                        <div className="rounded-xl bg-neutral-950 border border-neutral-800 p-6 space-y-6">
                            <p className="text-xs text-neutral-400 leading-relaxed max-w-lg">
                                To make your blog live at {domain || 'your domain'}, you just need to update two values in your domain registrar (like GoDaddy, Bluehost, or Namecheap):
                            </p>

                            <div className="space-y-4">
                                {/* A Record */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-[10px] font-black text-neutral-600 uppercase tracking-widest px-1">
                                        <span>Type: A Record</span>
                                        <span>Host: @</span>
                                    </div>
                                    <div className="flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5">
                                        <code className="text-xs text-amber-500 font-mono">76.76.21.21</code>
                                        <button
                                            onClick={() => navigator.clipboard.writeText('76.76.21.21')}
                                            className="text-[10px] text-neutral-500 hover:text-emerald-400 uppercase font-black tracking-widest transition-colors"
                                        >
                                            Copy
                                        </button>
                                    </div>
                                </div>

                                {/* CNAME Record */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-[10px] font-black text-neutral-600 uppercase tracking-widest px-1">
                                        <span>Type: CNAME</span>
                                        <span>Host: www</span>
                                    </div>
                                    <div className="flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5">
                                        <code className="text-xs text-amber-500 font-mono">cname.bloggie.ai</code>
                                        <button
                                            onClick={() => navigator.clipboard.writeText('cname.bloggie.ai')}
                                            className="text-[10px] text-neutral-500 hover:text-emerald-400 uppercase font-black tracking-widest transition-colors"
                                        >
                                            Copy
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex items-start gap-3 p-5 rounded-2xl bg-amber-500/[0.03] border border-amber-500/10">
                            <div className="p-1.5 bg-amber-500/10 rounded-lg shrink-0">
                                <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <p className="text-[11px] text-neutral-400 leading-relaxed">
                                <span className="font-bold text-amber-400/80">Wait for propagation:</span> Most DNS changes go live in minutes, but it can take up to 48 hours to update everywhere. Once you've mapped the records, your dashboard will automatically start showing real visitor data.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
