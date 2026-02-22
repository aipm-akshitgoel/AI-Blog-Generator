"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { BusinessContextSetup } from "@/components/BusinessContextSetup";
import { StrategyAgentUI } from "@/components/StrategyAgent";
import { ContentAgentUI } from "@/components/ContentAgent";
import { OptimizationAgentUI } from "@/components/OptimizationAgentUI";
import { MetaSeoAgentUI } from "@/components/MetaSeoAgentUI";
import { SchemaAgentUI } from "@/components/SchemaAgentUI";
import { CtaAgentUI } from "@/components/CtaAgentUI";
import { ImageAgentUI } from "@/components/ImageAgentUI";
import { PublishingAgentUI } from "@/components/PublishingAgentUI";
import { TopicSelector } from "@/components/TopicSelector";
import type { BusinessContext } from "@/lib/types/businessContext";
import type { TopicOption, StrategySession } from "@/lib/types/strategy";
import type { BlogPost } from "@/lib/types/content";
import type { OptimizedContent } from "@/lib/types/optimization";
import type { MetaOption } from "@/lib/types/meta";
import type { SchemaData } from "@/lib/types/schema";
import type { CTAData } from "@/lib/types/cta";
import type { ImageMetadata } from "@/lib/types/image";
import type { PublishPayload } from "@/lib/types/publish";

// ── Internal component (needs useSearchParams inside Suspense) ──────────────
function SetupPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // mode=blog → blog creation flow (topic picker → pipeline)
  // mode=account OR no param → account setup flow (profile → strategy → save → dashboard)
  // mode=blog → blog creation flow (topic picker → pipeline)
  // mode=account OR no param → account setup flow (profile → strategy → save → dashboard)
  const isBlogMode = searchParams.get("mode") === "blog";

  // ── Account data ─────────────────────────────────────────────────────────
  const [context, setContext] = useState<BusinessContext | null>(null);
  const [strategySession, setStrategySession] = useState<StrategySession | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // After strategy is approved in account setup mode, show a "Saved!" screen
  const [strategySaved, setStrategySaved] = useState(false);

  // ── Blog creation states ──────────────────────────────────────────────────
  const [creationMode, setCreationMode] = useState<"batch" | "manual" | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<TopicOption | null>(null);
  const [generatedPost, setGeneratedPost] = useState<BlogPost | null>(null);
  const [optimizedPost, setOptimizedPost] = useState<OptimizedContent | null>(null);
  const [selectedMeta, setSelectedMeta] = useState<MetaOption | null>(null);
  const [generatedSchema, setGeneratedSchema] = useState<SchemaData | null>(null);
  const [ctaData, setCtaData] = useState<CTAData | null>(null);
  const [generatedImages, setGeneratedImages] = useState<ImageMetadata | null>(null);
  const [publishData, setPublishData] = useState<PublishPayload | null>(null);

  // Scroll to top when advancing to a new step
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }
  }, [selectedTopic, generatedPost, optimizedPost, selectedMeta, generatedSchema, ctaData, generatedImages, publishData, creationMode]);

  // Ensure top scroll on initial load
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }
  }, []);

  // ── Auto-publish fast-lane ────────────────────────────────────────────────
  const [autoProgress, setAutoProgress] = useState<{ step: number; label: string } | null>(null);
  const [batchDone, setBatchDone] = useState(false);

  const AUTO_STEPS = [
    "Writing your blog post...",
    "Optimising content & adding links...",
    "Generating Meta title & description...",
    "Building Schema structured data...",
    "Crafting your Call to Action...",
    "Creating banner image...",
    "Saving your draft...",
  ];

  const handleAutoPublish = async (topicList: TopicOption[], count: number) => {
    if (!context) return;

    // Helper: run the full pipeline for ONE topic and save as draft
    const runOneTopic = async (topic: TopicOption, blogNum: number) => {
      const stepLabel = (stepIdx: number) =>
        setAutoProgress({ step: stepIdx, label: `Blog ${blogNum}/${count} — ${AUTO_STEPS[stepIdx]}` });

      // 0. Content
      stepLabel(0);
      const contentRes = await fetch("/api/content-agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic, businessContext: context }) });
      const contentJson = await contentRes.json();
      if (!contentRes.ok) throw new Error(contentJson.error || "Content generation failed");
      const post: BlogPost = contentJson.data;

      // 1. Optimise (enrich with existing blog links)
      stepLabel(1);
      let enrichedCtx = { ...context };
      try {
        const blogsRes = await fetch("/api/blog");
        if (blogsRes.ok) {
          const { blogs } = await blogsRes.json();
          enrichedCtx = { ...enrichedCtx, internalLinks: [...(enrichedCtx.internalLinks || []), ...(blogs || []).filter((b: any) => b.status === "published" && b.slug).map((b: any) => ({ href: `/blog/${b.slug}`, anchorText: b.title, target: "blog" as const }))] };
        }
      } catch { }
      const optRes = await fetch("/api/optimize-content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ blogPost: post, businessContext: enrichedCtx }) });
      const optJson = await optRes.json();
      if (!optRes.ok) throw new Error(optJson.error || "Optimization failed");
      const optimized: OptimizedContent = optJson.optimized;

      // 2. Meta
      stepLabel(2);
      const metaRes = await fetch("/api/meta-seo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ optimizedContent: optimized }) });
      const metaJson = await metaRes.json();
      if (!metaRes.ok) throw new Error(metaJson.error || "Meta generation failed");
      const meta: MetaOption = metaJson.payload?.options?.[0];

      // 3. Schema
      stepLabel(3);
      const schemaRes = await fetch("/api/schema-gen", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ optimizedContent: optimized, meta, businessContext: context }) });
      const schemaJson = await schemaRes.json();
      if (!schemaRes.ok) throw new Error(schemaJson.error || "Schema generation failed");
      const schema: SchemaData = schemaJson.schemaData;

      // 4. CTA
      stepLabel(4);
      const ctaRes = await fetch("/api/cta-agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ optimizedContent: optimized, businessContext: context }) });
      const ctaJson = await ctaRes.json();
      if (!ctaRes.ok) throw new Error(ctaJson.error || "CTA generation failed");
      const cta: CTAData = ctaJson.cta;

      // 5. Image
      stepLabel(5);
      const imgRes = await fetch("/api/image-agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ optimizedContent: optimized, businessContext: context }) });
      const imgJson = await imgRes.json();
      if (!imgRes.ok) throw new Error(imgJson.error || "Image generation failed");
      const images: ImageMetadata = imgJson.images;

      // 6. Save as DRAFT (not published)
      stepLabel(6);
      const publishRes = await fetch("/api/publish-agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ optimizedContent: optimized, meta, schema, cta, images, businessContext: context, saveAsDraft: true }) });
      const publishJson = await publishRes.json();
      if (!publishRes.ok) throw new Error(publishJson.error || "Save failed");
    };

    try {
      for (let i = 0; i < topicList.length; i++) {
        await runOneTopic(topicList[i], i + 1);
      }
      // Show a "done" state in the overlay while router navigates — prevents flash
      setBatchDone(true);
      setAutoProgress({ step: AUTO_STEPS.length - 1, label: `All ${count} drafts saved! Redirecting to dashboard…` });
      router.push(`/dashboard?drafts=${count}`);
    } catch (err: any) {
      setAutoProgress(null);
      setBatchDone(false);
      alert(`Auto-generate failed: ${err.message}`);
    }
  };


  const handleContextComplete = async (newContext: BusinessContext) => {
    const enriched: BusinessContext = {
      ...newContext,
      internalLinks: [
        { href: "/", anchorText: "Home", target: "page" },
        { href: "/services", anchorText: "Services", target: "page" },
        { href: "/gallery", anchorText: "Gallery", target: "page" },
        { href: "/contact", anchorText: "Contact Us", target: "page" },
        ...(newContext.services || []).map(s => ({
          href: `/services#${s.toLowerCase().replace(/\s+/g, "-")}`,
          anchorText: s,
          target: "service" as const,
        })),
      ],
    };

    setContext(enriched);

    // Save to database immediately so it's persisted for the dashboard
    try {
      const res = await fetch("/api/business-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(enriched),
      });
      const savedContext = await res.json();
      if (res.ok && savedContext && !savedContext.error) {
        setContext(savedContext); // Update with DB ID if needed
      } else {
        console.error("Failed to save business context:", savedContext?.error);
      }
    } catch (err) {
      console.error("Network error saving business context:", err);
    }
  };

  useEffect(() => {
    async function loadSavedData() {
      try {
        const contextRes = await fetch("/api/business-context");
        const contexts = await contextRes.json();
        if (contexts && contexts.length > 0) {
          handleContextComplete(contexts[0]);
          const strategyRes = await fetch(`/api/strategy-session?businessContextId=${contexts[0].id}`);
          const strategy = await strategyRes.json();
          if (strategy && !strategy.error && strategy.topicOptions) {
            setStrategySession(strategy);
          }
        }
      } catch (err) {
        console.error("Failed to load initial data", err);
      } finally {
        setIsInitialLoading(false);
      }
    }
    loadSavedData();
  }, []);

  const handleStrategyApprove = async (session: StrategySession) => {
    try {
      // Ensure we have a valid UUID for the businessContextId
      if (!session.businessContextId || session.businessContextId === context?.businessName) {
        if (context?.id) {
          session.businessContextId = context.id;
        } else {
          throw new Error("Business context ID is missing. Please refresh and try saving your profile again.");
        }
      }

      const res = await fetch("/api/strategy-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(session),
      });
      const savedSession = await res.json();

      if (!res.ok || savedSession.error) {
        throw new Error(savedSession.error || "Backend failed to save strategy session");
      }

      setStrategySession(savedSession);

      // In account setup mode: show the "saved" confirmation screen
      if (!isBlogMode) setStrategySaved(true);
    } catch (err) {
      console.error("Failed to save strategy", err);
      alert(err instanceof Error ? err.message : "Failed to save strategy");
      // Do not set strategySaved to true!
    }
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isInitialLoading) {
    return (
      <main className="min-h-screen bg-neutral-950 p-6 md:p-10">
        <div className="mx-auto max-w-2xl animate-pulse space-y-4">
          <div className="h-8 w-48 bg-neutral-900 rounded" />
          <div className="h-40 bg-neutral-900 rounded-xl border border-neutral-800" />
        </div>
      </main>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ACCOUNT SETUP MODE  (/setup  or  /setup?mode=account)
  // ═══════════════════════════════════════════════════════════════════════════
  if (!isBlogMode) {
    // ── Strategy saved confirmation ────────────────────────────────────────
    if (strategySaved && strategySession) {
      return (
        <main className="min-h-screen bg-neutral-950 p-6 md:p-10 flex items-center justify-center">
          <div className="mx-auto max-w-lg text-center animate-in fade-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-900/30">
              <svg className="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-black text-white mb-3 uppercase tracking-tighter">You're All Set!</h1>
            <p className="text-neutral-400 mb-10 leading-relaxed">
              Your business profile and SEO strategy have been saved. You're ready to start generating AI content.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/dashboard"
                className="inline-flex items-center justify-center gap-3 rounded-2xl bg-neutral-900 px-8 py-5 text-sm font-black text-white transition-all hover:bg-neutral-800 uppercase tracking-widest border border-neutral-800"
              >
                Go to Dashboard
              </a>
              <a
                href="/setup?mode=blog"
                className="inline-flex items-center justify-center gap-3 rounded-2xl bg-emerald-600 px-8 py-5 text-sm font-black text-white transition-all hover:bg-emerald-500 shadow-2xl shadow-emerald-900/40 active:scale-95 uppercase tracking-widest border border-emerald-400/20"
              >
                Create First Blog
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
            </div>
          </div>
        </main>
      );
    }

    // ── Account setup pipeline ─────────────────────────────────────────────
    return (
      <main className="min-h-screen bg-neutral-950 p-4 md:p-10">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6">
            <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Account Setup</h1>
            <p className="text-neutral-400 text-sm mt-1">Configure your business profile and generate your SEO strategy.</p>
          </div>
          <div className="space-y-6">
            {!context && (
              <div className="animate-in slide-in-from-top-4 duration-500">
                <BusinessContextSetup onComplete={handleContextComplete} />
              </div>
            )}
            {context && !strategySession && (
              <div className="animate-in slide-in-from-top-4 duration-500">
                <StrategyAgentUI
                  businessContext={context}
                  onApprove={handleStrategyApprove}
                  onModify={() => { }}
                />
              </div>
            )}
            {context && strategySession && !strategySaved && (
              // Should not normally reach here — but handle gracefully
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.02] p-6 text-center">
                <p className="text-emerald-400 font-bold mb-4">Strategy already active. Redirecting...</p>
                <a href="/dashboard" className="text-sm text-emerald-500 underline">Go to Dashboard</a>
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BLOG CREATION MODE  (/setup?mode=blog)
  // ═══════════════════════════════════════════════════════════════════════════

  // Guard: no account set up yet
  if (!context || !strategySession) {
    return (
      <main className="min-h-screen bg-neutral-950 p-6 md:p-10 flex items-center justify-center">
        <div className="text-center">
          <p className="text-neutral-400 mb-6">You need to set up your business profile and strategy first.</p>
          <a href="/setup" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-black text-white hover:bg-emerald-500 uppercase tracking-widest transition-all">
            Set Up Account
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 p-4 md:p-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-neutral-100 uppercase tracking-tighter">New Blog Post</h1>
            <p className="text-neutral-400">{context?.businessName || "Your Business"}</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Auto-publish progress overlay */}
          {autoProgress && (
            <div className="fixed inset-0 z-50 bg-neutral-950/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
              <div className="max-w-md w-full mx-4 bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl">
                <div className="flex items-center justify-center mb-6">
                  <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center ${batchDone ? "border-emerald-500 bg-emerald-900/20" : "border-emerald-500/20 bg-emerald-900/20"}`}>
                    {batchDone ? (
                      <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-7 h-7 text-emerald-400 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    )}
                  </div>
                </div>
                <h2 className="text-xl font-black text-white text-center uppercase tracking-tight mb-2">{batchDone ? "All Done!" : "Auto-Publishing..."}</h2>
                <p className="text-emerald-400 text-sm text-center mb-8 font-medium">{autoProgress.label}</p>
                <div className="space-y-3">
                  {AUTO_STEPS.map((label, i) => {
                    const isDone = batchDone || i < autoProgress.step;
                    const isActive = !batchDone && i === autoProgress.step;
                    return (
                      <div key={i} className={`flex items-center gap-3 text-sm transition-all duration-300 ${isDone ? "text-emerald-400" : isActive ? "text-white scale-105 origin-left" : "text-neutral-600"
                        }`}>
                        <div className="relative flex items-center justify-center shrink-0">
                          {isDone ? (
                            <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-neutral-900 border-2 border-emerald-400 shadow-lg shadow-emerald-500/20">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                            </div>
                          ) : isActive ? (
                            <div className="w-5 h-5 rounded-full border-2 border-emerald-500 flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-neutral-800" />
                          )}
                        </div>
                        <span className={isActive ? "font-bold" : "font-medium"}>{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Stage 0: Choose Mode */}
          {isBlogMode && !creationMode && !selectedTopic && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
              <button
                onClick={() => setCreationMode("manual")}
                className="group relative flex flex-col items-center justify-center rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.02] p-8 text-center transition-all hover:bg-emerald-500/[0.05] hover:border-emerald-500/40 hover:-translate-y-1 shadow-2xl shadow-emerald-900/10"
              >
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Focus Review</h3>
                <p className="text-neutral-400 text-sm leading-relaxed">
                  Generate one post with step-by-step editing for images, SEO meta, and structure.
                </p>
                <div className="mt-8 text-[10px] font-black uppercase tracking-widest text-emerald-500/60 group-hover:text-emerald-500 transition-colors">Start Manual Flow →</div>
              </button>

              <button
                onClick={() => setCreationMode("batch")}
                className="group relative flex flex-col items-center justify-center rounded-3xl border border-amber-500/20 bg-amber-500/[0.02] p-8 text-center transition-all hover:bg-amber-500/[0.05] hover:border-amber-500/40 hover:-translate-y-1 shadow-2xl shadow-amber-900/10"
              >
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Auto-Pilot Batch</h3>
                <p className="text-neutral-400 text-sm leading-relaxed">
                  Bulk-generate 1-5 blog drafts at once. Perfect for filling your content pipeline fast.
                </p>
                <div className="mt-8 text-[10px] font-black uppercase tracking-widest text-amber-500/60 group-hover:text-amber-500 transition-colors">Start Batch Flow →</div>
              </button>
            </div>
          )}

          {/* Step 1: Pick a topic */}
          {creationMode && !selectedTopic && (
            <div className="animate-in slide-in-from-top-4 duration-500">
              <div className="mb-4">
                <button
                  onClick={() => setCreationMode(null)}
                  className="text-[10px] font-black text-neutral-500 hover:text-white uppercase tracking-widest flex items-center gap-1 transition-colors"
                >
                  ← Back to Selection
                </button>
              </div>
              <TopicSelector
                strategy={strategySession}
                onSelect={setSelectedTopic}
                businessContext={context}
                onAutoPublish={handleAutoPublish}
                mode={creationMode}
              />
            </div>
          )}

          {/* Step 2+: Pipeline */}
          {selectedTopic && (
            <>
              {!generatedPost && (
                <div className="animate-in slide-in-from-top-4 duration-500">
                  <ContentAgentUI businessContext={context} topic={selectedTopic} onComplete={setGeneratedPost} />
                </div>
              )}
              {generatedPost && !optimizedPost && (
                <div className="animate-in slide-in-from-top-4 duration-500">
                  <OptimizationAgentUI post={generatedPost} businessContext={context!} onComplete={setOptimizedPost} />
                </div>
              )}
              {optimizedPost && !selectedMeta && (
                <div className="animate-in slide-in-from-top-4 duration-500">
                  <MetaSeoAgentUI optimized={optimizedPost!} onComplete={setSelectedMeta} />
                </div>
              )}
              {selectedMeta && !generatedSchema && (
                <div className="animate-in slide-in-from-top-4 duration-500">
                  <SchemaAgentUI optimizedContent={optimizedPost!} businessContext={context!} meta={selectedMeta} onComplete={setGeneratedSchema} />
                </div>
              )}
              {generatedSchema && !ctaData && (
                <div className="animate-in slide-in-from-top-4 duration-500">
                  <CtaAgentUI optimizedContent={optimizedPost!} businessContext={context!} onComplete={(fin, cta) => { setOptimizedPost(fin); setCtaData(cta); }} />
                </div>
              )}
              {ctaData && !generatedImages && (
                <div className="animate-in slide-in-from-top-4 duration-500">
                  <ImageAgentUI optimizedContent={optimizedPost!} businessContext={context!} onComplete={setGeneratedImages} />
                </div>
              )}
              {generatedImages && !publishData && (
                <div className="animate-in slide-in-from-top-4 duration-500">
                  <PublishingAgentUI
                    optimizedContent={optimizedPost!} businessContext={context!}
                    images={generatedImages} cta={ctaData!} meta={selectedMeta!}
                    schema={generatedSchema!} onComplete={setPublishData}
                  />
                </div>
              )}

              {/* Show selected topic badge BELOW the agent box */}
              {!publishData && (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-500/10 bg-emerald-500/[0.02] px-4 py-2 mt-4 transition-all duration-500 animate-in slide-in-from-top-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/50 animate-pulse shrink-0" />
                  <span className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest">Target Topic: </span>
                  <span className="text-[11px] text-neutral-400 font-medium truncate">{selectedTopic.title}</span>
                </div>
              )}
              {publishData && publishData.status === "published" && (
                <div className="text-center pt-12 border-t border-neutral-800/50 w-full animate-in zoom-in-95 duration-500">
                  <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-black text-white mb-4 uppercase tracking-tighter">Published!</h3>
                  <p className="text-neutral-400 mb-8 max-w-md mx-auto leading-relaxed">Your SEO-optimized blog post has been generated and published successfully.</p>
                  <div className="flex gap-4 justify-center">
                    <a href="/dashboard" className="inline-flex items-center gap-2 rounded-xl bg-neutral-800 px-6 py-3 text-sm font-black text-neutral-200 hover:bg-neutral-700 transition-all uppercase tracking-widest">
                      Dashboard
                    </a>
                    <button
                      onClick={() => {
                        setPublishData(null);
                        setSelectedTopic(null);
                        setGeneratedPost(null);
                        setOptimizedPost(null);
                        setSelectedMeta(null);
                        setGeneratedSchema(null);
                        setCtaData(null);
                        setGeneratedImages(null);
                        setCreationMode(null);
                      }}
                      className="inline-flex items-center gap-3 rounded-xl bg-emerald-600 px-8 py-3 text-sm font-black text-white hover:bg-emerald-500 shadow-xl shadow-emerald-900/30 active:scale-95 uppercase tracking-widest transition-all"
                    >
                      Write Another Post
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

// Wrap in Suspense for useSearchParams
export default function SetupPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen p-6 md:p-10">
        <div className="mx-auto max-w-2xl animate-pulse space-y-4">
          <div className="h-8 w-48 bg-neutral-900 rounded" />
          <div className="h-40 bg-neutral-900 rounded-xl border border-neutral-800" />
        </div>
      </main>
    }>
      <SetupPageInner />
    </Suspense>
  );
}
