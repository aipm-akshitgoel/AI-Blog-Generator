"use client";

import { useState, useEffect, useMemo, useRef, Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import { BusinessContextSetup } from "@/components/BusinessContextSetup";
import { StrategyAgentUI } from "@/components/StrategyAgent";
import { TopicSelector } from "@/components/TopicSelector";
import { TopicBriefPanel } from "@/components/TopicBriefPanel";
import { ManualTopicEntry } from "@/components/ManualTopicEntry";
import { CtaButton } from "@/components/ui/CtaButton";

function PipelineStepLoader({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-8 text-center animate-pulse">
      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500" />
      <p className="mt-4 text-sm text-neutral-400">{label}</p>
    </div>
  );
}

const ContentAgentUI = dynamic(
  () => import("@/components/ContentAgent").then((m) => m.ContentAgentUI),
  { loading: () => <PipelineStepLoader label="Loading content writer…" /> },
);
const OptimizationAgentUI = dynamic(
  () => import("@/components/OptimizationAgentUI").then((m) => m.OptimizationAgentUI),
  { loading: () => <PipelineStepLoader label="Loading optimizer…" /> },
);
const MetaSeoAgentUI = dynamic(
  () => import("@/components/MetaSeoAgentUI").then((m) => m.MetaSeoAgentUI),
  { loading: () => <PipelineStepLoader label="Loading SEO tools…" /> },
);
const SchemaAgentUI = dynamic(
  () => import("@/components/SchemaAgentUI").then((m) => m.SchemaAgentUI),
  { loading: () => <PipelineStepLoader label="Loading schema builder…" /> },
);
const CtaAgentUI = dynamic(
  () => import("@/components/CtaAgentUI").then((m) => m.CtaAgentUI),
  { loading: () => <PipelineStepLoader label="Loading CTA agent…" /> },
);
const ImageAgentUI = dynamic(
  () => import("@/components/ImageAgentUI").then((m) => m.ImageAgentUI),
  { loading: () => <PipelineStepLoader label="Loading image agent…" /> },
);
const PublishingAgentUI = dynamic(
  () => import("@/components/PublishingAgentUI").then((m) => m.PublishingAgentUI),
  { loading: () => <PipelineStepLoader label="Loading publisher…" /> },
);
import {
  buildMinimalBusinessContext,
  businessContextPayloadFromStrategy,
  canEnterBlogWriter,
  hasBusinessDomain,
  hasTopicSuggestions,
  normalizeDomain,
} from "@/lib/strategyInputs";
import {
  enrichStrategyWithBlogProgress,
  getDirectoryFromSession,
  normalizeBlogStrategyResponse,
  syncSessionFromDirectory,
} from "@/lib/contentDirectory";
import { isPersistedUuid, stripNonPersistedId } from "@/lib/uuid";
import { clearBusinessSetupStorage } from "@/lib/businessSetupStorage";
import type { TopicBrief } from "@/lib/types/topicBrief";
import { EMPTY_TOPIC_BRIEF } from "@/lib/types/topicBrief";
import type { BusinessContext } from "@/lib/types/businessContext";
import type { TopicOption, StrategySession } from "@/lib/types/strategy";
import type { BlogPost } from "@/lib/types/content";
import type { OptimizedContent } from "@/lib/types/optimization";
import type { MetaOption } from "@/lib/types/meta";
import type { SchemaData } from "@/lib/types/schema";
import type { CTAData } from "@/lib/types/cta";
import type { ImageMetadata } from "@/lib/types/image";
import type { PublishPayload } from "@/lib/types/publish";

async function parseJsonSafely<T>(response: Response): Promise<T | null> {
  const raw = await response.text();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function isStrategySession(value: unknown): value is StrategySession {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return "topicOptions" in v || "keywordStrategy" in v;
}

function normalizeLoadedStrategy(raw: StrategySession, businessContextId?: string): StrategySession {
  return syncSessionFromDirectory(
    normalizeBlogStrategyResponse(raw as unknown as Record<string, unknown>, {
      businessContextId,
    }),
  );
}

async function fetchWithTimeout(url: string, ms: number, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

function businessProfilePayload(ctx: BusinessContext) {
  const rawType = ctx.businessType?.trim() || "";
  const businessType =
    rawType && rawType !== "General" && rawType !== "General Business" ? rawType : "other";
  return {
    platform: "blog" as const,
    businessName: ctx.businessName?.trim() || "My Business",
    businessType,
    domain: ctx.domain,
    location: ctx.location ?? {},
    services: ctx.services ?? [],
    targetAudience:
      ctx.targetAudience?.trim() || "Prospective customers searching online",
    positioning: ctx.positioning?.trim() || "Helpful and trustworthy",
  };
}

async function persistBusinessProfile(ctx: BusinessContext): Promise<BusinessContext | null> {
  if (!hasBusinessDomain(ctx)) return null;
  try {
    const res = await fetch("/api/business-context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(businessProfilePayload(ctx)),
    });
    const saved = await parseJsonSafely<BusinessContext & { error?: string }>(res);
    if (!res.ok || !saved || "error" in saved) return null;
    return { ...ctx, ...saved, domain: saved.domain || ctx.domain };
  } catch (e) {
    console.warn("Could not persist business profile to server", e);
    return null;
  }
}

// ── Internal component (needs useSearchParams inside Suspense) ──────────────
const CONTEXT_SKIPPED_KEY = "bloggieai_context_skipped";
const STRATEGY_SAVED_KEY = "bloggieai_strategy_saved";
const WRITER_UNLOCKED_KEY = "bloggieai_writer_unlocked";

function markWriterUnlocked() {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(WRITER_UNLOCKED_KEY, "1");
}

function clearWriterUnlockFlags() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(WRITER_UNLOCKED_KEY);
  window.sessionStorage.removeItem(CONTEXT_SKIPPED_KEY);
  document.cookie = `${WRITER_UNLOCKED_KEY}=; path=/; max-age=0; SameSite=Lax`;
}

function SetupPageInner() {
  const LOCAL_CONTEXT_KEY = "bloggieai_local_business_context";
  const LOCAL_STRATEGY_KEY = "bloggieai_local_strategy_session";
  const LOCAL_SEO_DEFAULTS_KEY = "bloggieai_local_seo_defaults";
  const searchParams = useSearchParams();
  const router = useRouter();

  const isBlogMode = searchParams.get("mode") === "blog";
  const onboardingFirst = searchParams.get("onboarding") === "first";

  // ── Account data ─────────────────────────────────────────────────────────
  const [context, setContext] = useState<BusinessContext | null>(null);
  const [strategySession, setStrategySession] = useState<StrategySession | null>(null);
  /** First blog + writer: show UI immediately; only block when reopening account setup from settings. */
  const [isInitialLoading, setIsInitialLoading] = useState(!isBlogMode && !onboardingFirst);
  const [dataHydrated, setDataHydrated] = useState(false);
  /** False until saved strategy fetch finishes (or is skipped) — avoids topic UI flip & early redirects. */
  const [strategyFetchSettled, setStrategyFetchSettled] = useState(false);

  // After strategy is approved in account setup mode, show a "Saved!" screen
  const [strategySaved, setStrategySaved] = useState(false);
  const [isSavingStrategy, setIsSavingStrategy] = useState(false);
  const [contextSkipped, setContextSkipped] = useState(false);
  const [strategySkipped, setStrategySkipped] = useState(false);
  const [writerUnlocked, setWriterUnlocked] = useState(false);
  const [editingDomain, setEditingDomain] = useState(false);

  const effectiveContext = useMemo(
    () => context ?? buildMinimalBusinessContext({ platform: "blog" }),
    [context],
  );
  const hasStrategyTopics = hasTopicSuggestions(strategySession);
  const hasProfileDomain = hasBusinessDomain(context);
  const [hasAnyBlog, setHasAnyBlog] = useState(false);
  const hasSavedStrategy = hasStrategyTopics || strategySaved;
  const writerSetupInput = {
    hasBusinessDomain: hasProfileDomain,
    hasSavedStrategy,
    hasAnyBlogOrDraft: hasAnyBlog,
  };
  const canEnterWriter = canEnterBlogWriter(writerSetupInput);
  /** Domain + keyword strategy must both be saved before the blog writer opens. */
  const onboardingStrategyDone = hasSavedStrategy;

  // ── Blog creation states ──────────────────────────────────────────────────
  const [creationMode, setCreationMode] = useState<"batch" | "manual" | "custom" | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<TopicOption | null>(null);
  const [topicBrief, setTopicBrief] = useState<TopicBrief | null>(null);
  const [briefConfirmed, setBriefConfirmed] = useState(false);
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
  }, [selectedTopic, briefConfirmed, generatedPost, optimizedPost, selectedMeta, generatedSchema, ctaData, generatedImages, publishData, creationMode]);

  const handleTopicSelect = (topic: TopicOption) => {
    setSelectedTopic(topic);
    const primaryKw = strategySession?.keywordStrategy?.primaryKeyword;
    if (topic.h2Titles?.length) {
      setTopicBrief({
        ...EMPTY_TOPIC_BRIEF,
        interlinkingRules: EMPTY_TOPIC_BRIEF.interlinkingRules,
        contentConstraints: {
          h1Title: topic.title,
          h2Titles: topic.h2Titles,
          h1PrimaryKeyword: primaryKw,
        },
      });
    } else {
      setTopicBrief(null);
    }
    setBriefConfirmed(false);
  };

  // Ensure top scroll on initial load
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }
  }, []);

  // Onboarding: domain + strategy saved → open blog writer
  useEffect(() => {
    if (!onboardingFirst || !dataHydrated || !strategyFetchSettled || isBlogMode) return;
    if (!canEnterWriter) return;
    router.replace("/setup?mode=blog");
  }, [onboardingFirst, dataHydrated, strategyFetchSettled, isBlogMode, canEnterWriter, router]);

  // Blog mode without full setup → strategy on /setup if domain exists; first-time onboarding only when nothing saved yet
  useEffect(() => {
    if (!isBlogMode || !dataHydrated || !strategyFetchSettled || onboardingFirst) return;
    if (canEnterWriter) return;
    if (hasProfileDomain) {
      router.replace("/setup");
      return;
    }
    if (hasAnyBlog || hasSavedStrategy) return;
    router.replace("/setup?onboarding=first");
  }, [
    isBlogMode,
    dataHydrated,
    strategyFetchSettled,
    onboardingFirst,
    canEnterWriter,
    hasProfileDomain,
    hasAnyBlog,
    hasSavedStrategy,
    router,
  ]);

  // Drop stale session skip flags
  useEffect(() => {
    if (!dataHydrated || !strategyFetchSettled) return;
    if (canEnterWriter) return;
    clearWriterUnlockFlags();
    setWriterUnlocked(false);
    setContextSkipped(false);
    setStrategySkipped(false);
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(STRATEGY_SAVED_KEY);
    }
  }, [dataHydrated, strategyFetchSettled, canEnterWriter]);

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
    const ctx = effectiveContext;

    // Helper: run the full pipeline for ONE topic and save as draft
    const runOneTopic = async (topic: TopicOption, blogNum: number) => {
      const stepLabel = (stepIdx: number) =>
        setAutoProgress({ step: stepIdx, label: `Blog ${blogNum}/${count} — ${AUTO_STEPS[stepIdx]}` });

      // 0. Content
      stepLabel(0);
      const contentRes = await fetch("/api/content-agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic, businessContext: ctx }) });
      const contentJson = await contentRes.json();
      if (!contentRes.ok) throw new Error(contentJson.error || "Content generation failed");
      const post: BlogPost = contentJson.data;

      // 1. Optimise (enrich with existing blog links)
      stepLabel(1);
      let enrichedCtx = { ...ctx };
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
      const schemaRes = await fetch("/api/schema-gen", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ optimizedContent: optimized, meta, businessContext: ctx }) });
      const schemaJson = await schemaRes.json();
      if (!schemaRes.ok) throw new Error(schemaJson.error || "Schema generation failed");
      const schema: SchemaData = schemaJson.schemaData;

      // 4. CTA
      stepLabel(4);
      const ctaRes = await fetch("/api/cta-agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ optimizedContent: optimized, businessContext: ctx, topicTitle: topic.title }) });
      const ctaJson = await ctaRes.json();
      if (!ctaRes.ok) throw new Error(ctaJson.error || "CTA generation failed");
      const cta: CTAData = ctaJson.cta;

      // 5. Image
      stepLabel(5);
      const imgRes = await fetch("/api/image-agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ optimizedContent: optimized, businessContext: ctx }) });
      const imgJson = await imgRes.json();
      if (!imgRes.ok) throw new Error(imgJson.error || "Image generation failed");
      const images: ImageMetadata = imgJson.images;

      // 6. Save as DRAFT (not published)
      stepLabel(6);
      const publishRes = await fetch("/api/publish-agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ optimizedContent: optimized, meta, schema, cta, images, businessContext: ctx, saveAsDraft: true }) });
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
    const scanned = newContext.internalLinks?.filter((l) => l.href?.trim()) ?? [];
    const serviceLinks = (newContext.services || []).map((s) => ({
      href: `/services#${s.toLowerCase().replace(/\s+/g, "-")}`,
      anchorText: s,
      target: "service" as const,
    }));
    const seen = new Set(scanned.map((l) => l.href));
    const mergedLinks = [
      ...scanned,
      ...serviceLinks.filter((l) => !seen.has(l.href)),
    ];

    const enriched: BusinessContext = {
      ...newContext,
      platform: "blog",
      internalLinks: mergedLinks.length > 0 ? mergedLinks : newContext.internalLinks,
    };

    if (typeof window !== "undefined" && enriched.seoDefaults) {
      window.sessionStorage.setItem(LOCAL_SEO_DEFAULTS_KEY, JSON.stringify(enriched.seoDefaults));
    }

    if (hasBusinessDomain(enriched)) {
      const persisted = await persistBusinessProfile(enriched);
      if (persisted) {
        setContext(persisted);
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem(LOCAL_CONTEXT_KEY);
        }
        return;
      }
    }

    setContext(enriched);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(LOCAL_CONTEXT_KEY, JSON.stringify(enriched));
    }
  };

  useEffect(() => {
    const hydrateLocalFallback = () => {
      if (typeof window === "undefined") return;
      if (window.sessionStorage.getItem(CONTEXT_SKIPPED_KEY) === "1") {
        setContextSkipped(true);
      }
      if (window.sessionStorage.getItem(STRATEGY_SAVED_KEY) === "1") {
        setStrategySaved(true);
      }
      if (window.sessionStorage.getItem(WRITER_UNLOCKED_KEY) === "1") {
        setWriterUnlocked(true);
        setStrategySkipped(true);
      }
      const localContextRaw = window.sessionStorage.getItem(LOCAL_CONTEXT_KEY);
      const localStrategyRaw = window.sessionStorage.getItem(LOCAL_STRATEGY_KEY);

      if (localContextRaw) {
        try {
          const parsedContext = JSON.parse(localContextRaw) as BusinessContext;
          setContext(parsedContext);
        } catch { }
      }

      if (localStrategyRaw) {
        try {
          const parsedStrategy = JSON.parse(localStrategyRaw) as StrategySession;
          if (isStrategySession(parsedStrategy)) {
            const session = normalizeLoadedStrategy(
              isPersistedUuid(parsedStrategy.id) ? parsedStrategy : stripNonPersistedId(parsedStrategy),
            );
            if (getDirectoryFromSession(session).length > 0) {
              setStrategySession(session);
            }
          }
        } catch { }
      }
    };

    const fetchStrategyForContext = async (
      bcId: string,
      fallback?: StrategySession | null,
    ): Promise<StrategySession | null> => {
      const STRATEGY_FETCH_MS = 15_000;
      try {
        const strategyRes = await fetchWithTimeout(
          `/api/strategy-session?businessContextId=${bcId}&platform=blog`,
          STRATEGY_FETCH_MS,
        );
        const strategy = await parseJsonSafely<StrategySession | { error?: string }>(strategyRes);
        if (strategyRes.ok && isStrategySession(strategy)) {
          const normalized = normalizeLoadedStrategy(strategy, bcId);
          if (getDirectoryFromSession(normalized).length > 0) {
            if (typeof window !== "undefined") {
              window.sessionStorage.removeItem(LOCAL_STRATEGY_KEY);
            }
            return normalized;
          }
        }
      } catch (e) {
        console.warn("Strategy session fetch timed out or failed", e);
      }
      if (fallback && getDirectoryFromSession(normalizeLoadedStrategy(fallback, bcId)).length > 0) {
        return normalizeLoadedStrategy(fallback, bcId);
      }
      return null;
    };

    async function loadSavedData() {
      const CONTEXT_FETCH_MS = 12_000;

      try {
        let loadedStrategy: StrategySession | null = null;
        let loadedBlogs: { title: string; slug: string }[] = [];
        let businessContextId: string | undefined;

        let contextRes: Response | null = null;
        try {
          contextRes = await fetchWithTimeout("/api/business-context?platform=blog", CONTEXT_FETCH_MS);
        } catch (e) {
          console.warn("Business context fetch timed out or failed", e);
          hydrateLocalFallback();
        }

        const contexts =
          contextRes != null
            ? await parseJsonSafely<BusinessContext[] | { error?: string }>(contextRes)
            : null;

        if (contextRes?.ok && Array.isArray(contexts) && contexts.length > 0) {
          let mergedContext = contexts[0];
          if (typeof window !== "undefined") {
            const localSeoDefaultsRaw = window.sessionStorage.getItem(LOCAL_SEO_DEFAULTS_KEY);
            if (localSeoDefaultsRaw) {
              try {
                mergedContext = { ...mergedContext, seoDefaults: JSON.parse(localSeoDefaultsRaw) };
              } catch { }
            }
            const localContextRaw = window.sessionStorage.getItem(LOCAL_CONTEXT_KEY);
            if (localContextRaw && !hasBusinessDomain(mergedContext)) {
              try {
                const localCtx = JSON.parse(localContextRaw) as BusinessContext;
                if (hasBusinessDomain(localCtx)) {
                  mergedContext = {
                    ...mergedContext,
                    domain: localCtx.domain,
                    businessName: mergedContext.businessName || localCtx.businessName,
                    internalLinks: localCtx.internalLinks?.length
                      ? localCtx.internalLinks
                      : mergedContext.internalLinks,
                  };
                }
              } catch { /* ignore */ }
            }
          }
          if (hasBusinessDomain(mergedContext)) {
            const persisted = await persistBusinessProfile(mergedContext);
            if (persisted) {
              mergedContext = persisted;
            }
          }
          setContext(mergedContext);
          businessContextId = mergedContext.id;

          if (typeof window !== "undefined") {
            const localStrategyRaw = window.sessionStorage.getItem(LOCAL_STRATEGY_KEY);
            if (localStrategyRaw) {
              try {
                const parsedStrategy = JSON.parse(localStrategyRaw) as StrategySession;
                if (isStrategySession(parsedStrategy)) {
                  loadedStrategy = normalizeLoadedStrategy(
                    isPersistedUuid(parsedStrategy.id)
                      ? parsedStrategy
                      : stripNonPersistedId(parsedStrategy),
                    businessContextId,
                  );
                }
              } catch { /* keep fetching remote */ }
            }
            if (hasBusinessDomain(mergedContext)) {
              window.sessionStorage.removeItem(LOCAL_CONTEXT_KEY);
            }
            window.sessionStorage.removeItem(CONTEXT_SKIPPED_KEY);
            window.sessionStorage.removeItem(STRATEGY_SAVED_KEY);
          }
        } else if (contextRes?.ok && Array.isArray(contexts) && contexts.length === 0) {
          clearBusinessSetupStorage();
          setContext(null);
        } else {
          if (contextRes && !contextRes.ok) {
            console.warn("Failed to fetch business context", contexts);
          }
          hydrateLocalFallback();
          if (typeof window !== "undefined") {
            const localContextRaw = window.sessionStorage.getItem(LOCAL_CONTEXT_KEY);
            if (localContextRaw) {
              try {
                const localCtx = JSON.parse(localContextRaw) as BusinessContext;
                if (hasBusinessDomain(localCtx)) {
                  const persisted = await persistBusinessProfile(localCtx);
                  if (persisted) {
                    setContext(persisted);
                    businessContextId = persisted.id;
                    window.sessionStorage.removeItem(LOCAL_CONTEXT_KEY);
                  }
                }
              } catch { /* ignore */ }
            }
          }
        }

        if (!businessContextId && typeof window !== "undefined") {
          const localContextRaw = window.sessionStorage.getItem(LOCAL_CONTEXT_KEY);
          if (localContextRaw) {
            try {
              const parsed = JSON.parse(localContextRaw) as BusinessContext;
              businessContextId = parsed.id;
            } catch { /* ignore */ }
          }
        }

        if (businessContextId) {
          loadedStrategy = await fetchStrategyForContext(businessContextId, loadedStrategy);
        }

        try {
          const blogsRes = await fetchWithTimeout("/api/blog", 10_000);
          const blogsPayload = await parseJsonSafely<{ blogs?: unknown[] }>(blogsRes);
          if (blogsRes.ok && Array.isArray(blogsPayload?.blogs)) {
            setHasAnyBlog(blogsPayload.blogs.length > 0);
            loadedBlogs = (blogsPayload.blogs as { title?: string; slug?: string }[]).map((b) => ({
              title: String(b.title || ""),
              slug: String(b.slug || ""),
            }));
          }
        } catch (e) {
          console.warn("Blog list fetch timed out or failed", e);
        }

        if (loadedStrategy) {
          setStrategySession(enrichStrategyWithBlogProgress(loadedStrategy, loadedBlogs));
        }
      } catch (err) {
        console.error("Failed to load initial data", err);
        hydrateLocalFallback();
      } finally {
        setIsInitialLoading(false);
        setDataHydrated(true);
        setStrategyFetchSettled(true);
      }
    }
    loadSavedData();
  }, []);

  const handleStrategyApprove = async (session: StrategySession) => {
    setIsSavingStrategy(true);
    try {
      let ctx = context;

      if (!ctx?.id && typeof window !== "undefined") {
        const localRaw = window.sessionStorage.getItem(LOCAL_CONTEXT_KEY);
        if (localRaw) {
          try {
            const localCtx = JSON.parse(localRaw) as BusinessContext;
            if (hasBusinessDomain(localCtx)) {
              ctx = { ...localCtx, ...ctx };
            }
          } catch { /* ignore */ }
        }
      }

      if (!ctx?.id) {
        const profilePayload = businessContextPayloadFromStrategy(session, ctx ?? undefined);
        const profileRes = await fetch("/api/business-context", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profilePayload),
        });
        const savedProfile = await parseJsonSafely<BusinessContext & { error?: string }>(profileRes);
        if (!profileRes.ok || !savedProfile || "error" in savedProfile) {
          throw new Error(
            (savedProfile && "error" in savedProfile && savedProfile.error) ||
              "Could not save a profile for your strategy. Try again.",
          );
        }
        ctx = savedProfile;
        setContext(savedProfile);
      }

      const toSave: StrategySession = stripNonPersistedId(
        syncSessionFromDirectory({
          ...session,
          platform: session.platform ?? "blog",
          businessContextId: ctx.id!,
          status: "approved",
        }),
      );

      const res = await fetch("/api/strategy-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSave),
      });
      const savedSession = await parseJsonSafely<StrategySession & { error?: string }>(res);

      if (!res.ok || !savedSession || "error" in savedSession) {
        throw new Error(
          (savedSession && "error" in savedSession && savedSession.error) ||
            "Backend failed to save strategy session",
        );
      }

      setStrategySession(savedSession);
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(LOCAL_CONTEXT_KEY);
        window.sessionStorage.removeItem(LOCAL_STRATEGY_KEY);
        window.sessionStorage.setItem(STRATEGY_SAVED_KEY, "1");
      }

      if (!isBlogMode) setStrategySaved(true);
    } catch (err) {
      console.error("Failed to save strategy", err);
      alert(err instanceof Error ? err.message : "Failed to save strategy");
    } finally {
      setIsSavingStrategy(false);
    }
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isInitialLoading) {
    return (
      <main className="min-h-screen bg-neutral-950 p-6 md:p-10 flex flex-col items-center justify-center">
        <div className="mx-auto max-w-md w-full text-center space-y-4">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500" />
          <p className="text-sm font-semibold text-white">Loading…</p>
        </div>
      </main>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ACCOUNT SETUP MODE  (/setup  or  /setup?mode=account)
  // ═══════════════════════════════════════════════════════════════════════════
  if (!isBlogMode) {
    const accountSetupComplete = canEnterWriter;

    // ── Setup complete (domain + strategy saved) ─────────────────────────
    if (accountSetupComplete) {
      if (onboardingFirst) {
        return (
          <main className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500" />
            <p className="mt-6 text-sm font-semibold text-white">Opening blog writer…</p>
          </main>
        );
      }
      return (
        <main className="min-h-screen bg-neutral-950 p-6 md:p-10 flex items-center justify-center">
          <div className="mx-auto max-w-lg text-center animate-in fade-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-900/30">
              <svg className="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-black text-white mb-3 uppercase tracking-tighter">You&apos;re All Set!</h1>
            <p className="text-neutral-400 mb-10 leading-relaxed">
              Your website domain and keyword strategy are saved. You&apos;re ready to generate AI content.
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
            <h1 className="text-2xl font-black text-white uppercase tracking-tighter">
              {onboardingFirst ? "Before your first blog" : "Account Setup"}
            </h1>
            <p className="text-neutral-400 text-sm mt-1">
              {onboardingFirst
                ? "Add your website domain (scanning optional), then create or upload your keyword strategy. Both are required before writing."
                : "Website domain and keyword strategy are required. You can update either here anytime."}
            </p>
          </div>
          <div className="space-y-6">
            {hasProfileDomain && !editingDomain && (
              <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-4 shadow-sm flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" aria-hidden>
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="min-w-0 text-left">
                    <h2 className="text-sm font-semibold text-emerald-400">Website saved</h2>
                    <p className="truncate text-xs text-neutral-400">
                      {normalizeDomain(context?.domain || "") || context?.businessName}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingDomain(true)}
                  className="shrink-0 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white"
                >
                  Change website
                </button>
              </div>
            )}
            {(!hasProfileDomain || editingDomain) && (
              <div className="animate-in slide-in-from-top-4 duration-500">
                <BusinessContextSetup
                  onComplete={(ctx) => {
                    handleContextComplete(ctx);
                    setEditingDomain(false);
                  }}
                />
              </div>
            )}
            {hasProfileDomain && !editingDomain && !hasSavedStrategy && (
              <div className="animate-in slide-in-from-top-4 duration-500 space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                  Keyword strategy (required)
                </p>
                <StrategyAgentUI
                  businessContext={context}
                  saving={isSavingStrategy}
                  onApprove={(session) => handleStrategyApprove(session)}
                  onModify={() => { }}
                />
              </div>
            )}
            {hasProfileDomain && strategySession && !strategySaved && (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.02] p-6 text-center space-y-4">
                <p className="text-emerald-400 font-bold">Keyword strategy ready — save to continue</p>
                <p className="text-sm text-neutral-400">
                  We&apos;ll store your keywords and topics{context ? "" : " and a minimal profile from your direction"}.
                </p>
                <CtaButton
                  type="button"
                  onClick={() => void handleStrategyApprove(strategySession)}
                  loading={isSavingStrategy}
                  loadingLabel="Saving…"
                  className="rounded-lg px-6 py-2.5 text-xs"
                >
                  Save keyword strategy
                </CtaButton>
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

  if (isBlogMode && (!dataHydrated || !strategyFetchSettled)) {
    return (
      <main className="min-h-screen bg-neutral-950 p-6 md:p-10 flex flex-col items-center justify-center">
        <div className="mx-auto max-w-md w-full text-center space-y-4">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500" />
          <p className="text-sm font-semibold text-white">Loading your profile…</p>
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
            <p className="text-neutral-400">
              {context?.businessName || "Custom topic"}
              {!hasStrategyTopics && (
                <span className="text-neutral-600"> · enter your own topic</span>
              )}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {!hasProfileDomain && (
            <div className="animate-in slide-in-from-top-4 duration-500">
              <BusinessContextSetup onComplete={handleContextComplete} />
            </div>
          )}

          {hasProfileDomain && !hasSavedStrategy && (
            <div className="animate-in slide-in-from-top-4 duration-500 space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                Keyword strategy (required)
              </p>
              <StrategyAgentUI
                businessContext={context}
                saving={isSavingStrategy}
                onApprove={(session) => void handleStrategyApprove(session)}
                onModify={() => { }}
              />
            </div>
          )}

          {hasProfileDomain && hasSavedStrategy && (
          <>

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
                <h2 className="text-xl font-black text-white text-center uppercase tracking-tight mb-2">{batchDone ? "All Done!" : "Generating Drafts..."}</h2>
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
              {!strategyFetchSettled ? (
                <PipelineStepLoader label="Loading topic suggestions…" />
              ) : creationMode === "custom" ? (
                <ManualTopicEntry
                  onSelect={handleTopicSelect}
                  onBack={() => setCreationMode(hasStrategyTopics ? "manual" : null)}
                />
              ) : hasStrategyTopics && strategySession ? (
                <TopicSelector
                  strategy={strategySession}
                  onSelect={handleTopicSelect}
                  businessContext={effectiveContext}
                  onAutoPublish={handleAutoPublish}
                  mode={creationMode === "batch" ? "batch" : "manual"}
                  excludeCompleted={creationMode !== "batch"}
                  onCustomTopic={() => setCreationMode("custom")}
                />
              ) : creationMode === "manual" && !hasStrategyTopics ? (
                <ManualTopicEntry
                  onSelect={handleTopicSelect}
                  onBack={() => setCreationMode(hasStrategyTopics ? "manual" : null)}
                />
              ) : (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6 text-center">
                  <p className="text-sm text-neutral-300 mb-4">
                    Auto-Pilot Batch needs a saved keyword strategy with topic suggestions.
                  </p>
                  <button
                    type="button"
                    onClick={() => setCreationMode("manual")}
                    className="rounded-xl bg-emerald-600 px-6 py-3 text-xs font-black text-white uppercase tracking-widest hover:bg-emerald-500"
                  >
                    Use Focus Review with your topic
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Optional author brief (manual flow) */}
          {selectedTopic && creationMode === "manual" && !briefConfirmed && !generatedPost && (
            <div className="animate-in slide-in-from-top-4 duration-500">
              <TopicBriefPanel
                key={selectedTopic.title}
                topic={selectedTopic}
                primaryKeyword={strategySession?.keywordStrategy?.primaryKeyword}
                onConfirm={(brief) => {
                  setTopicBrief(brief);
                  setBriefConfirmed(true);
                }}
                onBack={() => {
                  setSelectedTopic(null);
                  setTopicBrief(null);
                  setBriefConfirmed(false);
                }}
              />
            </div>
          )}

          {/* Step 3+: Pipeline */}
          {selectedTopic && (creationMode !== "manual" || briefConfirmed) && (
            <>
              {!generatedPost && (
                <div className="animate-in slide-in-from-top-4 duration-500">
                  <ContentAgentUI
                    businessContext={effectiveContext}
                    topic={selectedTopic}
                    topicBrief={topicBrief ?? EMPTY_TOPIC_BRIEF}
                    strategySession={strategySession}
                    onComplete={setGeneratedPost}
                  />
                </div>
              )}
              {generatedPost && !optimizedPost && (
                <div className="animate-in slide-in-from-top-4 duration-500">
                  <OptimizationAgentUI
                    post={generatedPost}
                    businessContext={effectiveContext}
                    interlinkingRules={topicBrief?.interlinkingRules}
                    primaryKeyword={
                      topicBrief?.contentConstraints?.h1PrimaryKeyword?.trim() ||
                      strategySession?.keywordStrategy?.primaryKeyword
                    }
                    onComplete={setOptimizedPost}
                  />
                </div>
              )}
              {optimizedPost && !selectedMeta && (
                <div className="animate-in slide-in-from-top-4 duration-500">
                  <MetaSeoAgentUI optimized={optimizedPost!} businessContext={effectiveContext} onComplete={setSelectedMeta} />
                </div>
              )}
              {selectedMeta && !generatedSchema && (
                <div className="animate-in slide-in-from-top-4 duration-500">
                  <SchemaAgentUI optimizedContent={optimizedPost!} businessContext={effectiveContext} meta={selectedMeta} onComplete={setGeneratedSchema} />
                </div>
              )}
              {generatedSchema && !ctaData && (
                <div className="animate-in slide-in-from-top-4 duration-500">
                  <CtaAgentUI
                    optimizedContent={optimizedPost!}
                    businessContext={effectiveContext}
                    topicTitle={selectedTopic?.title}
                    onComplete={(fin, cta) => { setOptimizedPost(fin); setCtaData(cta); }}
                  />
                </div>
              )}
              {ctaData && !generatedImages && (
                <div className="animate-in slide-in-from-top-4 duration-500">
                  <ImageAgentUI optimizedContent={optimizedPost!} businessContext={effectiveContext} onComplete={setGeneratedImages} />
                </div>
              )}
              {generatedImages && !publishData && (
                <div className="animate-in slide-in-from-top-4 duration-500">
                  <PublishingAgentUI
                    optimizedContent={optimizedPost!} businessContext={effectiveContext}
                    images={generatedImages} cta={ctaData!} meta={selectedMeta!}
                    schema={generatedSchema!}
                    onComplete={(payload) => {
                      setPublishData(payload);
                      if (payload?.status === "draft" || payload?.status === "published") {
                        setHasAnyBlog(true);
                      }
                    }}
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
                  <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
                    <button
                      onClick={() => {
                        setPublishData(null);
                        setSelectedTopic(null);
                        setTopicBrief(null);
                        setBriefConfirmed(false);
                        setGeneratedPost(null);
                        setOptimizedPost(null);
                        setSelectedMeta(null);
                        setGeneratedSchema(null);
                        setCtaData(null);
                        setGeneratedImages(null);
                        setCreationMode(null);
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-900 border border-neutral-800 px-6 py-3.5 text-xs font-black text-neutral-400 hover:bg-neutral-800 hover:text-white transition-all uppercase tracking-widest"
                    >
                      Write Another Post
                    </button>
                    <a href="/dashboard" className="inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-800 px-6 py-3.5 text-sm font-black text-neutral-200 hover:bg-neutral-700 hover:text-white transition-all uppercase tracking-widest border border-neutral-700">
                      Dashboard
                    </a>
                    {publishData.slug && (
                      <a href={`/blog/${publishData.slug}`} className="inline-flex items-center justify-center gap-3 rounded-xl bg-emerald-600 px-8 py-3.5 text-sm font-black text-white hover:bg-emerald-500 shadow-xl shadow-emerald-900/40 active:scale-95 uppercase tracking-widest transition-all">
                        Go to Draft Editor
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </>
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
    <Suspense
      fallback={
        <main className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500" />
          <p className="mt-6 text-sm font-semibold text-white">Opening blog writer…</p>
        </main>
      }
    >
      <SetupPageInner />
    </Suspense>
  );
}
