"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";

export type MarkdownContentEditorHandle = {
    getSelectionText: () => string;
    focus: () => void;
};

interface MarkdownContentEditorProps {
    value: string;
    onChange: (val: string) => void;
    fillHeight?: boolean;
}

export const MarkdownContentEditor = forwardRef<MarkdownContentEditorHandle, MarkdownContentEditorProps>(
    function MarkdownContentEditor({ value, onChange, fillHeight = false }, ref) {
        const textareaRef = useRef<HTMLTextAreaElement>(null);

        useImperativeHandle(ref, () => ({
            getSelectionText: () => {
                const el = textareaRef.current;
                if (!el) return "";
                const { selectionStart: start, selectionEnd: end } = el;
                if (start >= end) return "";
                return el.value.slice(start, end).trim();
            },
            focus: () => textareaRef.current?.focus(),
        }));

        return (
            <div
                className={`flex w-full flex-col rounded-xl border-2 border-emerald-500/20 overflow-hidden bg-[#111827] shadow-lg shadow-black/30 ${
                    fillHeight ? "flex-1 min-h-[50vh] h-full" : "min-h-[500px]"
                }`}
            >
                <div className="shrink-0 border-b border-neutral-800 bg-[#060b14] px-3 py-2 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                        Article content
                    </span>
                    <span className="text-[10px] text-neutral-600">
                        {value.trim() ? `${value.split(/\s+/).filter(Boolean).length.toLocaleString()} words` : "Empty"}
                    </span>
                </div>
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    spellCheck
                    className={`w-full flex-1 bg-[#111827] text-neutral-100 px-4 py-4 md:px-6 md:py-5 text-sm leading-relaxed placeholder:text-neutral-600 focus:outline-none resize-none ${
                        fillHeight ? "min-h-[48vh]" : "min-h-[460px]"
                    }`}
                    placeholder="Your article will appear here."
                />
            </div>
        );
    },
);
