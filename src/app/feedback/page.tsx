import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function FeedbackAdminPage() {
    const { data: feedbacks, error } = await supabase
        .from("feedbacks")
        .select("*")
        .order("created_at", { ascending: false });

    return (
        <div className="min-h-screen bg-neutral-950 text-white p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-black tracking-tight mb-2">Feedback Dashboard</h1>
                    <p className="text-neutral-400">Review qualitative feedback submitted by users on draft blogs.</p>
                </div>

                {error ? (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-2xl">
                        Error loading feedbacks. Did you create the table?
                        <br />
                        <code className="text-xs bg-black/50 p-2 block mt-2 rounded">{error.message}</code>
                    </div>
                ) : feedbacks?.length === 0 ? (
                    <div className="bg-neutral-900 border border-neutral-800 p-12 text-center rounded-3xl">
                        <span className="text-4xl mb-4 block">👻</span>
                        <h3 className="text-xl font-bold mb-2">No feedback yet</h3>
                        <p className="text-neutral-500">When users submit feedback on their drafts, it will appear here.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {feedbacks?.map((f: any) => (
                            <div key={f.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl">
                                <div className="flex flex-col lg:flex-row justify-between gap-6 mb-6">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h2 className="text-lg font-bold text-white">{f.user_email}</h2>
                                            <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-lg uppercase tracking-wider">
                                                {f.overall_rating} / 5 Rating
                                            </span>
                                        </div>
                                        <Link href={`/blog/${f.blog_id}`} target="_blank" className="text-sm text-neutral-500 hover:text-emerald-400 transition-colors flex items-center gap-1">
                                            {f.blog_title || "Untitled Blog"}
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                        </Link>
                                    </div>
                                    <div className="text-sm text-neutral-500">
                                        {new Date(f.created_at).toLocaleString()}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-neutral-950/50 rounded-xl p-5 border border-neutral-800/50">
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="text-sm font-bold text-emerald-500 uppercase tracking-wider">Content Quality</h3>
                                            <span className="text-xs font-bold bg-neutral-800 px-2 py-1 rounded text-neutral-300">{f.content_score}/5</span>
                                        </div>
                                        <p className="text-sm text-neutral-300 leading-relaxed italic border-l-2 border-neutral-700 pl-3">
                                            "{f.content_feedback || "No text feedback provided."}"
                                        </p>
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="text-sm font-bold text-blue-500 uppercase tracking-wider">SEO Optimization</h3>
                                            <span className="text-xs font-bold bg-neutral-800 px-2 py-1 rounded text-neutral-300">{f.seo_score}/5</span>
                                        </div>
                                        <p className="text-sm text-neutral-300 leading-relaxed italic border-l-2 border-neutral-700 pl-3">
                                            "{f.seo_feedback || "No text feedback provided."}"
                                        </p>
                                    </div>
                                </div>

                                {f.agent_feedback && (Object.values(f.agent_feedback).some(val => val)) && (
                                    <div className="mt-6 pt-6 border-t border-neutral-800">
                                        <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-4">Agent Specific Feedback</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {f.agent_feedback.strategy && (
                                                <div className="bg-neutral-800/50 rounded-lg p-3">
                                                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">Strategy Agent</span>
                                                    <p className="text-sm text-neutral-200">{f.agent_feedback.strategy}</p>
                                                </div>
                                            )}
                                            {f.agent_feedback.image && (
                                                <div className="bg-neutral-800/50 rounded-lg p-3">
                                                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">Image Agent</span>
                                                    <p className="text-sm text-neutral-200">{f.agent_feedback.image}</p>
                                                </div>
                                            )}
                                            {f.agent_feedback.cta && (
                                                <div className="bg-neutral-800/50 rounded-lg p-3">
                                                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">CTA Agent</span>
                                                    <p className="text-sm text-neutral-200">{f.agent_feedback.cta}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
