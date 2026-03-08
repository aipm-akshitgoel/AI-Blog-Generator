import { auth } from "@clerk/nextjs/server";
import { getBlogsByTemplateId } from "@/lib/blogDb";
import { DashboardClient } from "@/components/DashboardClient";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function TestDashboardPage() {
    const { userId } = await auth();

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
            </div>
        </main>
    );
}
