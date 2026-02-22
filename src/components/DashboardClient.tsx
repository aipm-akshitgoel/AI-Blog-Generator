"use client";

import { useState } from "react";
import type { SavedBlog } from "@/lib/blogDb";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function DashboardClient({ initialBlogs }: { initialBlogs: SavedBlog[] }) {
    const router = useRouter();
    const [blogs, setBlogs] = useState<SavedBlog[]>(initialBlogs);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [isPublishing, setIsPublishing] = useState<string | null>(null);
    const [isPublishingAll, setIsPublishingAll] = useState(false);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this post?")) return;

        setIsDeleting(id);
        try {
            const res = await fetch(`/api/blog/${id}`, { method: "DELETE" });
            if (res.ok) {
                setBlogs(prev => prev.filter(b => b.id !== id));
            } else {
                alert("Failed to delete post");
            }
        } catch (err) {
            alert("Error deleting post");
        } finally {
            setIsDeleting(null);
        }
    };

    const handlePublish = async (id: string) => {
        setIsPublishing(id);
        try {
            const res = await fetch(`/api/blog/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "published" }),
            });
            if (res.ok) {
                const updatedBlog = await res.json();
                setBlogs(prev => prev.map(b => b.id === id ? updatedBlog : b));
            } else {
                alert("Failed to publish post");
            }
        } catch (err) {
            alert("Error publishing post");
        } finally {
            setIsPublishing(null);
        }
    };

    const handlePublishAll = async () => {
        const draftIds = blogs.filter(b => b.status === "draft").map(b => b.id);
        if (draftIds.length === 0) return;

        setIsPublishingAll(true);
        try {
            // Sequential publish for simplicity in mock env
            const newBlogs = [...blogs];
            for (const id of draftIds) {
                const res = await fetch(`/api/blog/${id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "published" }),
                });
                if (res.ok) {
                    const updatedBlog = await res.json();
                    const idx = newBlogs.findIndex(b => b.id === id);
                    if (idx !== -1) newBlogs[idx] = updatedBlog;
                }
            }
            setBlogs(newBlogs);
        } catch (err) {
            alert("Error publishing all drafts");
        } finally {
            setIsPublishingAll(false);
        }
    };

    const [statusTab, setStatusTab] = useState<"published" | "drafts">("drafts");

    const drafts = blogs.filter(b => b.status === "draft");
    const published = blogs.filter(b => b.status === "published");
    const hasDrafts = drafts.length > 0;
    const hasPublished = published.length > 0;

    const activeList = statusTab === "published" ? published : drafts;

    if (blogs.length === 0) {
        return (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-12 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-800 text-neutral-400">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No Posts Yet</h3>
                <p className="text-neutral-400 max-w-sm mx-auto mb-6">You haven't generated any SEO-optimized blog posts yet. Click "Create New Post" to start the AI pipeline.</p>
                <Link
                    href="/setup"
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-500"
                >
                    Create Your First Post
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Sub-tab Switcher */}
            <div className="flex items-center gap-4 bg-neutral-900/50 p-1 rounded-xl w-fit border border-neutral-800">
                <button
                    onClick={() => setStatusTab("drafts")}
                    className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${statusTab === "drafts" ? "bg-amber-500 text-neutral-900 shadow-lg shadow-amber-900/20" : "text-neutral-500 hover:text-white"}`}
                >
                    Drafts ({drafts.length})
                </button>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setStatusTab("published")}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${statusTab === "published" ? "bg-emerald-500 text-neutral-900 shadow-lg shadow-emerald-900/20" : "text-neutral-500 hover:text-white"}`}
                    >
                        Published ({published.length})
                    </button>
                    {statusTab === "published" && hasPublished && (
                        <Link
                            href="/dashboard?tab=settings&setup_panel=domain"
                            className="px-2.5 py-1 text-[10px] font-bold rounded bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 shadow-sm animate-in fade-in transition-all cursor-pointer flex items-center gap-1.5"
                        >
                            Simulated — Complete Website Connection
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
                        </Link>
                    )}
                </div>
            </div>

            {/* Drafts Review Bar */}
            {statusTab === "drafts" && hasDrafts && (
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 backdrop-blur-sm animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/20">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5M16.586 3.586a2 2 0 112.828 2.828l-8.485 8.485-3 1-1-3 8.485-8.485z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-amber-200">Review Required</h3>
                            <p className="text-sm text-amber-500/80">You have <span className="text-amber-400 font-bold">{drafts.length} new draft{drafts.length > 1 ? 's' : ''}</span> waiting for review.</p>
                        </div>
                    </div>
                    <button
                        onClick={handlePublishAll}
                        disabled={isPublishingAll}
                        className="w-full md:w-auto flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-black text-neutral-900 transition-all hover:bg-amber-400 shadow-xl shadow-amber-900/20 active:scale-95 disabled:opacity-50"
                    >
                        {isPublishingAll ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                        ) : (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                            </svg>
                        )}
                        Publish All {drafts.length} Drafts
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeList.length > 0 ? (
                    activeList.map(blog => (
                        <div
                            key={blog.id}
                            onClick={() => router.push(blog.liveUrl || `/blog/${blog.slug}`)}
                            className={`group relative rounded-xl border overflow-hidden shadow-md transition-all cursor-pointer ${blog.status === "draft"
                                ? "border-amber-500/40 bg-amber-900/5 shadow-amber-900/10 hover:border-amber-500/60"
                                : "border-neutral-800 bg-neutral-900/50 hover:border-emerald-500/50 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)]"
                                }`}
                        >
                            {/* Image Header */}
                            <div
                                className="h-40 w-full bg-cover bg-center border-b border-neutral-800 relative"
                                style={{ backgroundImage: `url('${blog.payload.images?.bannerImageUrl || ''}')` }}
                            >
                                <div className="absolute top-3 right-4 flex gap-2">
                                    {blog.status === "published" && (
                                        <a
                                            href={blog.liveUrl || `/blog/${blog.slug}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="p-2 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md transition-all border border-white/10"
                                            title="View Live Post"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                        </a>
                                    )}
                                </div>
                                <div className="absolute bottom-3 left-4 flex flex-col items-start gap-1.5">
                                    <div className="flex gap-2">
                                        <span className={`px-2.5 py-1 text-[10px] font-bold text-white rounded-full uppercase tracking-widest border border-white/20 backdrop-blur-md ${blog.status === "published"
                                            ? "bg-emerald-500/40"
                                            : "bg-amber-500/40"
                                            }`}>
                                            {blog.status}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5">
                                <h3 className="block mb-2 text-lg font-bold text-white leading-snug group-hover:text-emerald-400 transition-colors line-clamp-2">
                                    {blog.title}
                                </h3>

                                <p className="text-xs text-neutral-500 flex items-center gap-2 mb-4">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {formatDistanceToNow(new Date(blog.createdAt), { addSuffix: true })}
                                </p>

                                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-neutral-800/60">
                                    {blog.status === "draft" ? (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handlePublish(blog.id); }}
                                            disabled={isPublishing === blog.id}
                                            className="flex-1 flex items-center justify-center gap-2 bg-amber-500 text-neutral-900 hover:bg-amber-400 px-3 py-2 rounded-md text-sm font-bold transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            {isPublishing === blog.id ? (
                                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                            ) : (
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                            Publish Now
                                        </button>
                                    ) : (
                                        <div
                                            onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/blog/${blog.id}`); }}
                                            className="flex-1 text-center bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 px-3 py-2 rounded-md text-sm font-medium transition-colors border border-emerald-500/20"
                                        >
                                            Check Insights
                                        </div>
                                    )}

                                    <div
                                        onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/blog/${blog.id}/edit`); }}
                                        className={`p-2 rounded-md transition-colors ${blog.status === "draft"
                                            ? "text-amber-400 hover:bg-amber-400/10"
                                            : "text-neutral-400 hover:text-indigo-400 hover:bg-indigo-400/10"
                                            }`}
                                        title="Edit Post"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5M16.586 3.586a2 2 0 112.828 2.828l-8.485 8.485-3 1-1-3 8.485-8.485z" />
                                        </svg>
                                    </div>

                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(blog.id); }}
                                        disabled={isDeleting === blog.id}
                                        className="p-2 text-neutral-500 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                                        title="Delete Post"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center border border-dashed border-neutral-800 rounded-2xl bg-neutral-900/20 animate-in fade-in zoom-in-95">
                        <p className="text-neutral-500 font-medium">No {statusTab} posts found.</p>
                        {statusTab === "drafts" ? (
                            <Link href="/setup?mode=blog" className="text-emerald-500 text-xs font-bold mt-2 hover:underline block uppercase tracking-widest">Generate New Post →</Link>
                        ) : (
                            <button onClick={() => setStatusTab("drafts")} className="text-amber-500 text-xs font-bold mt-2 hover:underline block uppercase tracking-widest">Review Your Drafts →</button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
