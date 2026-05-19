"use client";

import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { BusinessContext } from "@/lib/types/businessContext";
import type { FactSource } from "@/lib/types/factSource";
import {
    FactCitationDecorations,
    refreshFactCitationDecorations,
    type FactCitationDecorationOptions,
} from "@/components/tiptap/FactCitationDecorations";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { marked } from "marked";
import TurndownService from "turndown";

interface RichTextEditorProps {
    value: string;
    onChange: (val: string) => void;
    internalLinks?: BusinessContext["internalLinks"];
    /** Fill parent flex column and scroll editor body (edit modal). */
    fillHeight?: boolean;
    /** Inside ArticleContentEditor — no outer card border. */
    embedded?: boolean;
    factSources?: FactSource[];
    factModeEnabled?: boolean;
    onRemoveFactSource?: (id: string) => void;
}

export type RichTextEditorHandle = {
    getSelectionText: () => string;
    focus: () => void;
};

/** Inline link insert modal */
function LinkModal({ internalLinks, selectedAnchorText, onInsert, onClose }: {
    internalLinks: BusinessContext["internalLinks"];
    /** Non-empty when user opened the modal with a text selection (anchor = selection; no separate prompt). */
    selectedAnchorText?: string;
    onInsert: (text: string, url: string) => void;
    onClose: () => void;
}) {
    const [tab, setTab] = useState<"internal" | "custom">("internal");
    const [customUrl, setCustomUrl] = useState("https://");
    const [customText, setCustomText] = useState("");
    const hasSelectionAnchor = Boolean(selectedAnchorText?.trim());

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
            <div className="w-full max-w-md rounded-2xl bg-neutral-900 border border-neutral-700 shadow-2xl shadow-black/60 overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        Insert Link
                    </h3>
                    <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-neutral-800">
                    {(internalLinks && internalLinks.length > 0) && (
                        <button
                            onClick={() => setTab("internal")}
                            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${tab === "internal" ? "text-emerald-400 border-b-2 border-emerald-400" : "text-neutral-500 hover:text-neutral-300"}`}
                        >
                            Internal Links
                        </button>
                    )}
                    <button
                        onClick={() => setTab("custom")}
                        className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${tab === "custom" ? "text-emerald-400 border-b-2 border-emerald-400" : "text-neutral-500 hover:text-neutral-300"}`}
                    >
                        Custom URL
                    </button>
                </div>

                <div className="p-4">
                    {tab === "internal" && internalLinks && internalLinks.length > 0 ? (
                        <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                            {internalLinks.map((link, i) => (
                                <button
                                    key={i}
                                    onClick={() => onInsert(link.anchorText, link.href)}
                                    className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-emerald-500/50 transition-all text-left group"
                                >
                                    <div>
                                        <p className="text-sm font-medium text-white group-hover:text-emerald-400 transition-colors">{link.anchorText}</p>
                                        <p className="text-xs text-neutral-500 font-mono mt-0.5">{link.href}</p>
                                    </div>
                                    <svg className="w-4 h-4 text-neutral-600 group-hover:text-emerald-400 shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </button>
                            ))}
                        </div>
                    ) : tab === "custom" ? (
                        <div className="space-y-3">
                            {hasSelectionAnchor ? (
                                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">Selected text (anchor)</p>
                                    <p className="text-sm text-neutral-200 line-clamp-4 whitespace-pre-wrap break-words">{selectedAnchorText}</p>
                                    <p className="text-[10px] text-neutral-500 mt-1.5">Only the URL is needed — the link wraps your selection.</p>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Link text</label>
                                    <input
                                        type="text"
                                        value={customText}
                                        onChange={e => setCustomText(e.target.value)}
                                        placeholder="Text to show for this link"
                                        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition-colors"
                                    />
                                    <p className="text-[10px] text-neutral-500 mt-1">Or select text in the editor first, then open Link — anchor text is optional here.</p>
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1.5">URL</label>
                                <input
                                    type="url"
                                    value={customUrl}
                                    onChange={e => setCustomUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-500 font-mono focus:outline-none focus:border-emerald-500 transition-colors"
                                />
                            </div>
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                    if (!customUrl || customUrl === "https://") return;
                                    const anchor = hasSelectionAnchor ? (selectedAnchorText || "") : (customText.trim() || customUrl);
                                    onInsert(anchor, customUrl);
                                }}
                                disabled={!customUrl || customUrl === "https://"}
                                className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-bold text-white transition-colors"
                            >
                                Insert Link
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

/** Prevent toolbar clicks from stealing focus from ProseMirror (fixes list/bold/etc. on selection). */
function toolbarPointerDown(e: React.MouseEvent) {
    e.preventDefault();
}

export const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(function RichTextEditor(
    {
        value,
        onChange,
        internalLinks = [],
        fillHeight = false,
        embedded = false,
        factSources = [],
        factModeEnabled = false,
        onRemoveFactSource,
    },
    ref,
) {
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [pendingSelectionText, setPendingSelectionText] = useState("");
    const [pendingLinkRange, setPendingLinkRange] = useState<{ from: number; to: number } | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const lastMarkdownFromEditorRef = useRef("");
    const citationOptsRef = useRef<FactCitationDecorationOptions>({
        sources: [],
        enabled: false,
    });
    const turndown = useMemo(() => new TurndownService({ headingStyle: "atx", bulletListMarker: "-" }), []);

    citationOptsRef.current = {
        sources: factSources,
        enabled: factModeEnabled,
        onRemoveSource: onRemoveFactSource,
    };

    useEffect(() => {
        if (typeof document === "undefined") return;
        document.body.style.overflow = isFullscreen ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [isFullscreen]);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
            }),
            Link.configure({
                openOnClick: false,
                autolink: true,
            }),
            Image,
            Placeholder.configure({
                placeholder: "Start editing your optimized content here...",
            }),
            FactCitationDecorations.configure({
                getCitationOptions: () => citationOptsRef.current,
            }),
        ],
        content: "",
        immediatelyRender: true,
        onUpdate: ({ editor: tiptapEditor }) => {
            const html = tiptapEditor.getHTML();
            const markdown = turndown.turndown(html);
            lastMarkdownFromEditorRef.current = markdown;
            onChange(markdown);
        },
    });

    useEffect(() => {
        if (!editor) return;
        const nextValue = value || "";
        if (nextValue === lastMarkdownFromEditorRef.current && !editor.isEmpty) return;

        let alive = true;
        (async () => {
            try {
                const html = await marked.parse(nextValue || "");
                if (!alive) return;
                lastMarkdownFromEditorRef.current = nextValue;
                editor.commands.setContent(String(html || "<p></p>"), { emitUpdate: false });
            } catch {
                if (!alive) return;
                lastMarkdownFromEditorRef.current = nextValue;
                const escaped = nextValue
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;");
                editor.commands.setContent(
                    escaped ? `<pre style="white-space:pre-wrap;font-family:inherit">${escaped}</pre>` : "<p></p>",
                    { emitUpdate: false },
                );
            }
        })();
        return () => {
            alive = false;
        };
    }, [value, editor]);

    useEffect(() => {
        if (!editor) return;
        refreshFactCitationDecorations(editor);
    }, [editor, factSources, factModeEnabled, onRemoveFactSource]);

    const handleInsertLink = (text: string, url: string) => {
        if (!editor) return;
        const range = pendingLinkRange;
        if (range && range.from < range.to) {
            editor.chain().focus().setTextSelection({ from: range.from, to: range.to }).setLink({ href: url }).run();
        } else {
            const label = (text || "").trim() || url;
            editor.chain().focus().insertContent({
                type: "text",
                text: label,
                marks: [{ type: "link", attrs: { href: url } }],
            }).run();
        }
        setShowLinkModal(false);
        setPendingSelectionText("");
        setPendingLinkRange(null);
    };

    const openLinkModal = () => {
        if (!editor) return;
        const { from, to } = editor.state.selection;
        setPendingLinkRange(from < to ? { from, to } : null);
        setPendingSelectionText(editor.state.doc.textBetween(from, to, " "));
        setShowLinkModal(true);
    };

    useImperativeHandle(ref, () => ({
        getSelectionText: () => {
            if (!editor) return "";
            const { from, to } = editor.state.selection;
            if (from >= to) return "";
            return editor.state.doc.textBetween(from, to, "\n\n").trim();
        },
        focus: () => editor?.chain().focus().run(),
    }), [editor]);

    return (
        <>
            {showLinkModal && (
                <LinkModal
                    internalLinks={internalLinks}
                    selectedAnchorText={pendingSelectionText}
                    onInsert={handleInsertLink}
                    onClose={() => {
                        setShowLinkModal(false);
                        setPendingSelectionText("");
                        setPendingLinkRange(null);
                    }}
                />
            )}
            <div
                className={`rich-text-wrapper relative flex flex-col transition-all ${embedded ? "rounded-none border-0" : "rounded-xl border border-neutral-800 focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/50"} ${fillHeight ? "flex-1 min-h-[280px] h-full overflow-hidden" : embedded ? "overflow-hidden" : "overflow-visible mt-9"} ${isFullscreen ? "fixed inset-4 z-[250] mt-0 bg-neutral-950 p-3 border border-neutral-800" : ""}`}
            >
                <div className={`absolute right-2 z-30 ${isFullscreen ? "-top-10" : "-top-10"}`}>
                    <button
                        type="button"
                        onMouseDown={toolbarPointerDown}
                        onClick={() => setIsFullscreen((prev) => !prev)}
                        className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-neutral-200 hover:border-emerald-500/60 hover:text-emerald-300 transition-colors"
                    >
                        {isFullscreen ? "Exit Editor" : "Expand Editor"}
                    </button>
                </div>

                <div className="flex items-center flex-wrap gap-1 border-b border-neutral-800 bg-[#060b14] px-3 py-2">
                    <button type="button" onMouseDown={toolbarPointerDown} onClick={() => editor?.chain().focus().toggleBold().run()} className="toolbar-btn"><b>B</b></button>
                    <button type="button" onMouseDown={toolbarPointerDown} onClick={() => editor?.chain().focus().toggleItalic().run()} className="toolbar-btn italic">I</button>
                    <button type="button" onMouseDown={toolbarPointerDown} onClick={() => editor?.chain().focus().toggleStrike().run()} className="toolbar-btn line-through">S</button>
                    <span className="mx-1 h-4 w-px bg-neutral-700" />
                    <button type="button" onMouseDown={toolbarPointerDown} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} className="toolbar-btn">H1</button>
                    <button type="button" onMouseDown={toolbarPointerDown} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className="toolbar-btn">H2</button>
                    <button type="button" onMouseDown={toolbarPointerDown} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} className="toolbar-btn">H3</button>
                    <button type="button" onMouseDown={toolbarPointerDown} onClick={() => editor?.chain().focus().setHorizontalRule().run()} className="toolbar-btn">HR</button>
                    <span className="mx-1 h-4 w-px bg-neutral-700" />
                    <button
                        type="button"
                        onMouseDown={toolbarPointerDown}
                        onClick={() => openLinkModal()}
                        className="toolbar-btn"
                    >
                        Link
                    </button>
                    <button
                        type="button"
                        onMouseDown={toolbarPointerDown}
                        onClick={() => {
                            const imageUrl = window.prompt("Enter image URL");
                            if (imageUrl) editor?.chain().focus().setImage({ src: imageUrl }).run();
                        }}
                        className="toolbar-btn"
                    >
                        Img
                    </button>
                    <button type="button" onMouseDown={toolbarPointerDown} onClick={() => editor?.chain().focus().toggleBlockquote().run()} className="toolbar-btn">"</button>
                    <button type="button" onMouseDown={toolbarPointerDown} onClick={() => editor?.chain().focus().toggleCodeBlock().run()} className="toolbar-btn">{"</>"}</button>
                    <button type="button" onMouseDown={toolbarPointerDown} onClick={() => editor?.chain().focus().toggleBulletList().run()} className="toolbar-btn">• List</button>
                    <button type="button" onMouseDown={toolbarPointerDown} onClick={() => editor?.chain().focus().toggleOrderedList().run()} className="toolbar-btn">1. List</button>
                    {internalLinks.length > 0 && (
                        <button
                            type="button"
                            onMouseDown={toolbarPointerDown}
                            onClick={() => openLinkModal()}
                            className="toolbar-btn !text-emerald-400"
                        >
                            Links
                        </button>
                    )}
                </div>

                <div
                    className={`tiptap-shell bg-[#111827] text-neutral-100 ${fillHeight || isFullscreen ? "flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 md:p-6 tiptap-shell--scroll" : "min-h-[500px] p-6"}`}
                >
                    {editor ? (
                        <EditorContent editor={editor} />
                    ) : (
                        <p className="text-sm text-neutral-500 animate-pulse">Loading editor…</p>
                    )}
                </div>
            </div>
            <style jsx global>{`
                .toolbar-btn {
                    border: 1px solid rgba(82, 82, 91, 0.8);
                    background: rgba(10, 10, 10, 0.4);
                    color: #d4d4d8;
                    border-radius: 0.35rem;
                    font-size: 11px;
                    font-weight: 700;
                    letter-spacing: 0.06em;
                    padding: 0.2rem 0.45rem;
                    text-transform: uppercase;
                }
                .toolbar-btn:hover {
                    border-color: rgba(52, 211, 153, 0.6);
                    color: #86efac;
                }
                .tiptap-shell .ProseMirror {
                    min-height: 460px;
                    outline: none;
                    line-height: 1.65;
                }
                .tiptap-shell--scroll .ProseMirror {
                    min-height: 200px;
                }
                .tiptap-shell .ProseMirror h1,
                .tiptap-shell .ProseMirror h2,
                .tiptap-shell .ProseMirror h3 {
                    color: #f5f5f5;
                    font-weight: 800;
                    margin-top: 1rem;
                    margin-bottom: 0.6rem;
                }
                .tiptap-shell .ProseMirror p,
                .tiptap-shell .ProseMirror li,
                .tiptap-shell .ProseMirror blockquote {
                    color: #d4d4d8;
                }
                .tiptap-shell .ProseMirror ul,
                .tiptap-shell .ProseMirror ol {
                    margin: 0.5rem 0 0.75rem 1.25rem;
                    padding-left: 0.5rem;
                }
                .tiptap-shell .ProseMirror ul {
                    list-style-type: disc;
                }
                .tiptap-shell .ProseMirror ol {
                    list-style-type: decimal;
                }
                .tiptap-shell .ProseMirror li {
                    margin: 0.2rem 0;
                    display: list-item;
                }
                .tiptap-shell .ProseMirror a {
                    color: #34d399;
                    text-decoration: underline;
                }
                .tiptap-shell .ProseMirror .fact-citation-highlight {
                    background: rgba(16, 185, 129, 0.22);
                    box-decoration-break: clone;
                    -webkit-box-decoration-break: clone;
                    border-radius: 2px;
                    box-shadow: inset 0 -2px 0 rgba(52, 211, 153, 0.55);
                }
                .tiptap-shell .ProseMirror .fact-citation-chip-mount {
                    display: inline-flex;
                    vertical-align: super;
                    margin-left: 1px;
                    user-select: none;
                }
            `}</style>
        </>
    );
});
