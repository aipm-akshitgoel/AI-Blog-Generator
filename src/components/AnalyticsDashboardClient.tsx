"use client";

import { useState, useEffect } from "react";
import type { BusinessContext } from "@/lib/types/businessContext";
import Link from "next/link";

interface Props {
    blogId: string;
    businessContext?: BusinessContext | null;
}

type ConnectionStatus = "loading" | "not_connected" | "connected" | "error";

interface ServiceCard {
    key: "gsc" | "ga4" | "crm";
    label: string;
    description: string;
    helpUrl: string;
    helpText: string;
    connected: boolean;
    color: string;
    icon: React.ReactNode;
}

function StatusBadge({ connected }: { connected: boolean }) {
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

export function AnalyticsDashboardClient({ blogId, businessContext }: Props) {
    const [status, setStatus] = useState<ConnectionStatus>("loading");
    const [analyticsData, setAnalyticsData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const integrations = businessContext?.integrations;

    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        gscPropertyUrl: integrations?.gscPropertyUrl || "",
        ga4MeasurementId: integrations?.ga4MeasurementId || "",
        crmWebhookUrl: integrations?.crmWebhookUrl || "",
    });

    const handleSave = async () => {
        if (!businessContext?.id) return;
        setSaving(true);
        setError(null);
        try {
            const updated = {
                ...businessContext,
                integrations: {
                    gscPropertyUrl: form.gscPropertyUrl.trim() || undefined,
                    ga4MeasurementId: form.ga4MeasurementId.trim() || undefined,
                    crmWebhookUrl: form.crmWebhookUrl.trim() || undefined,
                }
            };
            const res = await fetch("/api/business-context", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updated),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Save failed");
            window.location.reload();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };
    const hasGSC = !!integrations?.gscPropertyUrl?.trim();
    const hasGA4 = !!integrations?.ga4MeasurementId?.trim();
    const hasCRM = !!integrations?.crmWebhookUrl?.trim();
    const anyConnected = hasGSC || hasGA4 || hasCRM;

    useEffect(() => {
        const fetchAnalytics = async () => {
            setStatus("loading");
            try {
                const res = await fetch("/api/analytics-agent", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ blogId, businessContext }),
                });

                const data = await res.json();

                if (res.status === 424 && data.error === "INTEGRATIONS_NOT_CONNECTED") {
                    setStatus("not_connected");
                    return;
                }
                if (!res.ok) throw new Error(data.error || "Failed to fetch analytics");

                setAnalyticsData(data);
                setStatus("connected");
            } catch (err) {
                setError(err instanceof Error ? err.message : "Network error");
                setStatus("error");
            }
        };
        fetchAnalytics();
    }, [blogId, businessContext]);

    // ── Loading ───────────────────────────────────────────────────────────────
    if (status === "loading") {
        return (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-12 text-center animate-pulse">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-800">
                    <svg className="w-6 h-6 animate-spin text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </div>
                <p className="text-sm text-neutral-500">Checking connections...</p>
            </div>
        );
    }

    // ── Error ────────────────────────────────────────────────────────────────
    if (status === "error") {
        return (
            <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-6 text-red-400">
                <h3 className="font-bold mb-1">Analytics Error</h3>
                <p className="text-sm">{error}</p>
            </div>
        );
    }

    // ── Not Connected — main gated state ─────────────────────────────────────
    if (status === "not_connected") {
        return (
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start gap-4 rounded-xl border border-amber-800/40 bg-amber-900/10 px-5 py-4">
                    <svg className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    <div>
                        <p className="text-sm font-semibold text-amber-300">Analytics tools are not connected</p>
                        <p className="text-xs text-amber-500 mt-0.5">Connect your accounts below to see real traffic, rankings and leads — no made-up numbers.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <IntegrationCard
                        icon={<GoogleSearchIcon />}
                        label="Google Search Console"
                        description="See real impressions, clicks, CTR and your average Google ranking position."
                        helpLabel="Where to find your property URL →"
                        helpUrl="https://search.google.com/search-console"
                        connected={hasGSC}
                        credentialLabel="Property URL"
                        credentialPlaceholder="https://www.yoursalon.com/"
                        helpTip="In Google Search Console, copy the URL from the top-left property picker."
                        value={form.gscPropertyUrl}
                        onChange={(val) => setForm(f => ({ ...f, gscPropertyUrl: val }))}
                        onSave={handleSave}
                        saving={saving}
                    />
                    <IntegrationCard
                        icon={<GA4Icon />}
                        label="Google Analytics 4"
                        description="Track real page views, sessions and user engagement from your website."
                        helpLabel="Find your Measurement ID →"
                        helpUrl="https://analytics.google.com"
                        connected={hasGA4}
                        credentialLabel="Measurement ID"
                        credentialPlaceholder="G-XXXXXXXXXX"
                        helpTip="In GA4 go to Admin → Data Streams → your stream → Measurement ID."
                        value={form.ga4MeasurementId}
                        onChange={(val) => setForm(f => ({ ...f, ga4MeasurementId: val }))}
                        onSave={handleSave}
                        saving={saving}
                    />
                    <IntegrationCard
                        icon={<CRMIcon />}
                        label="CRM / Lead Sync (MCP)"
                        description="Sync leads generated from blog CTAs directly into your CRM via webhook."
                        helpLabel="What is an MCP endpoint? →"
                        helpUrl="https://docs.anthropic.com/en/docs/agents-and-tools/mcp"
                        connected={hasCRM}
                        credentialLabel="Webhook / MCP URL"
                        credentialPlaceholder="https://your-crm.com/webhook/..."
                        helpTip="This is the inbound webhook URL from your CRM (HubSpot, Pipedrive, etc.) or an MCP server endpoint."
                        value={form.crmWebhookUrl}
                        onChange={(val) => setForm(f => ({ ...f, crmWebhookUrl: val }))}
                        onSave={handleSave}
                        saving={saving}
                    />
                </div>

                <DummyMetrics />
            </div>
        );
    }

    // ── Connected — show real data (per-service stubs until OAuth is live) ────
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-900/30 text-blue-400 border border-blue-800/50">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Analytics & Observability</h2>
                    <p className="text-sm text-neutral-400">Live data from your connected accounts.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {analyticsData?.gsc?.connected && (
                    <ConnectedServicePanel
                        label="Google Search Console"
                        icon={<GoogleSearchIcon />}
                        note={analyticsData.gsc.note}
                        property={analyticsData.gsc.propertyUrl}
                    />
                )}
                {analyticsData?.ga4?.connected && (
                    <ConnectedServicePanel
                        label="Google Analytics 4"
                        icon={<GA4Icon />}
                        note={analyticsData.ga4.note}
                        property={analyticsData.ga4.measurementId}
                    />
                )}
                {analyticsData?.crm?.connected && (
                    <ConnectedServicePanel
                        label="CRM / Lead Sync"
                        icon={<CRMIcon />}
                        note={analyticsData.crm.note}
                        property={analyticsData.crm.webhookUrl}
                    />
                )}
            </div>
        </div>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function IntegrationCard({
    icon, label, description, helpLabel, helpUrl, connected, credentialLabel, credentialPlaceholder, helpTip,
    value, onChange, onSave, saving
}: {
    icon: React.ReactNode; label: string; description: string;
    helpLabel: string; helpUrl: string; connected: boolean;
    credentialLabel: string; credentialPlaceholder: string; helpTip: string;
    value: string; onChange: (val: string) => void; onSave: () => void; saving: boolean;
}) {
    const [open, setOpen] = useState(false);

    return (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-400">{icon}</div>
                    <span className="text-sm font-semibold text-neutral-200">{label}</span>
                </div>
                <StatusBadge connected={connected} />
            </div>
            <p className="text-xs text-neutral-500 leading-relaxed">{description}</p>
            {!connected && (
                <>
                    {open ? (
                        <div className="space-y-2 mt-2">
                            <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">{credentialLabel}</label>
                            <input
                                type="text"
                                value={value}
                                onChange={e => onChange(e.target.value)}
                                placeholder={credentialPlaceholder}
                                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500"
                            />
                            <p className="text-[11px] text-neutral-600 italic">{helpTip}</p>
                            <a href={helpUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-emerald-500 hover:underline mb-2 block">{helpLabel}</a>
                            <button onClick={onSave} disabled={saving} className="w-full text-center text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg px-3 py-2 transition-colors">
                                {saving ? "Saving..." : "Connect Now"}
                            </button>
                        </div>
                    ) : (
                        <button onClick={() => setOpen(true)} className="mt-auto text-xs text-emerald-500 font-semibold hover:underline self-start">
                            Connect Now →
                        </button>
                    )}
                </>
            )}
        </div>
    );
}

function ConnectedServicePanel({ label, icon, note, property }: { label: string; icon: React.ReactNode; note: string; property: string }) {
    return (
        <div className="rounded-xl border border-emerald-800/30 bg-emerald-950/10 p-5">
            <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-900/30 flex items-center justify-center text-emerald-400">{icon}</div>
                <span className="text-sm font-semibold text-emerald-300">{label}</span>
            </div>
            <p className="text-[11px] text-emerald-600 font-mono break-all mb-2">{property}</p>
            <p className="text-xs text-neutral-500 italic">{note}</p>
        </div>
    );
}

// ── Icons ──────────────────────────────────────────────────────────────────────
function GoogleSearchIcon() {
    return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" /></svg>;
}
function GA4Icon() {
    return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M22.84 2.998C21.866 1.613 20.4.8 18.72.8c-2.506 0-4.533 2.027-4.533 4.533v4.88L8.733 5.76C8.027 5.12 7.12 4.8 6.213 4.8c-2.24 0-4.16 1.813-4.16 4.053 0 1.014.373 1.974 1.04 2.72L8.48 17.2H2.4c-.88 0-1.6.72-1.6 1.6s.72 1.6 1.6 1.6h19.2c.88 0 1.6-.72 1.6-1.6V6.667c0-1.414-.614-2.72-1.36-3.67z" /></svg>;
}
function CRMIcon() {
    return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
}

function DummyMetrics() {
    return (
        <div className="mt-8 pt-6 border-t border-neutral-800">
            <div className="flex items-center gap-2 mb-4">
                <span className="bg-neutral-800 text-neutral-400 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border border-neutral-700">Dummy Data</span>
                <h3 className="text-sm font-bold text-neutral-200">Sample Analytics Overview</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 opacity-60 grayscale-[0.5] pointer-events-none">
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
                    <p className="text-xs text-neutral-500 font-medium mb-1">Google Search Console</p>
                    <div className="flex items-end gap-2 mb-3">
                        <span className="text-3xl font-black text-white">12.4k</span>
                        <span className="text-xs text-emerald-400 font-bold mb-1">+14%</span>
                    </div>
                    <div className="flex justify-between text-xs text-neutral-400">
                        <span>Impressions</span>
                        <span className="text-white font-medium">12.4k</span>
                    </div>
                    <div className="flex justify-between text-xs text-neutral-400 mt-1">
                        <span>Clicks</span>
                        <span className="text-white font-medium">3.2k</span>
                    </div>
                    <div className="flex justify-between text-xs text-neutral-400 mt-1">
                        <span>Avg. Position</span>
                        <span className="text-white font-medium">4.2</span>
                    </div>
                </div>

                <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
                    <p className="text-xs text-neutral-500 font-medium mb-1">Google Analytics 4</p>
                    <div className="flex items-end gap-2 mb-3">
                        <span className="text-3xl font-black text-white">8,432</span>
                        <span className="text-xs text-emerald-400 font-bold mb-1">+8%</span>
                    </div>
                    <div className="flex justify-between text-xs text-neutral-400">
                        <span>Page Views</span>
                        <span className="text-white font-medium">8,432</span>
                    </div>
                    <div className="flex justify-between text-xs text-neutral-400 mt-1">
                        <span>Avg. Session Time</span>
                        <span className="text-white font-medium">4m 12s</span>
                    </div>
                    <div className="flex justify-between text-xs text-neutral-400 mt-1">
                        <span>Bounce Rate</span>
                        <span className="text-white font-medium">42%</span>
                    </div>
                </div>

                <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
                    <p className="text-xs text-neutral-500 font-medium mb-1">CRM Leads (MCP)</p>
                    <div className="flex items-end gap-2 mb-3">
                        <span className="text-3xl font-black text-white">24</span>
                        <span className="text-xs text-emerald-400 font-bold mb-1">+2</span>
                    </div>
                    <div className="flex justify-between text-xs text-neutral-400">
                        <span>New Leads</span>
                        <span className="text-white font-medium">24</span>
                    </div>
                    <div className="flex justify-between text-xs text-neutral-400 mt-1">
                        <span>Conversion Rate</span>
                        <span className="text-white font-medium">3.4%</span>
                    </div>
                    <div className="flex justify-between text-xs text-neutral-400 mt-1">
                        <span>Sync Status</span>
                        <span className="text-emerald-400 font-medium">Active</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
