import { auth } from "@clerk/nextjs/server";
import { getBlogsByTemplateId } from "@/lib/blogDb";
import { DashboardClient } from "@/components/DashboardClient";
import { StrategyManagement } from "@/components/StrategyManagement";
import { DomainSetupPanel } from "@/components/DomainSetupPanel";
import { BlogHubSettings } from "@/components/BlogHubSettings";
import { IntegrationsPanel } from "@/components/IntegrationsPanel";
import { PaymentsPanel } from "@/components/PaymentsPanel";
import { SupportPanel } from "@/components/SupportPanel";
import { parulContext, parulStrategy } from "@/lib/parulMockData";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function TestDashboardPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
    const { userId } = await auth();
    const { tab = "content" } = await searchParams;

    if (!userId) {
        redirect("/");
    }

    const blogs = await getBlogsByTemplateId("test-template");
    const hasBlogs = blogs && blogs.length > 0;

    return (
        <main className="min-h-screen bg-neutral-950 p-6 md:p-12">
            <div className="mx-auto max-w-6xl">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-6 border-b border-neutral-800">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-emerald-400 uppercase mb-2">Parul Central Dashboard</h1>
                        <p className="text-neutral-400">Manage all content generated across the team for the Parul University template.</p>
                    </div>
                    <div className="mt-4 md:mt-0">
                        <Link
                            href="/test"
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
                        href="/test-dashboard?tab=content"
                        className={`pb-4 text-sm font-black uppercase tracking-widest transition-all relative ${tab === "content" ? "text-emerald-400" : "text-neutral-500 hover:text-white"}`}
                    >
                        Content
                        {tab === "content" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 animate-in fade-in slide-in-from-bottom-1" />}
                    </Link>
                    <Link
                        href="/test-dashboard?tab=settings"
                        className={`pb-4 text-sm font-black uppercase tracking-widest transition-all relative ${tab === "settings" ? "text-emerald-400" : "text-neutral-500 hover:text-white"}`}
                    >
                        Setup Hub
                        {tab === "settings" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 animate-in fade-in slide-in-from-bottom-1" />}
                    </Link>
                </div>

                {tab === "content" && (
                    <div className="animate-in fade-in duration-500">
                        {hasBlogs ? (
                            <DashboardClient initialBlogs={blogs} />
                        ) : (
                            /* First-blog CTA */
                            <div className="rounded-3xl border border-dashed border-emerald-500/20 bg-emerald-500/[0.02] p-16 text-center">
                                <div className="w-16 h-16 bg-neutral-900 border border-neutral-800 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                                    <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v16m8-8H4" />
                                    </svg>
                                </div>
                                <h3 className="text-2xl font-black text-white mb-3 uppercase tracking-tighter">Create Your First Blog Post</h3>
                                <p className="text-neutral-400 mb-2 max-w-md mx-auto leading-relaxed">
                                    Your account strategy is ready. Pick a topic from your pre-approved topics and let the AI do the heavy lifting.
                                </p>
                                <p className="text-neutral-600 text-sm mb-10">SEO-optimized · Fully structured · Ready to publish</p>
                                <Link
                                    href="/test"
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
                        <StrategyManagement mockContext={parulContext} mockStrategy={parulStrategy} />
                        <DomainSetupPanel businessContext={parulContext} isTest={true} />
                        <BlogHubSettings />
                        <IntegrationsPanel businessContext={parulContext} />
                        <PaymentsPanel />
                        <SupportPanel />
                    </div>
                )}
            </div>
        </main>
    );
}
