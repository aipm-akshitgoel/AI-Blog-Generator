"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { BusinessContext } from "@/lib/types/businessContext";
import {
    buildContentGuidelinesFromText,
    guidelinesToText,
} from "@/lib/contentGuidelines";
import { persistLocalContentGuidelines } from "@/lib/businessSetupStorage";
import { CtaButton } from "@/components/ui/CtaButton";

interface ContentGuidelinesPanelProps {
    businessContext: BusinessContext | null;
    onUpdate?: (updated: BusinessContext) => void;
}

export function ContentGuidelinesPanel({ businessContext, onUpdate }: ContentGuidelinesPanelProps) {
    const router = useRouter();
    const [isExpanded, setIsExpanded] = useState(false);
    const [dosText, setDosText] = useState("");
    const [dontsText, setDontsText] = useState("");
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setDosText(guidelinesToText(businessContext?.contentGuidelines?.dos));
        setDontsText(guidelinesToText(businessContext?.contentGuidelines?.donts));
    }, [businessContext?.contentGuidelines, businessContext?.id]);

    const hasRules = dosText.trim().length > 0 || dontsText.trim().length > 0;

    const handleSave = async () => {
        if (!businessContext) return;
        setSaving(true);
        setSaveStatus("idle");
        setError(null);

        const contentGuidelines = buildContentGuidelinesFromText(dosText, dontsText);

        try {
            const res = await fetch("/api/business-context", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...businessContext,
                    contentGuidelines,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to save guidelines");

            const merged = {
                ...businessContext,
                ...data,
                contentGuidelines: data.contentGuidelines ?? contentGuidelines,
            };
            persistLocalContentGuidelines(merged.contentGuidelines);
            onUpdate?.(merged);
            router.refresh();
            setSaveStatus("success");
            setTimeout(() => setSaveStatus("idle"), 3000);
        } catch (e) {
            setSaveStatus("error");
            setError(e instanceof Error ? e.message : "Save failed");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div id="content-guidelines-panel" className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-1">
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex w-full items-center justify-between rounded-lg p-4 text-left transition-colors hover:bg-neutral-800/50 md:p-6 focus:outline-none"
            >
                <div>
                    <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                        <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                            />
                        </svg>
                        Content guidelines (Do&apos;s &amp; Don&apos;ts)
                    </h3>
                    <p className="mt-1 text-sm text-neutral-400">
                        Account-wide rules for every blog — competitors, citations, tone limits, and more.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                            hasRules
                                ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-400"
                                : "border-neutral-700 bg-neutral-800/80 text-neutral-500"
                        }`}
                    >
                        {hasRules ? "Active" : "Not set"}
                    </span>
                    <svg
                        className={`h-5 w-5 text-neutral-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {isExpanded && (
                <div className="animate-in slide-in-from-top-4 border-t border-neutral-800 p-4 duration-300 md:p-6 space-y-4">
                    <p className="text-[11px] text-neutral-500 leading-relaxed">
                        One rule per line. These are injected into the content writer and optimizer for every post on this domain.
                    </p>

                    <div>
                        <label className="mb-1.5 block text-xs font-black uppercase tracking-widest text-emerald-500">
                            Do&apos;s
                        </label>
                        <textarea
                            value={dosText}
                            onChange={(e) => setDosText(e.target.value)}
                            rows={4}
                            placeholder={"e.g. Cite UGC, AICTE, or official university pages for accreditation claims\nLink to our program pages when mentioning specific degrees"}
                            className="w-full resize-y rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:border-emerald-500 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-black uppercase tracking-widest text-red-400/90">
                            Don&apos;ts
                        </label>
                        <textarea
                            value={dontsText}
                            onChange={(e) => setDontsText(e.target.value)}
                            rows={4}
                            placeholder={"e.g. Do not name or link to competitor aggregators\nDo not claim guaranteed placements or salaries"}
                            className="w-full resize-y rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:border-emerald-500 focus:outline-none"
                        />
                    </div>

                    {error && (
                        <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-400">
                            {error}
                        </p>
                    )}

                    <CtaButton
                        type="button"
                        onClick={() => void handleSave()}
                        loading={saving}
                        loadingLabel="Saving…"
                        disabled={!businessContext}
                        className="rounded-lg px-6 py-2.5 text-xs"
                    >
                        {saveStatus === "success" ? "Saved" : "Save guidelines"}
                    </CtaButton>
                </div>
            )}
        </div>
    );
}
