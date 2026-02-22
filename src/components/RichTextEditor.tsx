"use client";

import React, { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import rehypeSanitize from "rehype-sanitize";
import type { BusinessContext } from "@/lib/types/businessContext";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";

const MDEditor = dynamic(
    () => import("@uiw/react-md-editor"),
    { ssr: false, loading: () => <div className="h-96 w-full animate-pulse bg-neutral-900 rounded-lg border border-neutral-800"></div> }
);

import * as commands from "@uiw/react-md-editor/commands";

interface RichTextEditorProps {
    value: string;
    onChange: (val: string) => void;
    internalLinks?: BusinessContext["internalLinks"];
}

/** Inline link insert modal */
function LinkModal({ internalLinks, onInsert, onClose }: {
    internalLinks: BusinessContext["internalLinks"];
    onInsert: (text: string, url: string) => void;
    onClose: () => void;
}) {
    const [tab, setTab] = useState<"internal" | "custom">("internal");
    const [customUrl, setCustomUrl] = useState("https://");
    const [customText, setCustomText] = useState("");

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
                            <div>
                                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Link Text</label>
                                <input
                                    type="text"
                                    value={customText}
                                    onChange={e => setCustomText(e.target.value)}
                                    placeholder="Enter anchor text..."
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition-colors"
                                />
                            </div>
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
                                onClick={() => { if (customUrl && customUrl !== "https://") onInsert(customText || customUrl, customUrl); }}
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

export function RichTextEditor({ value, onChange, internalLinks = [] }: RichTextEditorProps) {
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [pendingApi, setPendingApi] = useState<any>(null);
    const [pendingState, setPendingState] = useState<any>(null);

    const handleInsertLink = (text: string, url: string) => {
        if (pendingApi && pendingState) {
            const md = pendingState.selectedText
                ? `[${pendingState.selectedText}](${url})`
                : `[${text}](${url})`;
            pendingApi.replaceSelection(md);
        }
        setShowLinkModal(false);
        setPendingApi(null);
        setPendingState(null);
    };

    const smartLinksCommand = internalLinks.length > 0 ? {
        name: "smart-links",
        keyCommand: "smart-links",
        buttonProps: { "aria-label": "Insert Internal Link" },
        icon: (
            <div className="flex items-center gap-1 text-xs font-bold px-1 text-emerald-400">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Links
            </div>
        ),
        execute: (state: any, api: any) => {
            setPendingState(state);
            setPendingApi(api);
            setShowLinkModal(true);
        },
    } : null;

    const getCommands = useCallback(() => {
        const heading2 = { ...commands.title2, icon: <span className="font-bold text-xs px-1">H2</span> };
        const heading3 = { ...commands.title3, icon: <span className="font-bold text-xs px-1">H3</span> };
        const imageCommand = {
            ...commands.image,
            execute: (state: any, api: any) => {
                const modifyText = state.selectedText
                    ? `![${state.selectedText}](https://...)`
                    : `![Enter descriptive alt text here](https://...)`;
                api.replaceSelection(modifyText);
            }
        };

        const defaultCommands = [
            commands.bold, commands.italic, commands.strikethrough, commands.hr,
            commands.divider, heading2, heading3, commands.divider,
            commands.link, imageCommand, commands.quote, commands.code, commands.codeBlock,
            commands.divider, commands.unorderedListCommand, commands.orderedListCommand, commands.checkedListCommand,
        ];
        if (smartLinksCommand) {
            return [...defaultCommands, commands.divider, smartLinksCommand];
        }
        return defaultCommands;
    }, [smartLinksCommand]);

    return (
        <>
            {showLinkModal && (
                <LinkModal
                    internalLinks={internalLinks}
                    onInsert={handleInsertLink}
                    onClose={() => { setShowLinkModal(false); setPendingApi(null); setPendingState(null); }}
                />
            )}
            <div data-color-mode="dark" className="rich-text-wrapper overflow-hidden rounded-xl border border-neutral-800 focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/50 transition-all">
                <MDEditor
                    value={value}
                    onChange={(val) => onChange(val || "")}
                    previewOptions={{ rehypePlugins: [[rehypeSanitize]] }}
                    commands={getCommands()}
                    height={500}
                    preview="edit"
                    className="w-full"
                    textareaProps={{ placeholder: "Start editing your optimized content here..." }}
                />
            </div>
        </>
    );
}
