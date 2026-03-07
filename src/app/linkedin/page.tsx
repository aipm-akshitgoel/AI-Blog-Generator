"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { BusinessContextSetup } from "@/components/BusinessContextSetup";
import { StrategyAgentUI } from "@/components/StrategyAgent";
import { TopicSelector } from "@/components/TopicSelector";
import { LinkedinAgentUI } from "@/components/LinkedinAgentUI";
import type { BusinessContext } from "@/lib/types/businessContext";
import type { TopicOption, StrategySession } from "@/lib/types/strategy";
import type { LinkedinPost } from "@/lib/types/linkedin";

import { SignedIn, SignedOut, SignInButton, SignUpButton, useAuth } from "@clerk/nextjs";

function LinkedinLanding() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] text-center p-6 bg-neutral-950 relative overflow-hidden">
            {/* LinkedIn-specific blue glow */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full mix-blend-screen pointer-events-none"></div>

            <div className="relative z-10 max-w-4xl border border-blue-900/30 bg-neutral-900/40 p-12 md:p-20 rounded-[40px] backdrop-blur-2xl shadow-3xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-8">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                    LinkedIn Specialist Agent Active
                </div>

                <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight leading-tight uppercase">
                    Your Personal
                    <br />
                    <span className="text-blue-500 italic">Ghostwriter</span>
                    <br />
                    for LinkedIn
                </h1>

                <p className="text-xl text-neutral-400 mb-12 max-w-2xl mx-auto leading-relaxed">
                    Connecting to the LinkedIn graph to probe viral trends, find inspiration from top performers, and draft high-impact posts that build authority.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <SignUpButton mode="modal" forceRedirectUrl="/linkedin">
                        <button className="rounded-2xl bg-blue-600 px-10 py-5 text-sm font-black text-white transition-all hover:bg-blue-500 hover:scale-105 shadow-2xl shadow-blue-900/40 uppercase tracking-widest border border-blue-400/20">
                            Get Your Strategy Now
                        </button>
                    </SignUpButton>
                    <SignInButton mode="modal" forceRedirectUrl="/linkedin">
                        <button className="text-neutral-500 hover:text-white px-6 py-3 text-xs font-black uppercase tracking-widest transition-colors">
                            Sign In to Dashboard
                        </button>
                    </SignInButton>
                </div>

                <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 pt-12 border-t border-neutral-800/50">
                    <div className="text-center">
                        <div className="text-2xl font-black text-white">3.5M+</div>
                        <div className="text-[10px] text-neutral-500 uppercase font-black tracking-widest mt-1">Posts Analyzed</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-black text-white">98%</div>
                        <div className="text-[10px] text-neutral-500 uppercase font-black tracking-widest mt-1">Growth Index</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-black text-white">12s</div>
                        <div className="text-[10px] text-neutral-500 uppercase font-black tracking-widest mt-1">Draft Time</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-black text-white">0</div>
                        <div className="text-[10px] text-neutral-500 uppercase font-black tracking-widest mt-1">Burnout Rate</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function LinkedinPageInner() {
    const [context, setContext] = useState<BusinessContext | null>(null);
    const [strategySession, setStrategySession] = useState<StrategySession | null>(null);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [selectedTopic, setSelectedTopic] = useState<TopicOption | null>(null);
    const [generatedPost, setGeneratedPost] = useState<LinkedinPost | null>(null);

    useEffect(() => {
        async function checkExisting() {
            try {
                const res = await fetch("/api/business-context?platform=linkedin");
                if (res.ok) {
                    const list = await res.json();
                    if (list && list.length > 0) {
                        setContext(list[0]);
                        // Check for strategy
                        const sRes = await fetch(`/api/strategy-session?businessContextId=${list[0].id}&platform=linkedin`);
                        if (sRes.ok) {
                            const sList = await sRes.json();
                            if (sList && sList.length > 0) {
                                setStrategySession(sList[0]);
                            }
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to load existing profile", e);
            } finally {
                setIsInitialLoading(false);
            }
        }
        checkExisting();
    }, []);

    const handleContextComplete = (newContext: BusinessContext) => {
        setContext(newContext);
    };

    const handleStrategyApprove = async (session: StrategySession) => {
        try {
            const res = await fetch("/api/strategy-session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(session),
            });
            const saved = await res.json();
            setStrategySession(saved);
        } catch (e) {
            console.error("Failed to save strategy", e);
            setStrategySession(session);
        }
    };

    if (isInitialLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-neutral-950">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <>
            <SignedOut>
                <LinkedinLanding />
            </SignedOut>
            <SignedIn>
                <main className="min-h-screen bg-neutral-950 py-12 px-6">
                    <div className="mx-auto max-w-4xl">
                        {/* Header Section */}
                        <div className="mb-12 text-center">
                            <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tighter uppercase">
                                LinkedIn <span className="text-blue-500">Ghostwriter</span>
                            </h1>
                            <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
                                Transform your business expertise into high-impact LinkedIn posts.
                                Stop staring at a blank screen. Let our AI agents do the drafting.
                            </p>
                        </div>

                        {/* Step-by-Step Flow */}
                        <div className="space-y-12">
                            {/* STEP 1: Profile / Business Context */}
                            {!context ? (
                                <BusinessContextSetup onComplete={handleContextComplete} platform="linkedin" />
                            ) : (
                                <div className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 backdrop-blur-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-white uppercase tracking-tight">{context.businessName}</h3>
                                            <p className="text-xs text-neutral-500">Identity Established</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setContext(null)}
                                        className="text-[10px] font-black uppercase text-neutral-600 hover:text-white transition-colors tracking-widest"
                                    >
                                        Change Profile
                                    </button>
                                </div>
                            )}

                            {/* STEP 2: Strategy / Topic Selection */}
                            {context && !selectedTopic && (
                                <>
                                    {!strategySession ? (
                                        <StrategyAgentUI
                                            businessContext={context}
                                            onApprove={handleStrategyApprove}
                                            onModify={() => { }}
                                            platform="linkedin"
                                        />
                                    ) : (
                                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <TopicSelector
                                                strategy={strategySession}
                                                mode="manual"
                                                businessContext={context}
                                                onSelect={(topic) => setSelectedTopic(topic)}
                                            />
                                            <button
                                                onClick={() => setStrategySession(null)}
                                                className="mt-4 text-xs font-bold text-neutral-600 hover:text-neutral-400 uppercase tracking-widest block mx-auto"
                                            >
                                                Regenerate Topic Strategy
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* STEP 3: Generation */}
                            {context && selectedTopic && (
                                <LinkedinAgentUI
                                    businessContext={context}
                                    topic={selectedTopic}
                                    onComplete={(post) => {
                                        setGeneratedPost(post);
                                        // In a real app we might save this somewhere specialized
                                        alert("LinkedIn Post Ready! Use the 'Copy' button in the editor.");
                                    }}
                                />
                            )}

                            {/* Back Action */}
                            {selectedTopic && (
                                <button
                                    onClick={() => {
                                        setSelectedTopic(null);
                                        setGeneratedPost(null);
                                    }}
                                    className="px-6 py-2 text-xs font-black text-neutral-500 hover:text-white transition-all uppercase tracking-[0.2em] border border-neutral-800 rounded-lg mx-auto block"
                                >
                                    ← Back to Topic Selection
                                </button>
                            )}
                        </div>
                    </div>
                </main>
            </SignedIn>
        </>
    );
}

export default function LinkedinPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center bg-neutral-950">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
            </div>
        }>
            <LinkedinPageInner />
        </Suspense>
    );
}
