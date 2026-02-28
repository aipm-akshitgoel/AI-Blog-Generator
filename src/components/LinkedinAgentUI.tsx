"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { type BusinessContext } from "@/lib/types/businessContext";
import { type TopicOption } from "@/lib/types/strategy";
import { type LinkedinPost } from "@/lib/types/linkedin";

interface LinkedinAgentProps {
    businessContext: BusinessContext;
    topic: TopicOption;
    onComplete: (post: LinkedinPost) => void;
}

export function LinkedinAgentUI({ businessContext, topic, onComplete }: LinkedinAgentProps) {
    const [post, setPost] = useState<LinkedinPost | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copySuccess, setCopySuccess] = useState(false);

    useEffect(() => {
        generatePost();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const generatePost = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/linkedin-agent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ businessContext, topic }),
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? "Failed to generate LinkedIn post");

            setPost(json.data);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Unknown error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        if (!post) return;
        const fullContent = `${post.contentMarkdown}\n\n${post.hashtags.join(" ")}`;
        navigator.clipboard.writeText(fullContent);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    if (loading) {
        return (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-12 text-center shadow-xl">
                <div className="mb-6 inline-flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-blue-900/20 text-blue-500">
                    <svg className="w-8 h-8 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
                <h3 className="text-lg font-black text-white uppercase tracking-tight">Ghostwriter at Work</h3>
                <p className="mt-2 text-sm text-neutral-500">Crafting a high-impact LinkedIn post based on your topic...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-8 text-center shadow-xl">
                <h3 className="text-lg font-bold text-white mb-2">Generation Failed</h3>
                <p className="text-red-400 text-sm mb-6">{error}</p>
                <button
                    onClick={generatePost}
                    className="rounded-lg bg-red-900/50 px-6 py-2 text-sm font-bold text-red-200 hover:bg-red-900/80 transition-all"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (post) {
        return (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 shadow-xl">
                    <div className="flex items-center gap-3 mb-6 border-b border-neutral-800 pb-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-900/30 text-blue-400 border border-blue-800/50">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tighter">LinkedIn Post Generator</h2>
                            <p className="text-xs text-neutral-500">Format: {post.suggestedFormat}</p>
                        </div>
                        <button
                            onClick={handleCopy}
                            className={`ml-auto px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${copySuccess
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                                }`}
                        >
                            {copySuccess ? "Copied!" : "Copy Post"}
                        </button>
                    </div>

                    <div className="mb-6 p-6 rounded-lg bg-neutral-950 border border-neutral-800 font-sans leading-relaxed text-neutral-200 whitespace-pre-wrap">
                        {post.contentMarkdown}
                        <div className="mt-4 text-blue-400 font-medium">
                            {post.hashtags.join(" ")}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Core Hook Alternatives</h4>
                        <div className="grid grid-cols-1 gap-3">
                            {post.hooks.map((hook, i) => (
                                <div key={i} className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-neutral-400 italic">
                                    "{hook}"
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-neutral-800">
                        <button
                            onClick={generatePost}
                            className="text-xs font-bold text-neutral-500 hover:text-white transition-colors"
                        >
                            Try Different Style
                        </button>
                        <button
                            onClick={() => onComplete(post)}
                            className="rounded-lg bg-blue-600 px-6 py-2 text-xs font-black text-white uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/20"
                        >
                            Save as Draft
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
