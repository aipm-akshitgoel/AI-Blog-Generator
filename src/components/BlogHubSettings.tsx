"use client";

import { useState } from "react";

export function BlogHubSettings() {
    const [isExpanded, setIsExpanded] = useState(false);
    const [layout, setLayout] = useState<"grid" | "list" | "magazine">("grid");
    const [categories, setCategories] = useState("Technology, Lifestyle, Business");

    return (
        <div className="mb-8 rounded-xl border border-neutral-800 bg-neutral-900/40 p-1">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 md:p-6 text-left focus:outline-none rounded-lg hover:bg-neutral-800/50 transition-colors"
            >
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        Public Blog Hub Settings
                    </h3>
                    <p className="text-sm text-neutral-400 mt-1">Configure how your overall /blog page looks and categorizes your published posts.</p>
                </div>
                <div className="flex items-center gap-4">
                    <span className="hidden md:inline-flex px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                        Customize Index
                    </span>
                    <svg
                        className={`w-5 h-5 text-neutral-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {isExpanded && (
                <div className="p-4 md:p-6 border-t border-neutral-800 animate-in slide-in-from-top-4 duration-300 space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-neutral-200 mb-2">Index Layout Style</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {(["grid", "list", "magazine"] as const).map((l) => (
                                <button
                                    key={l}
                                    onClick={() => setLayout(l)}
                                    className={`p-4 rounded-xl border text-left transition-all ${layout === l
                                        ? "border-indigo-500 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.15)]"
                                        : "border-neutral-800 bg-neutral-950 hover:border-neutral-700"
                                        }`}
                                >
                                    <h4 className="font-bold text-white capitalize">{l} View</h4>
                                    <p className="text-xs text-neutral-500 mt-1">
                                        {l === "grid" && "Classic card grid layout showing cover images."}
                                        {l === "list" && "Clean rows with smaller thumbnails, good for high volume."}
                                        {l === "magazine" && "Featured top post with grid below, editorial feel."}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-neutral-200 mb-2">Categories / Tags Filter</label>
                        <input
                            type="text"
                            value={categories}
                            onChange={(e) => setCategories(e.target.value)}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                            placeholder="e.g. Tips, News, Case Studies (comma separated)"
                        />
                        <p className="text-xs text-neutral-500 mt-2">These will appear as pills at the top of your /blog page to filter content.</p>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-neutral-800">
                        <a
                            href="/blog"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-indigo-500 shadow-md shadow-indigo-900/20"
                        >
                            Preview Blog Hub
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}
