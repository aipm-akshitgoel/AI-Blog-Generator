"use client";

import { useState } from "react";
import { SavedBlog } from "@/lib/mockDb";
import { RichTextEditor } from "@/components/RichTextEditor";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function EditBlogClient({ blog }: { blog: SavedBlog }) {
    const [title, setTitle] = useState(blog.title);
    const [content, setContent] = useState(blog.payload.content.contentMarkdown);
    const [metaTitle, setMetaTitle] = useState(blog.payload.meta?.title || "");
    const [metaDesc, setMetaDesc] = useState(blog.payload.meta?.description || "");
    const [ctaHeadline, setCtaHeadline] = useState(blog.payload.cta?.ctaHeadline || "");
    const [ctaCopy, setCtaCopy] = useState(blog.payload.cta?.ctaCopy || "");
    const [ctaButtonText, setCtaButtonText] = useState(blog.payload.cta?.ctaButtonText || "");
    const [ctaLink, setCtaLink] = useState(blog.payload.cta?.ctaLink || "");
    const [bannerImageUrl, setBannerImageUrl] = useState(blog.payload.images?.bannerImageUrl || "");
    const [imageAltText, setImageAltText] = useState(blog.payload.images?.altText || "");
    const [category, setCategory] = useState<string>((blog as any).category || "");
    // Schema editors
    const [articleSchemaJson, setArticleSchemaJson] = useState(() => {
        try {
            const parsed = JSON.parse(blog.payload.schema?.jsonLd || "{}");
            const articleTypes = new Set(['Article', 'BlogPosting', 'NewsArticle']);
            if (Array.isArray(parsed['@graph'])) {
                const node = parsed['@graph'].find((n: any) => articleTypes.has(n['@type']));
                return node ? JSON.stringify(node, null, 2) : "";
            }
            return JSON.stringify(parsed, null, 2);
        } catch { return ""; }
    });
    const [orgSchemaJson, setOrgSchemaJson] = useState(() => {
        try {
            const parsed = JSON.parse(blog.payload.schema?.jsonLd || "{}");
            const articleTypes = new Set(['Article', 'BlogPosting', 'NewsArticle']);
            if (Array.isArray(parsed['@graph'])) {
                const nodes = parsed['@graph'].filter((n: any) => !articleTypes.has(n['@type']));
                return nodes.length > 0 ? JSON.stringify(nodes, null, 2) : "";
            }
            return "";
        } catch { return ""; }
    });
    const [schemaArticleOpen, setSchemaArticleOpen] = useState(false);
    const [schemaOrgOpen, setSchemaOrgOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const router = useRouter();

    const CATEGORIES = ['Technology', 'Lifestyle', 'Business', 'AI Insights', 'Beauty & Wellness', 'Health', 'Finance', 'Travel', 'Food', 'Other'];

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/upload", { method: "POST", body: formData });
            if (!res.ok) throw new Error("Upload failed");
            const data = await res.json();
            setBannerImageUrl(data.url);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(`/api/blog/${blog.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title,
                    contentMarkdown: content,
                    metaTitle,
                    metaDescription: metaDesc,
                    ctaHeadline,
                    ctaCopy,
                    ctaButtonText,
                    ctaLink,
                    bannerImageUrl,
                    imageAltText,
                    category,
                    articleSchemaJson,
                    orgSchemaJson,
                })
            });
            if (!res.ok) throw new Error("Failed to save changes.");
            router.push(`/dashboard`);
            router.refresh();
        } catch (e: any) {
            alert(e.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-950 p-6 md:p-12 text-white">
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <Link href={`/dashboard`} className="text-sm text-neutral-400 hover:text-white flex items-center gap-1 mb-2 transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                            </svg>
                            Cancel Edit & Return
                        </Link>
                        <h1 className="text-3xl font-bold tracking-tight">Edit Post</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <a
                            href={`/blog/${blog.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-bold rounded-lg shadow-sm flex items-center gap-2 transition-all"
                        >
                            View Post
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </a>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-lg flex items-center gap-2 transition-all disabled:opacity-50"
                        >
                            {isSaving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Post Title</label>
                    <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-lg font-bold text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                    />
                </div>

                <div className="space-y-4">
                    <label className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Content Editor</label>
                    <div className="border border-neutral-800 rounded-lg overflow-hidden focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-colors" data-color-mode="dark">
                        <RichTextEditor
                            value={content}
                            onChange={setContent}
                        />
                    </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-neutral-800">
                    <label className="text-sm font-bold text-emerald-500 uppercase tracking-wider">Hero Banner Image</label>
                    <div className="flex flex-col md:flex-row items-center gap-6 border border-neutral-800 rounded-lg p-6 bg-neutral-900/30">
                        {bannerImageUrl ? (
                            <div className="w-full md:w-[300px] aspect-video relative rounded-lg overflow-hidden border border-neutral-800 shrink-0">
                                <img src={bannerImageUrl} alt="Banner Preview" className="w-full h-full object-cover" />
                                {isUploading && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                                        <svg className="w-6 h-6 text-emerald-500 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="w-full md:w-[300px] aspect-video rounded-lg border border-dashed border-neutral-700 flex flex-col items-center justify-center bg-neutral-900/50 shrink-0 text-center p-4">
                                {isUploading ? (
                                    <svg className="w-6 h-6 text-emerald-500 animate-spin mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                ) : (
                                    <svg className="w-8 h-8 text-neutral-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                )}
                                <span className="text-xs text-neutral-500">{isUploading ? 'Uploading...' : 'No cover image selected'}</span>
                            </div>
                        )}
                        <div className="flex-1 space-y-4 w-full">
                            <div>
                                <label className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase tracking-wider">Upload New Image</label>
                                <input type="file" accept="image/*" onChange={handleUpload} disabled={isUploading} className="w-full text-sm text-neutral-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-500/10 file:text-emerald-500 hover:file:bg-emerald-500/20 cursor-pointer" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase tracking-wider">Or Image URL</label>
                                <input type="url" value={bannerImageUrl} onChange={e => setBannerImageUrl(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono" placeholder="https://" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase tracking-wider">Image Alt Text <span className="normal-case font-normal text-neutral-500">(for SEO &amp; accessibility)</span></label>
                                <input type="text" value={imageAltText} onChange={e => setImageAltText(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" placeholder="Describe the image for screen readers and search engines..." />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Category */}
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
                    <label className="text-sm font-bold text-emerald-500 uppercase tracking-wider mb-4 block">Post Category</label>
                    <p className="text-xs text-neutral-500 mb-3">Assigns this post to a category on the public blog hub so readers can filter by topic.</p>
                    <select
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    >
                        <option value="">Untagged / General</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-neutral-800">
                    <div className="space-y-4">
                        <label className="text-sm font-bold text-emerald-500 uppercase tracking-wider">SEO Metadata</label>
                        <div>
                            <label className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase tracking-wider">Meta Title</label>
                            <input
                                type="text"
                                value={metaTitle}
                                onChange={(e) => setMetaTitle(e.target.value)}
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase tracking-wider">Meta Description</label>
                            <textarea
                                value={metaDesc}
                                onChange={(e) => setMetaDesc(e.target.value)}
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none"
                                rows={3}
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-sm font-bold text-emerald-500 uppercase tracking-wider">Call to Action (CTA)</label>
                        <div>
                            <label className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase tracking-wider">CTA Headline</label>
                            <input
                                type="text"
                                value={ctaHeadline}
                                onChange={(e) => setCtaHeadline(e.target.value)}
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase tracking-wider">Supporting Text</label>
                            <textarea
                                value={ctaCopy}
                                onChange={(e) => setCtaCopy(e.target.value)}
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none"
                                rows={2}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase tracking-wider">Button Text</label>
                                <input
                                    type="text"
                                    value={ctaButtonText}
                                    onChange={(e) => setCtaButtonText(e.target.value)}
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 uppercase"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase tracking-wider">Link</label>
                                <input
                                    type="url"
                                    value={ctaLink}
                                    onChange={(e) => setCtaLink(e.target.value)}
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Schema Editors */}
                <div className="space-y-4 pt-6 border-t border-neutral-800">
                    <label className="text-sm font-bold text-emerald-500 uppercase tracking-wider block">Schema / Structured Data</label>
                    <p className="text-xs text-neutral-500">Edit the JSON-LD that search engines use to understand your content. Invalid JSON will be flagged on save.</p>

                    {/* Article Schema */}
                    <div className="rounded-xl border border-neutral-800 bg-neutral-950 overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setSchemaArticleOpen(o => !o)}
                            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-neutral-900 transition-colors"
                        >
                            <div>
                                <span className="text-sm font-semibold text-neutral-200">Article Schema (Page-Level)</span>
                                <p className="text-[11px] text-neutral-500 mt-0.5">Specific to this blog post — title, description, publish date.</p>
                            </div>
                            <svg className={`w-4 h-4 text-neutral-500 transition-transform ${schemaArticleOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        {schemaArticleOpen && (
                            <div className="px-5 pb-5 border-t border-neutral-800">
                                <textarea
                                    value={articleSchemaJson}
                                    onChange={e => setArticleSchemaJson(e.target.value)}
                                    rows={12}
                                    spellCheck={false}
                                    className="w-full mt-4 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-xs text-emerald-300 font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-y"
                                />
                                <p className="text-[11px] text-neutral-600 mt-2">Tip: Must be valid JSON. Only include the Article node — org-level data lives separately.</p>
                            </div>
                        )}
                    </div>

                    {/* Org / Domain Schema */}
                    <div className="rounded-xl border border-neutral-800 bg-neutral-950 overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setSchemaOrgOpen(o => !o)}
                            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-neutral-900 transition-colors"
                        >
                            <div>
                                <span className="text-sm font-semibold text-neutral-200">Organisation Schema (Domain-Level)</span>
                                <p className="text-[11px] text-neutral-500 mt-0.5">Brand + business type — auto-updates when you refresh your Strategy. Override here if needed.</p>
                            </div>
                            <svg className={`w-4 h-4 text-neutral-500 transition-transform ${schemaOrgOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        {schemaOrgOpen && (
                            <div className="px-5 pb-5 border-t border-neutral-800">
                                <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-900/20 border border-amber-800/40 px-3 py-2.5 mb-3">
                                    <svg className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                                    <p className="text-xs text-amber-300">This schema auto-regenerates when you refresh your SEO strategy. Manual edits here take effect immediately but may be overwritten on the next schema generation run.</p>
                                </div>
                                <textarea
                                    value={orgSchemaJson}
                                    onChange={e => setOrgSchemaJson(e.target.value)}
                                    rows={12}
                                    spellCheck={false}
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-xs text-blue-300 font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-y"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
