"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { type BusinessContext } from "@/lib/types/businessContext";
import { type TopicOption } from "@/lib/types/strategy";
import { type BlogPost } from "@/lib/types/content";

interface ContentAgentProps {
    businessContext: BusinessContext;
    topic: TopicOption;
    onComplete: (post: BlogPost) => void;
}

export function ContentAgentUI({ businessContext, topic, onComplete }: ContentAgentProps) {
    const [post, setPost] = useState<BlogPost | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingStep, setLoadingStep] = useState(0);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        generateContent();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run once on mount

    const generateContent = async () => {
        setLoading(true);
        setError(null);
        setLoadingStep(1); // "Drafting SEO Outline..."

        // Faking a tool sequence for UI feel
        setTimeout(() => setLoadingStep(2), 2500); // "Weaving in local relevance signals..."
        setTimeout(() => setLoadingStep(3), 5500); // "Writing long-form content..."
        setTimeout(() => setLoadingStep(4), 8500); // "Formatting FAQs..."

        try {
            const res = await fetch("/api/content-agent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ businessContext, topic }),
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? "Failed to generate content");

            setPost(json.data);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Unknown error occurred");
        } finally {
            setLoading(false);
            setLoadingStep(0);
        }
    };

    if (loading) {
        return (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-8 shadow-xl text-center">
                <div className="mb-6 inline-flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-emerald-900/20 text-emerald-500">
                    <svg className="w-8 h-8 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
                <h3 className="text-lg font-medium text-neutral-200">
                    {loadingStep === 1 && "Drafting SEO Outline..."}
                    {loadingStep === 2 && "Weaving in local relevance signals..."}
                    {loadingStep === 3 && "Writing long-form content & optimizing headers..."}
                    {loadingStep === 4 && "Formatting FAQs and wrapping up the draft..."}
                    {loadingStep === 0 && "Finalizing..."}
                </h3>
                <p className="mt-2 text-sm text-neutral-500">Intelligent content generation is drafting your post.</p>

                <div className="mt-8 h-1.5 w-full bg-neutral-800 overflow-hidden rounded-full">
                    <div
                        className="h-full bg-emerald-500 transition-all duration-1000 ease-out"
                        style={{ width: `${(loadingStep / 4) * 100}%` }}
                    />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-6 text-center shadow-xl">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-900/30 text-red-500">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h3 className="text-lg font-medium text-neutral-100 mb-2">Generation Failed</h3>
                <p className="text-red-400 text-sm mb-4">{error}</p>
                <div className="inline-block rounded-lg bg-neutral-900 border border-neutral-800 p-3 mb-4">
                    <p className="text-neutral-300 text-sm font-medium">✨ Nudge: If this is an API rate limit issue, please wait 1 minute and try again.</p>
                </div>
                <div>
                    <button
                        onClick={generateContent}
                        className="rounded-lg bg-red-900/50 px-4 py-2 text-sm font-medium text-red-200 hover:bg-red-900/80 transition-colors"
                    >
                        Retry Generation
                    </button>
                </div>
            </div>
        );
    }

    if (post) {
        return (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 shadow-xl animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 mb-6 border-b border-neutral-800 pb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-900/30 text-emerald-400 border border-emerald-800/50">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                            <path fillRule="evenodd" d="M4.804 21.644A6.707 6.707 0 006 21.75a6.721 6.721 0 003.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543-.11.554-.334 1.258-.694 2.19-.089.231-.225.598-.41.97l-.017.032c-.066.12-.132.241-.197.362a.75.75 0 00.933 1.054 13.924 13.924 0 003.111-1.706zM9.75 9.75a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-4.5zm0 3a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-4.5z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-neutral-100">Content Generation Agent</h2>
                        <p className="text-xs text-neutral-400">Intelligent SEO Article Draft</p>
                    </div>
                </div>

                {/* Removed early SEO Metadata Box - Handled by Meta SEO Agent later */}

                {/* Blog Post Content Body (read-only preview) */}
                <div className="mb-8 rounded-lg border border-neutral-800 bg-neutral-950 p-6 md:p-8 overflow-y-auto max-h-[600px]">
                    <article className="prose prose-neutral prose-invert w-full max-w-none prose-headings:font-bold prose-a:text-emerald-400">
                        <ReactMarkdown>{post.contentMarkdown}</ReactMarkdown>

                        {/* Render FAQs */}
                        <div className="mt-8 pt-8 border-t border-neutral-800">
                            <h2 className="text-neutral-100">Frequently Asked Questions</h2>
                            <div className="space-y-4 mt-4">
                                {post.faqs.map((faq, i) => (
                                    <div key={i}>
                                        <h3 className="text-neutral-200 mt-0">{faq.question}</h3>
                                        <p className="text-neutral-400">{faq.answer}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </article>
                </div>

                {/* Call to action */}
                <div className="flex flex-wrap justify-end items-center gap-3 pt-4 border-t border-neutral-800">
                    <div className="flex flex-wrap gap-3 ml-auto">
                        <button
                            onClick={generateContent}
                            className="rounded-lg border border-neutral-700 bg-transparent px-5 py-2.5 font-medium text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white"
                        >
                            Regenerate Draft
                        </button>
                        <button
                            onClick={() => onComplete(post)}
                            className="rounded-lg bg-emerald-600 px-5 py-2.5 font-medium text-white transition-colors hover:bg-emerald-500 shadow-lg shadow-emerald-900/20"
                        >
                            Proceed to Formatting &amp; Optimization
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
