"use client";

import type { TopicTocDraft } from "@/lib/topicTocDraft";
import { CtaButton } from "@/components/ui/CtaButton";

const inputClass =
    "w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-amber-500/60";

interface TopicTocEditorProps {
    draft: TopicTocDraft;
    onChange: (draft: TopicTocDraft) => void;
    onSave: () => void;
    onCancel: () => void;
    revisePrompt: string;
    onRevisePromptChange: (value: string) => void;
    onAiRevise: () => void;
    isRevising: boolean;
    reviseError: string | null;
}

export function TopicTocEditor({
    draft,
    onChange,
    onSave,
    onCancel,
    revisePrompt,
    onRevisePromptChange,
    onAiRevise,
    isRevising,
    reviseError,
}: TopicTocEditorProps) {
    return (
        <div className="md:col-span-2 self-start flex h-[min(75vh,700px)] w-full flex-col rounded-2xl border border-amber-700/60 bg-amber-950/10 animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="shrink-0 border-b border-amber-800/30 px-5 pt-5 pb-4">
                <h2 className="text-sm font-black uppercase tracking-tight text-amber-400">
                    Edit table of contents
                </h2>
            </div>

            <div className="shrink-0 border-b border-neutral-800/80 bg-neutral-950/50 px-5 py-4 space-y-2">
                <label className="block text-[10px] font-bold text-neutral-500 tracking-wide">
                    AI revise topic
                </label>
                <textarea
                    value={revisePrompt}
                    onChange={(e) => onRevisePromptChange(e.target.value)}
                    rows={2}
                    placeholder="e.g. Add one H2 on fees and ROI; shorten H3s under accreditation"
                    className={`${inputClass} resize-none text-xs border-amber-900/30`}
                />
                {reviseError && <p className="text-xs text-red-400">{reviseError}</p>}
                <CtaButton
                    type="button"
                    variant="amber"
                    onClick={onAiRevise}
                    loading={isRevising}
                    loadingLabel="Revising…"
                    disabled={!revisePrompt.trim() || isRevising}
                    className="w-full rounded-lg py-2 text-[10px]"
                >
                    Apply AI revision
                </CtaButton>
            </div>

            <div className="min-h-0 flex-1 toc-editor-scrollbar px-5 py-4 space-y-4">
                <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-emerald-500/80 mb-1">
                        Primary keyword
                    </label>
                    <input
                        type="text"
                        value={draft.primaryKeyword}
                        onChange={(e) => onChange({ ...draft, primaryKeyword: e.target.value })}
                        className={`${inputClass} text-emerald-400 border-emerald-900/40`}
                    />
                </div>

                <div>
                    <label className="block text-[10px] font-mono text-neutral-500 mb-1">H1</label>
                    <textarea
                        value={draft.title}
                        onChange={(e) => onChange({ ...draft, title: e.target.value })}
                        rows={2}
                        className={`${inputClass} font-bold uppercase tracking-tight leading-snug resize-y`}
                    />
                </div>

                <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">
                        Secondary keywords
                    </label>
                    <textarea
                        value={draft.secondaryText}
                        onChange={(e) => onChange({ ...draft, secondaryText: e.target.value })}
                        rows={Math.max(2, draft.secondaryText.split("\n").filter(Boolean).length || 2)}
                        className={`${inputClass} resize-y text-xs leading-relaxed`}
                        placeholder="One keyword per line"
                    />
                </div>

                <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">
                        Tertiary keywords
                    </label>
                    <textarea
                        value={draft.tertiaryText}
                        onChange={(e) => onChange({ ...draft, tertiaryText: e.target.value })}
                        rows={Math.max(2, draft.tertiaryText.split("\n").length || 2)}
                        className={`${inputClass} resize-y text-xs leading-relaxed`}
                        placeholder="One keyword per line"
                    />
                </div>

                <div className="space-y-3 pb-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                        Outline (H2 → H3)
                    </p>
                    {draft.sections.map((sec, i) => (
                        <div
                            key={i}
                            className="rounded-xl border border-neutral-800/80 bg-neutral-950/60 p-3 space-y-2"
                        >
                            <label className="block text-[10px] font-bold text-neutral-500">
                                H2 section {i + 1}
                            </label>
                            <input
                                type="text"
                                value={sec.h2}
                                onChange={(e) => {
                                    const sections = [...draft.sections];
                                    sections[i] = { ...sections[i], h2: e.target.value };
                                    onChange({ ...draft, sections });
                                }}
                                className={inputClass}
                            />
                            <label className="block text-[10px] font-bold text-neutral-600">
                                H3s under this H2 <span className="font-normal">(one per line)</span>
                            </label>
                            <textarea
                                value={sec.h3Text}
                                onChange={(e) => {
                                    const sections = [...draft.sections];
                                    sections[i] = { ...sections[i], h3Text: e.target.value };
                                    onChange({ ...draft, sections });
                                }}
                                rows={Math.max(2, sec.h3Text.split("\n").filter(Boolean).length || 2)}
                                className={`${inputClass} resize-y text-xs leading-relaxed`}
                            />
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={() =>
                            onChange({
                                ...draft,
                                sections: [...draft.sections, { h2: "", h3Text: "" }],
                            })
                        }
                        className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 hover:text-amber-400"
                    >
                        + Add H2 section
                    </button>
                </div>
            </div>

            <div className="shrink-0 flex justify-end gap-4 border-t border-amber-800/40 bg-amber-950/50 px-5 py-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className="text-xs text-neutral-500 font-bold hover:text-white uppercase tracking-widest"
                >
                    Discard
                </button>
                <button
                    type="button"
                    onClick={onSave}
                    className="rounded-lg bg-amber-500 px-6 py-2 text-xs font-black text-neutral-900 uppercase tracking-widest hover:bg-amber-400"
                >
                    Save TOC
                </button>
            </div>
        </div>
    );
}
