import { auth } from "@clerk/nextjs/server";
import { getBlogById } from "@/lib/mockDb";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AnalyticsDashboardClient } from "@/components/AnalyticsDashboardClient";
import { RawPayloadViewer } from "@/components/RawPayloadViewer";
import { listBusinessContexts } from "@/lib/businessContextDb";

export const dynamic = 'force-dynamic';

export default async function BlogDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { userId } = await auth();
    if (!userId) {
        redirect("/");
    }

    const resolvedParams = await params;
    const blog = await getBlogById(resolvedParams.id, userId);

    // Fetch business context to check integration credentials
    const contexts = await listBusinessContexts();
    const businessContext = contexts?.[0] ?? null;

    if (!blog) {
        return (
            <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-white">
                <h1 className="text-2xl font-bold mb-4">Blog Post Not Found</h1>
                <Link href="/dashboard" className="text-indigo-400 hover:underline">Return to Dashboard</Link>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-neutral-950 pb-20">
            {/* Header */}
            <header className="border-b border-neutral-800 bg-neutral-900/50 pt-8 pb-6 px-4 md:px-12 sticky top-14 z-10 backdrop-blur">
                <div className="max-w-6xl mx-auto">
                    <Link href="/dashboard" className="inline-flex items-center text-sm text-neutral-400 hover:text-white mb-4 transition-colors">
                        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Dashboard
                    </Link>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">{blog.title}</h1>
                            <div className="flex items-center gap-3 text-sm">
                                <span className={`px-2.5 py-1 font-bold rounded-full uppercase tracking-wider ${blog.status === "published" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                    }`}>
                                    {blog.status}
                                </span>
                                <span className="text-neutral-500">Created: {new Date(blog.createdAt).toLocaleDateString()}</span>
                                {blog.liveUrl && (
                                    <a href={blog.liveUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
                                        View Live
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-6xl mx-auto px-4 md:px-12 mt-10">
                {/* 11. Analytics & Observability Agent Component */}
                <AnalyticsDashboardClient blogId={blog.id} businessContext={businessContext} />

                {/* Technical Data Viewer (Collapsible) */}
                <RawPayloadViewer payload={blog.payload} />
            </div>
        </main>
    );
}
