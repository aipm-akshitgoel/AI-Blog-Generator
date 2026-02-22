"use client";

import { useState, useEffect } from "react";
import { BusinessContext, BUSINESS_TYPES } from "@/lib/types/businessContext";
import type { StrategySession, TopicOption } from "@/lib/types/strategy";

export function StrategyManagement() {
    const [context, setContext] = useState<BusinessContext | null>(null);
    const [strategy, setStrategy] = useState<StrategySession | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isExpanded, setIsExpanded] = useState(true);

    // Edit form state
    const [editForm, setEditForm] = useState({
        businessName: "",
        businessType: "salon",
        city: "",
        region: "",
        country: "",
        services: "",
        targetAudience: "",
        positioning: "",
        primaryKeyword: "",
        secondaryKeywords: "",
        searchIntent: "informational" as "informational" | "navigational" | "commercial" | "transactional",
        topics: [] as TopicOption[],
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/business-context");
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to fetch contexts");

            if (data.length > 0) {
                const ctx = data[0];
                setContext(ctx);
                setIsExpanded(false); // Contract it if they already have one

                // Fetch its strategy
                const stratRes = await fetch(`/api/strategy-session?businessContextId=${ctx.id}`);
                const stratData = await stratRes.json();
                if (stratRes.ok && stratData && !stratData.error) {
                    setStrategy(stratData);
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const openEdit = () => {
        if (!context) return;
        setEditForm({
            businessName: context.businessName ?? "",
            businessType: context.businessType ?? "salon",
            city: context.location?.city ?? "",
            region: context.location?.region ?? "",
            country: context.location?.country ?? "",
            services: context.services?.join(", ") ?? "",
            targetAudience: context.targetAudience ?? "",
            positioning: context.positioning ?? "",
            primaryKeyword: strategy?.keywordStrategy?.primaryKeyword ?? "",
            secondaryKeywords: strategy?.keywordStrategy?.secondaryKeywords?.join(", ") ?? "",
            searchIntent: strategy?.keywordStrategy?.searchIntent ?? "informational",
            topics: strategy?.topicOptions ? [...strategy.topicOptions] : [],
        });
        setIsEditing(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const updatedContext = {
                businessName: editForm.businessName.trim(),
                businessType: editForm.businessType,
                location: {
                    city: editForm.city.trim() || undefined,
                    region: editForm.region.trim() || undefined,
                    country: editForm.country.trim() || undefined,
                },
                services: editForm.services.split(",").map((s: string) => s.trim()).filter(Boolean),
                targetAudience: editForm.targetAudience.trim(),
                positioning: editForm.positioning.trim(),
            };

            const ctxRes = await fetch("/api/business-context", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedContext),
            });
            const ctxData = await ctxRes.json();
            if (!ctxRes.ok) throw new Error(ctxData.error ?? "Failed to save profile");
            setContext(ctxData);

            // Save strategy if one exists or edit form has keyword data
            if (strategy || editForm.primaryKeyword.trim()) {
                const updatedStrategy = {
                    ...(strategy ?? {}),
                    businessContextId: ctxData.id,
                    keywordStrategy: {
                        primaryKeyword: editForm.primaryKeyword.trim(),
                        secondaryKeywords: editForm.secondaryKeywords.split(",").map((k: string) => k.trim()).filter(Boolean),
                        searchIntent: editForm.searchIntent,
                    },
                    topicOptions: editForm.topics,
                    status: "approved" as const,
                };
                const stratRes = await fetch("/api/strategy-session", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(updatedStrategy),
                });
                const stratData = await stratRes.json();
                if (stratRes.ok) setStrategy(stratData);
            }

            setIsEditing(false);
        } catch (err) {
            alert(err instanceof Error ? err.message : "Save failed");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!context?.id) return;
        if (!confirm("Are you sure? This will permanently delete your business profile and SEO strategy. This cannot be undone.")) return;

        try {
            setLoading(true);

            // 1. Delete Strategy
            if (strategy?.id) {
                await fetch(`/api/strategy-session?id=${strategy.id}`, { method: "DELETE" });
            }

            // 2. Delete Business Context
            await fetch(`/api/business-context?id=${context.id}`, { method: "DELETE" });

            // 3. Clear local state so it shows the empty/setup prompt screen
            setContext(null);
            setStrategy(null);

        } catch (err) {
            console.error(err);
            alert(err instanceof Error ? err.message : "Delete failed");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="mt-12 animate-pulse">
            <div className="h-8 w-64 bg-neutral-900 rounded mb-6"></div>
            <div className="h-56 bg-neutral-900 rounded-3xl border border-neutral-800"></div>
        </div>
    );

    return (
        <section className="mb-8 rounded-xl border border-neutral-800 bg-neutral-900/40 p-1">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 md:p-6 text-left focus:outline-none rounded-lg hover:bg-neutral-800/50 transition-colors"
            >
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            Business Profile &amp; Strategy
                        </h2>
                        <p className="text-sm text-neutral-400 mt-1">
                            Required for all AI content generation • Account-level singleton
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                    <span className="hidden md:inline-flex px-2.5 py-1 text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-lg backdrop-blur-sm">
                        Active Profile
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
                    {!context ? (
                        <div className="rounded-3xl border border-dashed border-emerald-500/20 p-16 text-center bg-emerald-500/[0.02]">
                            <div className="w-16 h-16 bg-neutral-900 border border-neutral-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <p className="text-neutral-400 mb-6 text-lg font-medium">No business profile has been set up for this account yet.</p>
                            <a
                                href="/setup"
                                className="inline-flex items-center gap-3 rounded-2xl bg-emerald-600 px-8 py-4 text-sm font-black text-white hover:bg-emerald-500 shadow-xl shadow-emerald-900/30 active:scale-95 uppercase tracking-widest"
                            >
                                Setup Business Profile
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                            </a>
                        </div>
                    ) : isEditing ? (
                        /* ── EDIT MODE ─────────────────────────────────────── */
                        <div className="rounded-[2rem] border border-emerald-500/20 bg-emerald-500/[0.02] p-8 animate-in fade-in zoom-in-95 duration-500">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5M16.586 3.586a2 2 0 112.828 2.828l-8.485 8.485-3 1-1-3 8.485-8.485z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Edit Business Strategy</h3>
                                    <p className="text-xs text-neutral-500">Update your business profile and SEO keyword strategy.</p>
                                </div>
                            </div>

                            <form onSubmit={handleSave} className="space-y-6">
                                {/* ── Business Profile ──────────────────────────── */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <h4 className="text-[10px] uppercase font-black text-emerald-500 tracking-[0.2em] opacity-80">Business Profile</h4>
                                        <div className="h-px flex-1 bg-neutral-800/50"></div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">Business Name</label>
                                            <input type="text" value={editForm.businessName} onChange={e => setEditForm(f => ({ ...f, businessName: e.target.value }))}
                                                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 focus:border-emerald-500/50 outline-none transition-all" required />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">Business Type</label>
                                            <select value={editForm.businessType} onChange={e => setEditForm(f => ({ ...f, businessType: e.target.value }))}
                                                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 focus:border-emerald-500/50 outline-none transition-all">
                                                {BUSINESS_TYPES.map(({ value, label }) => (
                                                    <option key={value} value={value}>{label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        {["city", "region", "country"].map(field => (
                                            <div key={field}>
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">{field}</label>
                                                <input type="text" value={(editForm as any)[field]} onChange={e => setEditForm(f => ({ ...f, [field]: e.target.value }))}
                                                    className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 focus:border-emerald-500/50 outline-none transition-all" />
                                            </div>
                                        ))}
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">Services (comma-separated)</label>
                                        <input type="text" value={editForm.services} onChange={e => setEditForm(f => ({ ...f, services: e.target.value }))}
                                            className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 focus:border-emerald-500/50 outline-none transition-all" placeholder="Haircuts, Styling, Extensions" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">Target Audience</label>
                                        <textarea value={editForm.targetAudience} onChange={e => setEditForm(f => ({ ...f, targetAudience: e.target.value }))} rows={2}
                                            className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 focus:border-emerald-500/50 outline-none transition-all resize-none" required />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">Brand Positioning</label>
                                        <textarea value={editForm.positioning} onChange={e => setEditForm(f => ({ ...f, positioning: e.target.value }))} rows={2}
                                            className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 focus:border-emerald-500/50 outline-none transition-all resize-none" required />
                                    </div>
                                </div>

                                {/* ── SEO Strategy ──────────────────────────────── */}
                                <div className="space-y-4 pt-6 border-t border-neutral-800/50">
                                    <div className="flex items-center gap-3">
                                        <h4 className="text-[10px] uppercase font-black text-emerald-500 tracking-[0.2em] opacity-80">SEO Strategy</h4>
                                        <div className="h-px flex-1 bg-neutral-800/50"></div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">Primary Keyword</label>
                                            <input type="text" value={editForm.primaryKeyword} onChange={e => setEditForm(f => ({ ...f, primaryKeyword: e.target.value }))}
                                                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 focus:border-emerald-500/50 outline-none transition-all" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">Search Intent</label>
                                            <select value={editForm.searchIntent} onChange={e => setEditForm(f => ({ ...f, searchIntent: e.target.value as any }))}
                                                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 focus:border-emerald-500/50 outline-none transition-all">
                                                <option value="informational">Informational</option>
                                                <option value="commercial">Commercial</option>
                                                <option value="transactional">Transactional</option>
                                                <option value="navigational">Navigational</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">Secondary Keywords (comma-separated)</label>
                                        <input type="text" value={editForm.secondaryKeywords} onChange={e => setEditForm(f => ({ ...f, secondaryKeywords: e.target.value }))}
                                            className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 focus:border-emerald-500/50 outline-none transition-all" placeholder="keyword1, keyword2" />
                                    </div>

                                    {editForm.topics.length > 0 && (
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3">Topics</label>
                                            <div className="space-y-3">
                                                {editForm.topics.map((topic: TopicOption, i: number) => (
                                                    <div key={i} className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/50 space-y-2">
                                                        <input type="text" value={topic.title}
                                                            onChange={e => {
                                                                const t = [...editForm.topics];
                                                                t[i] = { ...t[i], title: e.target.value };
                                                                setEditForm(f => ({ ...f, topics: t }));
                                                            }}
                                                            className="w-full bg-transparent text-sm font-black text-neutral-200 outline-none focus:text-emerald-400 transition-colors uppercase" />
                                                        <textarea value={topic.description} rows={2}
                                                            onChange={e => {
                                                                const t = [...editForm.topics];
                                                                t[i] = { ...t[i], description: e.target.value };
                                                                setEditForm(f => ({ ...f, topics: t }));
                                                            }}
                                                            className="w-full bg-transparent text-xs text-neutral-500 outline-none resize-none font-medium" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-4 pt-4 border-t border-neutral-800/50">
                                    <button type="button" onClick={() => setIsEditing(false)}
                                        className="flex-1 rounded-xl border border-neutral-800 px-6 py-4 text-sm font-black text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all uppercase tracking-widest">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={saving}
                                        className="flex-[2] rounded-xl bg-emerald-600 px-6 py-4 text-sm font-black text-white hover:bg-emerald-500 disabled:opacity-50 transition-all shadow-xl shadow-emerald-900/20 uppercase tracking-widest active:scale-[0.98]">
                                        {saving ? "Saving…" : "Apply Updates"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        /* ── VIEW MODE ─────────────────────────────────────── */
                        <div className="group relative rounded-[2rem] border border-emerald-500/10 bg-neutral-900/40 p-8 lg:p-10 hover:bg-neutral-900/60 hover:border-emerald-500/30 shadow-2xl overflow-hidden backdrop-blur-md transition-all">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"></div>
                            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px]"></div>

                            <div className="relative z-10 flex flex-col lg:flex-row lg:items-start justify-between gap-10">
                                <div className="flex-1 space-y-8">
                                    {/* Business Info */}
                                    <div>
                                        <div className="flex items-center gap-4 mb-3">
                                            <h3 className="text-4xl font-black text-white tracking-tighter uppercase">{context.businessName}</h3>
                                            <span className="text-[11px] font-black uppercase bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-lg border border-emerald-500/20 tracking-tighter">
                                                {context.businessType}
                                            </span>
                                        </div>
                                        <p className="text-xl text-neutral-300 font-medium leading-relaxed max-w-3xl opacity-90">{context.positioning}</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 border-y border-neutral-800/50 py-8">
                                        <div className="space-y-3">
                                            <h4 className="text-[10px] uppercase font-black text-emerald-500 tracking-[0.2em] opacity-70">Target Audience</h4>
                                            <p className="text-base text-neutral-200 font-semibold">{context.targetAudience}</p>
                                        </div>
                                        <div className="space-y-3">
                                            <h4 className="text-[10px] uppercase font-black text-emerald-500 tracking-[0.2em] opacity-70">Target Region</h4>
                                            <div className="flex items-center gap-3 text-base text-neutral-200 font-semibold">
                                                <div className="w-9 h-9 rounded-xl bg-neutral-950 border border-neutral-800/50 flex items-center justify-center text-emerald-500">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                    </svg>
                                                </div>
                                                {context.location?.city}{context.location?.country ? `, ${context.location.country}` : ""}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-[10px] uppercase font-black text-emerald-500 tracking-[0.2em] opacity-70">Service Catalog</h4>
                                        <div className="flex flex-wrap gap-2.5">
                                            {context.services?.map((s, idx) => (
                                                <span key={idx} className="bg-neutral-950 text-neutral-400 text-[11px] font-black uppercase tracking-widest px-4 py-2.5 rounded-2xl border border-neutral-800 hover:border-emerald-500/20 cursor-default transition-colors">
                                                    {s}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* ── Strategy Section ── */}
                                    {strategy ? (
                                        <div className="mt-2 border-t border-neutral-800/50 pt-8 space-y-8">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                                <div className="space-y-4">
                                                    <h4 className="text-[10px] uppercase font-black text-emerald-500 tracking-[0.2em] opacity-70">Primary Search Focus</h4>
                                                    <div className="bg-emerald-950/20 border border-emerald-500/10 rounded-2xl p-6">
                                                        <p className="text-2xl font-black text-emerald-400 mb-2 uppercase tracking-tight">
                                                            {strategy.keywordStrategy.primaryKeyword}
                                                        </p>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Intent:</span>
                                                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                                                {strategy.keywordStrategy.searchIntent}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <h4 className="text-[10px] uppercase font-black text-emerald-500 tracking-[0.2em] opacity-70">Supporting Keywords</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {strategy.keywordStrategy.secondaryKeywords?.map((kw, i) => (
                                                            <span key={i} className="text-[11px] font-bold text-neutral-400 border border-neutral-800 bg-neutral-950 px-3 py-1.5 rounded-xl uppercase tracking-tighter">
                                                                {kw}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <h4 className="text-[10px] uppercase font-black text-emerald-500 tracking-[0.2em] opacity-70">Topics</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {strategy.topicOptions?.map((topic, i) => (
                                                        <div key={i} className="bg-neutral-950/40 border border-neutral-800/50 rounded-2xl p-5 hover:border-emerald-500/20 transition-colors">
                                                            <h5 className="text-sm font-black text-neutral-200 mb-1 uppercase tracking-tight">{topic.title}</h5>
                                                            <p className="text-xs text-neutral-500 leading-relaxed font-medium line-clamp-2">{topic.description}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="border-t border-neutral-800/50 pt-8">
                                            <div className="rounded-2xl border border-dashed border-neutral-800 p-6 text-center">
                                                <p className="text-neutral-500 text-sm font-medium mb-3">No SEO strategy generated yet.</p>
                                                <a href="/setup" className="text-[11px] font-black text-emerald-500 uppercase tracking-widest hover:text-emerald-400 transition-colors">
                                                    Run Strategy Agent →
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Action buttons */}
                                <div className="flex flex-row lg:flex-col gap-4 shrink-0 pt-10 lg:pt-0 border-t border-neutral-800/50 lg:border-t-0 min-w-[200px]">
                                    <button
                                        onClick={openEdit}
                                        className="flex-1 flex items-center justify-center gap-3 rounded-2xl bg-emerald-600 px-8 py-5 text-sm font-black text-white transition-all hover:bg-emerald-500 shadow-2xl shadow-emerald-900/40 hover:-translate-y-1 active:scale-95 uppercase tracking-widest border border-emerald-400/20"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5M16.586 3.586a2 2 0 112.828 2.828l-8.485 8.485-3 1-1-3 8.485-8.485z" />
                                        </svg>
                                        Edit Profile
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        className="group/del flex items-center justify-center gap-3 p-5 text-neutral-500 hover:text-red-400 hover:bg-red-400/10 rounded-2xl transition-all border border-neutral-800/50 hover:border-red-400/20"
                                        title="Delete Profile"
                                    >
                                        <svg className="w-6 h-6 transition-transform group-hover/del:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        <span className="lg:hidden font-black text-xs uppercase tracking-widest">Delete</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
