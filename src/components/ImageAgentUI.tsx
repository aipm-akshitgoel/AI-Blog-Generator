"use client";
import { useState, useEffect } from "react";
import { HelpTip } from "./HelpTip";
import type { OptimizedContent } from "@/lib/types/optimization";
import type { BusinessContext } from "@/lib/types/businessContext";
import type { ImageMetadata } from "@/lib/types/image";

interface ImageAgentProps {
    optimizedContent: OptimizedContent;
    businessContext: BusinessContext;
    onComplete?: (images: ImageMetadata) => void;
}

export function ImageAgentUI({ optimizedContent, businessContext, onComplete }: ImageAgentProps) {
    const [images, setImages] = useState<ImageMetadata | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [customPrompt, setCustomPrompt] = useState("");

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData
            });
            if (!res.ok) throw new Error("Upload failed");
            const data = await res.json();
            setImages(prev => prev ? { ...prev, bannerImageUrl: data.url } : null);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsUploading(false);
        }
    };

    const generateImages = async () => {
        setLoading(true);
        setError(null);
        try {
            const payload: any = { optimizedContent, businessContext, customPrompt };
            // Pass the current banner if we're regenerating
            if (images?.bannerImageUrl && customPrompt) {
                payload.currentImage = images.bannerImageUrl;
            }

            const res = await fetch("/api/image-agent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to generate images");
            }

            const data = await res.json();
            setImages(data.images);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error occurred.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        generateImages();
    }, [optimizedContent, businessContext]);

    if (loading) {
        return (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 flex flex-col items-center justify-center min-h-[200px]">
                <div className="mb-4 relative flex h-16 w-16 items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-4 border-emerald-900/50"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
                    <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                </div>
                <h3 className="text-sm font-medium text-neutral-200">Generating Custom Imagery...</h3>
                <p className="text-xs text-neutral-500 mt-2">Analyzing blog context to prompt Image Generation API.</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-sm text-red-500">
                {error}
            </div>
        );
    }

    if (!images) return null;

    return (
        <div className="rounded-xl border border-fuchsia-900/30 bg-fuchsia-950/10 p-6 shadow-sm animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-900/30 text-emerald-400 border border-emerald-800/50">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="font-bold text-neutral-100">AI Banner Image Generated</h3>
                        <p className="text-xs text-neutral-400">Visually consistent hero asset generated for your blog.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                generateImages();
                            }
                        }}
                        placeholder="Optional image prompt..."
                        className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500 transition-colors w-48"
                    />
                    <button
                        onClick={() => generateImages()}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[10px] font-black text-neutral-300 uppercase tracking-widest transition-all border border-neutral-700"
                    >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Regenerate
                    </button>
                </div>
            </div>

            <div className="relative w-full overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 h-64 shadow-inner mb-4 group inline-block">
                {/* Simulated Image */}
                <div
                    className="absolute inset-0 bg-cover bg-center transition-all duration-700 group-hover:scale-105 group-hover:opacity-75"
                    style={{ backgroundImage: `url('${images.bannerImageUrl}')` }}
                ></div>
                {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <svg className="w-8 h-8 text-emerald-500 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </div>
                )}

                <label className="absolute bottom-4 right-4 bg-neutral-900/90 hover:bg-black text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer border border-neutral-700 shadow-xl transition-colors backdrop-blur-md opacity-0 group-hover:opacity-100 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Upload Local Image Instead
                    <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={isUploading} />
                </label>
            </div>

            <div className="bg-neutral-950 rounded-lg p-5 border border-neutral-800">
                <div className="flex items-center gap-2 mb-1.5">
                    <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Image Alt Text</label>
                    <HelpTip text="A short description of the image for screen readers (accessibility) and Google Image Search. Good alt text can drive extra traffic to your post." />
                </div>
                <textarea
                    value={images.altText}
                    readOnly
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neutral-500 transition-colors resize-none"
                    rows={2}
                />
                <p className="text-xs text-neutral-500 italic mt-2">This text describes your image for search engines to boost your SEO.</p>
            </div>

            <div className="flex justify-end mt-6 border-t border-neutral-800 pt-4">
                <button
                    onClick={() => {
                        if (onComplete) onComplete(images);
                    }}
                    className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 shadow-lg shadow-emerald-900/20 flex items-center gap-2"
                >
                    Continue to Publishing
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                </button>
            </div>
        </div >
    );
}
