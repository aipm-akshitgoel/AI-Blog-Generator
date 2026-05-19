import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { getBlogsByUserId } from "@/lib/blogDb";
import type { SavedBlog } from "@/lib/blogDb";
import { DashboardClient } from "@/components/DashboardClient";
import { IntegrationsPanel } from "@/components/IntegrationsPanel";
import { BlogHubSettings } from "@/components/BlogHubSettings";
import { StrategyManagement } from "@/components/StrategyManagement";
import { DomainSetupPanel } from "@/components/DomainSetupPanel";
import { PaymentsPanel } from "@/components/PaymentsPanel";
import { SupportPanel } from "@/components/SupportPanel";
import Link from "next/link";
import { redirect } from "next/navigation";
import { listBusinessContexts } from "@/lib/businessContextDb";
import type { BusinessContext } from "@/lib/types/businessContext";
import { hasBusinessDomain, hasTopicSuggestions, resolveWriterSetupPath } from "@/lib/strategyInputs";
import { getLatestStrategySession } from "@/lib/strategyDb";

export const dynamic = 'force-dynamic';

export default async function DashboardPage({ searchParams }: { searchParams?: Promise<{ tab?: string }> }) {
    const { userId } = await auth();
    const sp = searchParams != null ? await searchParams : {};
    const tab = typeof sp.tab === "string" ? sp.tab : "content";

    if (!userId) {
        redirect("/sign-in");
    }

    let blogs: SavedBlog[] = [];
    let businessContext: BusinessContext | null = null;
    let businessContexts: BusinessContext[] = [];
    let dataLoadError = false;

    try {
        blogs = await getBlogsByUserId(userId);
    } catch (error) {
        dataLoadError = true;
    console.warn("Dashboard could not load blogs", error);
    }

    try {
        businessContexts = await listBusinessContexts(userId);
        businessContext = businessContexts?.[0] ?? null;
    } catch (error) {
        dataLoadError = true;
    console.warn("Dashboard could not load business contexts", error);
    }

    const hasBlogs = blogs.length > 0;

    let hasSavedStrategy = false;
    try {
        const bcId = businessContext?.id;
        if (bcId) {
            const session = await getLatestStrategySession(bcId, "blog");
            hasSavedStrategy = hasTopicSuggestions(session);
        } else if (businessContexts.length > 0) {
            for (const ctx of businessContexts) {
                if (!ctx.id) continue;
                const session = await getLatestStrategySession(ctx.id, "blog");
                if (hasTopicSuggestions(session)) {
                    hasSavedStrategy = true;
                    break;
                }
            }
        }
    } catch (error) {
        console.warn("Dashboard could not load strategy session", error);
    }

    const newBlogHref = resolveWriterSetupPath({
        hasBusinessDomain: hasBusinessDomain(businessContext),
        hasSavedStrategy,
        hasAnyBlogOrDraft: hasBlogs,
    });
    const anyIntegrationConnected = !!(
        businessContext?.integrations?.gscPropertyUrl ||
        businessContext?.integrations?.ga4MeasurementId ||
        businessContext?.integrations?.crmWebhookUrl
    );

    return (
        <main className="min-h-screen bg-neutral-950 px-6 pb-6 pt-8 md:px-12 md:pb-12 md:pt-10">
            <div className="mx-auto max-w-6xl">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-6 border-b border-neutral-800">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Your Content Hub</h1>
                        <div className="flex items-center gap-4">
                            <p className="text-neutral-400">Manage, analyze, and publish your AI-generated blog posts.</p>
                            <a
                                href="mailto:support@bloggieai.com"
                                className="flex md:hidden items-center gap-1.5 text-[10px] font-bold text-emerald-500/80 bg-emerald-500/5 px-2 py-1 rounded border border-emerald-500/10 uppercase tracking-widest"
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                                Support
                            </a>
                        </div>
                    </div>
                    <div className="mt-4 md:mt-0">
                        <Link
                            href={newBlogHref}
                            prefetch
                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-500 shadow-md shadow-emerald-900/20"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                            New Blog
                        </Link>
                    </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex items-center gap-8 mb-8 border-b border-neutral-800/50">
                    <Link
                        href="/dashboard?tab=content"
                        className={`pb-4 text-sm font-black uppercase tracking-widest transition-all relative ${tab === "content" ? "text-emerald-400" : "text-neutral-500 hover:text-white"}`}
                    >
                        Content
                        {tab === "content" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 animate-in fade-in slide-in-from-bottom-1" />}
                    </Link>
                    <Link
                        href="/dashboard?tab=settings"
                        className={`pb-4 text-sm font-black uppercase tracking-widest transition-all relative ${tab === "settings" ? "text-emerald-400" : "text-neutral-500 hover:text-white"}`}
                    >
                        Setup
                        {tab === "settings" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 animate-in fade-in slide-in-from-bottom-1" />}
                    </Link>
                </div>

                {dataLoadError && (
                    <div className="mb-8 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                        We could not load some dashboard data right now. You can refresh in a moment, and core actions remain available.
                    </div>
                )}

                {tab === "content" && (
                    <div className="animate-in fade-in duration-500">

                        {hasBlogs ? (
                            <DashboardClient initialBlogs={blogs} newBlogHref={newBlogHref} />
                        ) : (
                            /* First-blog CTA */
                            <div className="rounded-3xl border border-dashed border-emerald-500/20 bg-emerald-500/[0.02] p-16 text-center">
                                <div className="w-16 h-16 bg-neutral-900 border border-neutral-800 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                                    <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v16m8-8H4" />
                                    </svg>
                                </div>
                                <h3 className="text-2xl font-black text-white mb-10 uppercase tracking-tighter">Create Your First Blog Post</h3>
                                <Link
                                    href={newBlogHref}
                                    prefetch
                                    className="inline-flex items-center gap-3 rounded-2xl bg-emerald-600 px-10 py-5 text-sm font-black text-white transition-all hover:bg-emerald-500 shadow-2xl shadow-emerald-900/40 hover:-translate-y-1 active:scale-95 uppercase tracking-widest border border-emerald-400/20"
                                >
                                    Start Writing
                                </Link>
                            </div>
                        )}
                    </div>
                )}

                {tab === "settings" && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <StrategyManagement />
                        <DomainSetupPanel businessContext={businessContext} />
                        <BlogHubSettings />
                        <IntegrationsPanel businessContext={businessContext} />
                        <PaymentsPanel />
                        <SupportPanel />
                    </div>
                )}
            </div>
        </main>
    );
}
