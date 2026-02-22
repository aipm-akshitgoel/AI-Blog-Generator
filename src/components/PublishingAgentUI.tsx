import { useState } from "react";
import type { OptimizedContent } from "@/lib/types/optimization";
import type { BusinessContext } from "@/lib/types/businessContext";
import type { ImageMetadata } from "@/lib/types/image";
import type { CTAData } from "@/lib/types/cta";
import type { MetaOption } from "@/lib/types/meta";
import type { SchemaData } from "@/lib/types/schema";
import type { PublishPayload } from "@/lib/types/publish";

interface PublishingAgentProps {
    optimizedContent: OptimizedContent;
    businessContext: BusinessContext;
    images: ImageMetadata;
    cta: CTAData;
    meta: MetaOption;
    schema: SchemaData;
    onComplete?: (publishData: PublishPayload) => void;
}

export function PublishingAgentUI({
    optimizedContent,
    businessContext,
    images,
    cta,
    meta,
    schema,
    onComplete
}: PublishingAgentProps) {
    const [publishState, setPublishState] = useState<"idle" | "publishing" | "success" | "failed">("idle");
    const [publishData, setPublishData] = useState<PublishPayload | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<"minimal" | "magazine">("minimal");

    // New states for demo vs domain publishing
    const [publishType, setPublishType] = useState<"demo" | "domain">("demo");
    const [isHostingConnected, setIsHostingConnected] = useState(false);
    const [showIntegrationPopup, setShowIntegrationPopup] = useState(false);

    const handlePublish = async (type: "demo" | "domain" = publishType) => {
        if (type === "domain" && !isHostingConnected) {
            setShowIntegrationPopup(true);
            return;
        }

        setPublishType(type);
        setPublishState("publishing");
        setError(null);

        try {
            const res = await fetch("/api/publish-agent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ optimizedContent, businessContext, images, cta, meta, schema, templateId: selectedTemplate, saveAsDraft: type === "demo" }),
            });

            const data = await res.json();

            if (!res.ok) {
                setPublishState("failed");
                setError(data.error || data.publishData?.errorDetails || "Publishing failed");
                if (data.publishData) setPublishData(data.publishData);
                return;
            }

            setPublishState("success");
            setPublishData(data.publishData);

        } catch (err) {
            setPublishState("failed");
            setError(err instanceof Error ? err.message : "Network error occurred.");
        }
    };

    const handleRollback = () => {
        setPublishState("idle");
        setError(null);
        setPublishData(null);
    };

    return (
        <div className="rounded-xl border border-emerald-900/30 bg-emerald-950/10 p-6 shadow-xl animate-in fade-in zoom-in-95 duration-500 relative">

            {showIntegrationPopup && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 rounded-xl">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 mb-4 border border-emerald-500/20">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                            </div>
                            <button onClick={() => setShowIntegrationPopup(false)} className="text-neutral-500 hover:text-white mt-1">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Connect Your Hosting Platform</h3>
                        <p className="text-sm text-neutral-400 mb-6">Before you can publish directly to your live domain, you need to connect your CMS or configure your DNS records.</p>

                        <div className="space-y-3">
                            <button onClick={() => { setIsHostingConnected(true); setShowIntegrationPopup(false); handlePublish("domain"); }} className="w-full flex items-center justify-between p-3.5 rounded-lg border border-neutral-800 bg-neutral-950 hover:bg-neutral-800 transition-colors group">
                                <span className="text-sm font-semibold text-neutral-300 group-hover:text-white">Connect WordPress</span>
                                <span className="text-emerald-500 transform group-hover:translate-x-1 transition-transform">→</span>
                            </button>
                            <button onClick={() => { setIsHostingConnected(true); setShowIntegrationPopup(false); handlePublish("domain"); }} className="w-full flex items-center justify-between p-3.5 rounded-lg border border-[#4353FF]/30 bg-[#4353FF]/10 hover:bg-[#4353FF]/20 transition-colors group">
                                <span className="text-sm font-semibold text-[#c5caff] group-hover:text-white">Connect Webflow</span>
                                <span className="text-[#4353FF] transform group-hover:translate-x-1 transition-transform">→</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-center gap-3 mb-6 border-b border-neutral-800 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-900/30 text-emerald-400 border border-emerald-800/50">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div>
                    <h2 className="text-xl font-bold text-neutral-100">Final Publishing Agent</h2>
                    <p className="text-xs text-neutral-400">Pushing the fully assembled payload to your live domain or private demo.</p>
                </div>
            </div>

            {/* Pre-Publish Checklist */}
            {publishState === "idle" && (
                <div className="space-y-6">
                    <div className="bg-neutral-900/50 rounded-lg p-5 border border-neutral-800">
                        <h3 className="text-sm font-semibold text-neutral-300 mb-3 uppercase tracking-wider">Payload Summary</h3>
                        <ul className="space-y-3">
                            <li className="flex items-center justify-between text-sm">
                                <span className="text-neutral-400">Full Markdown (with CTA injected)</span>
                                <span className="text-emerald-400 font-bold">✓ Ready</span>
                            </li>
                            <li className="flex items-center justify-between text-sm">
                                <span className="text-neutral-400">Meta Title & Description</span>
                                <span className="text-emerald-400 font-bold">✓ Ready</span>
                            </li>
                            <li className="flex items-center justify-between text-sm">
                                <span className="text-neutral-400">JSON-LD Schema (Local SEO + FAQ)</span>
                                <span className="text-emerald-400 font-bold">✓ Ready</span>
                            </li>
                            <li className="flex items-center justify-between text-sm">
                                <span className="text-neutral-400">AI Banner Image Data</span>
                                <span className="text-emerald-400 font-bold">✓ Ready</span>
                            </li>
                        </ul>
                    </div>

                    <div className="bg-neutral-900/50 rounded-lg p-5 border border-neutral-800">
                        <h3 className="text-sm font-semibold text-neutral-300 mb-3 uppercase tracking-wider">Select Blog Layout</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <label className={`cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center gap-3 transition-colors ${selectedTemplate === 'minimal' ? 'border-emerald-500 bg-emerald-500/10' : 'border-neutral-800 bg-neutral-900 hover:border-neutral-700'}`}>
                                <input type="radio" className="hidden" name="template" value="minimal" checked={selectedTemplate === 'minimal'} onChange={() => setSelectedTemplate('minimal')} />
                                <div className="w-16 h-20 bg-neutral-800 rounded border border-neutral-700 flex flex-col p-2 gap-1.5 shadow-sm overflow-hidden">
                                    <div className="w-full h-4 bg-neutral-600 rounded-sm"></div>
                                    <div className="w-3/4 h-1.5 bg-neutral-700 rounded-full mt-2"></div>
                                    <div className="w-full h-1.5 bg-neutral-700 rounded-full"></div>
                                    <div className="w-5/6 h-1.5 bg-neutral-700 rounded-full"></div>
                                    <div className="w-full h-4 bg-emerald-600/50 rounded-sm mt-auto"></div>
                                </div>
                                <span className="text-sm font-semibold text-neutral-200">Modern Minimal</span>
                            </label>

                            <label className={`cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center gap-3 transition-colors ${selectedTemplate === 'magazine' ? 'border-emerald-500 bg-emerald-500/10' : 'border-neutral-800 bg-neutral-900 hover:border-neutral-700'}`}>
                                <input type="radio" className="hidden" name="template" value="magazine" checked={selectedTemplate === 'magazine'} onChange={() => setSelectedTemplate('magazine')} />
                                <div className="w-16 h-20 bg-neutral-800 rounded border border-neutral-700 flex p-1.5 gap-1.5 shadow-sm overflow-hidden">
                                    <div className="w-1/3 h-full bg-neutral-700 rounded-sm"></div>
                                    <div className="flex-1 flex flex-col gap-1">
                                        <div className="w-full h-5 bg-neutral-600 rounded-sm"></div>
                                        <div className="w-full h-1 bg-neutral-700 rounded-full mt-1"></div>
                                        <div className="w-5/6 h-1 bg-neutral-700 rounded-full"></div>
                                        <div className="w-full h-1 bg-neutral-700 rounded-full"></div>
                                        <div className="w-full h-3 bg-emerald-600/50 rounded-sm mt-auto"></div>
                                    </div>
                                </div>
                                <span className="text-sm font-semibold text-neutral-200">Editorial Magazine</span>
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-neutral-800 mt-6">
                        <div className="flex flex-col p-4 rounded-xl border border-neutral-800 bg-neutral-900/50">
                            <div>
                                <h4 className="font-bold text-neutral-200">Publish to Demo URL</h4>
                                <p className="text-xs text-neutral-400 mt-1 mb-4 h-8">Generate a private preview link to share with stakeholders for final approval.</p>
                            </div>
                            <button onClick={() => handlePublish("demo")} className="mt-auto w-full rounded-lg bg-neutral-800 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-neutral-700 border border-neutral-700 shadow-sm">
                                Generate Demo Link
                            </button>
                        </div>

                        <div className="flex flex-col p-4 rounded-xl border border-emerald-900/40 bg-emerald-950/20 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none"></div>
                            <div className="relative z-10">
                                <h4 className="font-bold text-emerald-400">Publish to Live Domain</h4>
                                <p className="text-xs text-emerald-500/70 mt-1 mb-4 h-8">Push this article directly to your connected hosting platform (e.g., Webflow, WordPress).</p>
                            </div>
                            <button onClick={() => handlePublish("domain")} className="relative z-10 mt-auto w-full rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-500 flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20">
                                Publish Live
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Publishing Loading State */}
            {publishState === "publishing" && (
                <div className="flex flex-col items-center justify-center min-h-[250px] space-y-4">
                    <div className="relative flex h-20 w-20 items-center justify-center">
                        <div className="absolute inset-0 rounded-full border-4 border-emerald-900/30"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
                        <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-bold text-neutral-200">
                        {publishType === "demo" ? "Generating Private Demo Link..." : "Processing Live Deployment..."}
                    </h3>
                    <p className="text-sm text-neutral-500 max-w-sm text-center">
                        {publishType === "demo" ? "Creating a shareable sandbox version of your optimized post." : "Uploading images, injecting schema tags, and deploying to your domain."}
                    </p>
                </div>
            )}

            {/* Success State */}
            {publishState === "success" && publishData && (
                <div className="text-center py-6 animate-in zoom-in-95 duration-500">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>

                    <h3 className="mb-2 text-2xl font-bold text-white tracking-tight">
                        {publishType === "demo" ? "Demo Link Generated!" : "Post Successfully published!"}
                    </h3>

                    <p className="text-neutral-400 mb-6 max-w-md mx-auto">
                        {publishType === "demo"
                            ? "Your private preview link is ready to be shared with stakeholders."
                            : "Your blog post is now live on your domain and fully optimized for local SEO."
                        }
                    </p>

                    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 inline-flex flex-col text-left relative overflow-hidden group min-w-[300px] max-w-full">
                        <div className="flex justify-between items-start mb-1">
                            <span className="block text-[10px] text-neutral-500 uppercase font-black tracking-widest flex items-center gap-2">
                                {publishType === "demo" ? "Private Demo URL" : "Live URL"}
                                {publishType === "domain" && (
                                    <span className="text-[9px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/20 normal-case tracking-normal">
                                        Simulated — Not actually deployed
                                    </span>
                                )}
                            </span>
                            {meta.category && (
                                <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest border border-emerald-500/20">
                                    {meta.category}
                                </span>
                            )}
                        </div>
                        <a href={publishData.publishUrl || "#"} target="_blank" rel="noopener noreferrer" className="relative z-10 text-emerald-400 font-medium hover:underline text-lg truncate block">
                            {publishData.publishUrl ? (publishData.publishUrl.startsWith("http") ? publishData.publishUrl : `${typeof window !== 'undefined' ? window.location.origin : ''}${publishData.publishUrl}`) : "URL not available"}
                        </a>
                    </div>

                    {publishType === "demo" && (
                        <div className="mt-8 p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/30 max-w-md mx-auto text-left flex gap-3">
                            <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <p className="text-sm text-emerald-400/80 leading-relaxed">
                                Once your team approves the content, you can easily push this directly to your live domain from the blog management dashboard later!
                            </p>
                        </div>
                    )}

                    <div className="mt-8 flex justify-center">
                        <button
                            onClick={() => {
                                if (onComplete) onComplete(publishData);
                                window.location.href = "/dashboard";
                            }}
                            className="rounded-lg bg-white px-6 py-2.5 text-sm font-bold text-neutral-900 transition-colors hover:bg-neutral-200"
                        >
                            Return to Dashboard
                        </button>
                    </div>
                </div>
            )}

            {/* Error / Rollback State */}
            {publishState === "failed" && (
                <div className="text-center py-6 animate-in zoom-in-95 duration-500">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20 text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h3 className="mb-2 text-2xl font-bold text-white tracking-tight">Publishing Interrupted</h3>
                    <p className="text-neutral-400 mb-6 max-w-md mx-auto">There was a problem communicating with the external API.</p>

                    <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-4 inline-block text-left mb-6">
                        <span className="block text-xs text-red-400/70 uppercase font-semibold mb-1">Error Trace</span>
                        <code className="text-red-400 text-sm">{error}</code>
                    </div>

                    <div className="flex justify-center gap-4">
                        <button
                            onClick={handleRollback}
                            className="rounded-lg bg-neutral-800 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-neutral-700"
                        >
                            Rollback & Edit
                        </button>
                        <button
                            onClick={() => handlePublish(publishType)}
                            className="rounded-lg bg-red-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-500"
                        >
                            Retry Request
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
