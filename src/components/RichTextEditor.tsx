"use client";

import React, { useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import rehypeSanitize from "rehype-sanitize";
import type { BusinessContext } from "@/lib/types/businessContext";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";

// Dynamically import MDEditor to avoid SSR issues
const MDEditor = dynamic(
    () => import("@uiw/react-md-editor"),
    { ssr: false, loading: () => <div className="h-96 w-full animate-pulse bg-neutral-900 rounded-lg border border-neutral-800"></div> }
);

// We need the commands object for custom toolbars
import * as commands from "@uiw/react-md-editor/commands";

interface RichTextEditorProps {
    value: string;
    onChange: (val: string) => void;
    internalLinks?: BusinessContext["internalLinks"];
}

export function RichTextEditor({ value, onChange, internalLinks = [] }: RichTextEditorProps) {
    // Determine the extra commands
    const smartLinksCommand = useMemo(() => {
        if (!internalLinks || internalLinks.length === 0) return null;

        return {
            name: "smart-links",
            keyCommand: "smart-links",
            buttonProps: { "aria-label": "Smart Links" },
            icon: (
                <div className="flex items-center gap-1 text-xs font-bold px-1 text-emerald-400">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Smart Links
                </div>
            ),
            execute: (state: any, api: any) => {
                // We'll show a prompt for now to keep the UI simple but effective. 
                // A true dropdown in the toolbar is complex, so we'll just format the prompt to list them.
                const options = internalLinks.map((l, i) => `${i + 1}: ${l.anchorText}`).join("\n");
                const choice = window.prompt(`Type the number to insert a link:\n${options}`);
                const idx = parseInt(choice || "", 10) - 1;

                if (!isNaN(idx) && internalLinks[idx]) {
                    const link = internalLinks[idx];
                    let modifyText = `[${link.anchorText}](${link.href})`;
                    if (state.selectedText) {
                        modifyText = `[${state.selectedText}](${link.href})`;
                    }
                    api.replaceSelection(modifyText);
                }
            },
        };
    }, [internalLinks]);

    const getCommands = useCallback(() => {
        const heading2 = {
            ...commands.title2,
            icon: <span className="font-bold text-xs px-1">H2</span>
        };
        const heading3 = {
            ...commands.title3,
            icon: <span className="font-bold text-xs px-1">H3</span>
        };
        const imageCommand = {
            ...commands.image,
            execute: (state: any, api: any) => {
                let modifyText = `![Enter descriptive alt text here](https://...)`;
                if (state.selectedText) {
                    modifyText = `![${state.selectedText}](https://...)`;
                }
                api.replaceSelection(modifyText);
            }
        };

        const defaultCommands = [
            commands.bold,
            commands.italic,
            commands.strikethrough,
            commands.hr,
            commands.divider,
            heading2,
            heading3,
            commands.divider,
            commands.link,
            imageCommand,
            commands.quote,
            commands.code,
            commands.codeBlock,
            commands.divider,
            commands.unorderedListCommand,
            commands.orderedListCommand,
            commands.checkedListCommand,
        ];
        if (smartLinksCommand) {
            return [...defaultCommands, commands.divider, smartLinksCommand];
        }
        return defaultCommands;
    }, [smartLinksCommand]);

    return (
        <div data-color-mode="dark" className="rich-text-wrapper overflow-hidden rounded-xl border border-neutral-800 focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/50 transition-all">
            <MDEditor
                value={value}
                onChange={(val) => onChange(val || "")}
                previewOptions={{
                    rehypePlugins: [[rehypeSanitize]],
                }}
                commands={getCommands()}
                height={500}
                preview="edit"
                className="w-full"
                textareaProps={{
                    placeholder: "Start editing your optimized content here...",
                }}
            />
        </div>
    );
}
