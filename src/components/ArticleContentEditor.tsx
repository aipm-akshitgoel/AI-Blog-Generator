"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import type { FactSource } from "@/lib/types/factSource";
import type { BusinessContext } from "@/lib/types/businessContext";
import { RichTextEditor, type RichTextEditorHandle } from "@/components/RichTextEditor";

export type ArticleContentEditorHandle = {
    getSelectionText: () => string;
    focus: () => void;
};

interface ArticleContentEditorProps {
    value: string;
    onChange: (val: string) => void;
    factSources: FactSource[];
    onRemoveFactSource?: (id: string) => void;
    factModeEnabled: boolean;
    onFactModeChange: (enabled: boolean) => void;
    internalLinks?: BusinessContext["internalLinks"];
    fillHeight?: boolean;
}

export const ArticleContentEditor = forwardRef<ArticleContentEditorHandle, ArticleContentEditorProps>(
    function ArticleContentEditor(
        {
            value,
            onChange,
            factSources,
            onRemoveFactSource,
            factModeEnabled,
            onFactModeChange,
            internalLinks,
            fillHeight = false,
        },
        ref,
    ) {
        const editorRef = useRef<RichTextEditorHandle>(null);

        useImperativeHandle(ref, () => ({
            getSelectionText: () => editorRef.current?.getSelectionText() ?? "",
            focus: () => editorRef.current?.focus(),
        }));

        const wordCount = value.trim() ? value.split(/\s+/).filter(Boolean).length : 0;
        const linkCount = [...value.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)].length;

        return (
            <div
                className={`flex w-full flex-col rounded-xl border-2 border-emerald-500/20 overflow-hidden bg-[#111827] shadow-lg shadow-black/30 ${
                    fillHeight ? "flex-1 min-h-[50vh] h-full" : "min-h-[500px]"
                }`}
            >
                <div className="shrink-0 border-b border-neutral-800 bg-[#060b14] px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                        Article content
                    </span>
                    <div className="flex flex-wrap items-center gap-3">
                        {factSources.length > 0 && (
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                                    Source citations
                                </span>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={factModeEnabled}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onFactModeChange(!factModeEnabled);
                                    }}
                                    className={`relative h-5 w-9 rounded-full transition-colors ${
                                        factModeEnabled ? "bg-emerald-600" : "bg-neutral-700"
                                    }`}
                                >
                                    <span
                                        className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                                            factModeEnabled ? "translate-x-4" : "translate-x-0"
                                        }`}
                                    />
                                </button>
                            </div>
                        )}
                        <span className="text-[10px] font-medium tabular-nums text-neutral-300">
                            {wordCount.toLocaleString()} words
                            {linkCount > 0 && (
                                <>
                                    <span className="text-neutral-500"> · </span>
                                    <span className="text-emerald-400/90">{linkCount} links</span>
                                </>
                            )}
                        </span>
                    </div>
                </div>

                <div
                    className={`relative flex flex-1 min-h-0 flex-col ${fillHeight ? "min-h-[48vh]" : "min-h-[460px]"}`}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                >
                    <RichTextEditor
                        ref={editorRef}
                        value={value}
                        onChange={onChange}
                        internalLinks={internalLinks}
                        factSources={factSources}
                        factModeEnabled={factModeEnabled}
                        onRemoveFactSource={onRemoveFactSource}
                        fillHeight
                        embedded
                    />
                </div>
            </div>
        );
    },
);
