"use client";

import { useState } from "react";
import { HelpTip } from "./HelpTip";
import type { BusinessContext } from "@/lib/types/businessContext";

interface Props {
    businessContext: BusinessContext | null;
    onUpdate?: (updated: BusinessContext) => void;
}

interface FormState {
    gscPropertyUrl: string;
    ga4MeasurementId: string;
    crmWebhookUrl: string;
}

function ConnectedBadge({ connected }: { connected: boolean }) {
    return connected ? (
        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-900/30 border border-emerald-800/50 px-2 py-0.5 rounded-full uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Connected
        </span>
    ) : (
        <span className="flex items-center gap-1 text-[10px] font-bold text-neutral-500 bg-neutral-800 border border-neutral-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
            Not Connected
        </span>
    );
}

export function IntegrationsPanel({ businessContext, onUpdate }: Props) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const integrations = businessContext?.integrations;

    const [form, setForm] = useState<FormState>({
        gscPropertyUrl: integrations?.gscPropertyUrl || "",
        ga4MeasurementId: integrations?.ga4MeasurementId || "",
        crmWebhookUrl: integrations?.crmWebhookUrl || "",
    });

    const anyConnected = !!(integrations?.gscPropertyUrl || integrations?.ga4MeasurementId || integrations?.crmWebhookUrl);

    const handleSave = async () => {
        if (!businessContext?.id) {
            setError("Business context not found. Please complete Account Setup first.");
            return;
        }
        setSaving(true);
        setError(null);
        setSaved(false);
        try {
            const updated: BusinessContext = {
                ...businessContext,
                integrations: {
                    gscPropertyUrl: form.gscPropertyUrl.trim() || undefined,
                    ga4MeasurementId: form.ga4MeasurementId.trim() || undefined,
                    crmWebhookUrl: form.crmWebhookUrl.trim() || undefined,
                },
            };
            const res = await fetch("/api/business-context", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updated),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Save failed");
            setSaved(true);
            onUpdate?.(data);
            setTimeout(() => setSaved(false), 3000);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="mb-8 rounded-xl border border-neutral-800 bg-neutral-900/40 p-1">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 md:p-6 text-left focus:outline-none rounded-lg hover:bg-neutral-800/50 transition-colors"
            >
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-3 tracking-tight">
                        <div className="flex w-8 h-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                        </div>
                        Analytics & Integrations
                    </h2>
                    <p className="text-neutral-400 text-sm mt-1 sm:ml-11">
                        Connect Google Search Console, GA4, and your CRM to see real data.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <ConnectedBadge connected={anyConnected} />
                    <svg className={`w-6 h-6 text-neutral-500 transform transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {isExpanded && (
                <div className="p-4 md:p-6 border-t border-neutral-800 animate-in slide-in-from-top-4 duration-300 space-y-6">

                    {/* Not-connected nudge */}
                    {!anyConnected && (
                        <div className="flex items-start gap-3 rounded-lg bg-amber-900/15 border border-amber-800/40 px-4 py-3">
                            <svg className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                            </svg>
                            <p className="text-xs text-amber-300">No integrations connected yet. Fill in at least one field below and click Save to start seeing real analytics instead of placeholders.</p>
                        </div>
                    )}

                    {/* Credential fields */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                        {/* GSC */}
                        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-6 space-y-4 flex flex-col">
                            <div className="flex items-center justify-between">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9L17 12l-6 4.5z" />
                                    </svg>
                                </div>
                                <ConnectedBadge connected={!!integrations?.gscPropertyUrl} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-neutral-200">Google Search Console</h3>
                                <p className="text-[11px] text-neutral-500 mt-1">Track real impressions, clicks, and Google rankings.</p>
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 block mb-2">Property URL</label>
                                <input
                                    type="url"
                                    value={form.gscPropertyUrl}
                                    onChange={e => setForm(f => ({ ...f, gscPropertyUrl: e.target.value }))}
                                    placeholder="https://www.yourdomain.com/"
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono transition-all"
                                />
                            </div>
                            <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-emerald-500 hover:text-emerald-400 transition-colors flex items-center gap-1">
                                Connect now →
                                <HelpTip text="Click to open GSC, then copy the URL from the property picker in the top-left. Must match your site's exact URL." />
                            </a>
                        </div>

                        {/* GA4 */}
                        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-6 space-y-4 flex flex-col">
                            <div className="flex items-center justify-between">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </div>
                                <ConnectedBadge connected={!!integrations?.ga4MeasurementId} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-neutral-200">Google Analytics 4</h3>
                                <p className="text-[11px] text-neutral-500 mt-1">Monitor page views, sessions, and user behavior.</p>
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 block mb-2">Measurement ID</label>
                                <input
                                    type="text"
                                    value={form.ga4MeasurementId}
                                    onChange={e => setForm(f => ({ ...f, ga4MeasurementId: e.target.value }))}
                                    placeholder="G-XXXXXXXXXX"
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono transition-all"
                                />
                            </div>
                            <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-emerald-500 hover:text-emerald-400 transition-colors flex items-center gap-1">
                                Connect now →
                                <HelpTip text="In GA4: Admin → Data Streams → click your stream → copy the Measurement ID (starts with G-)." />
                            </a>
                        </div>

                        {/* CRM / MCP */}
                        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-6 space-y-4 flex flex-col">
                            <div className="flex items-center justify-between">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                                <ConnectedBadge connected={!!integrations?.crmWebhookUrl} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-neutral-200">CRM / Lead Sync (MCP)</h3>
                                <p className="text-[11px] text-neutral-500 mt-1">Sync blog leads directly to HubSpot, Zapier, etc.</p>
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 block mb-2">Webhook URL</label>
                                <input
                                    type="url"
                                    value={form.crmWebhookUrl}
                                    onChange={e => setForm(f => ({ ...f, crmWebhookUrl: e.target.value }))}
                                    placeholder="https://your-crm.com/webhook/..."
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono transition-all"
                                />
                            </div>
                            <a href="https://docs.anthropic.com/en/docs/agents-and-tools/mcp" target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-emerald-500 hover:text-emerald-400 transition-colors flex items-center gap-1">
                                Connect now →
                                <HelpTip text="Get this from your CRM's 'Integrations' or 'Webhooks' section. Works with any MCP-compatible endpoint." />
                            </a>
                        </div>
                    </div>

                    {/* Save bar */}
                    <div className="flex items-center justify-between border-t border-neutral-800 pt-4">
                        {error && <p className="text-xs text-red-400">{error}</p>}
                        {saved && <p className="text-xs text-emerald-400 font-semibold">✓ Credentials saved</p>}
                        {!error && !saved && <p className="text-xs text-neutral-600">Changes are saved to your business profile and used for analytics.</p>}
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="ml-auto flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-black text-white hover:bg-emerald-500 transition-all disabled:opacity-50 uppercase tracking-widest active:scale-95"
                        >
                            {saving ? (
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                            ) : null}
                            {saving ? "Saving..." : "Save Integrations"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
