"use client";

import { useState, useRef } from "react";
import type { TopicOption } from "@/lib/types/strategy";
import type { TopicBrief, SupplementaryFile } from "@/lib/types/topicBrief";
import { extractBriefFileText, isBriefFileSupported } from "@/lib/extractBriefFileText";
import {
    DEFAULT_H3_PER_H2,
    normalizeContentConstraints,
    normalizeInterlinkingRules,
    parseKeywordList,
} from "@/lib/types/contentSpec";
import { InternalLinkingFields, interlinkingRulesFromFields } from "@/components/InternalLinkingFields";
import { DEFAULT_INTERLINKING_RULES } from "@/lib/types/topicBrief";
import { CtaButton } from "@/components/ui/CtaButton";
import { NumberInput } from "@/components/ui/NumberInput";

interface TopicBriefPanelProps {
    topic: TopicOption;
    primaryKeyword?: string;
    onConfirm: (brief: TopicBrief) => void;
    onBack: () => void;
}

function isStrategyDirectoryTopic(topic: TopicOption): boolean {
    return Boolean(topic.directoryId || (topic.h2Titles && topic.h2Titles.length > 0));
}

const lockedFieldClass =
    "w-full rounded-xl border border-neutral-800/80 bg-neutral-950/60 px-4 py-2.5 text-sm text-neutral-400 cursor-not-allowed";

function LockedTextField({ value, placeholder }: { value: string; placeholder?: string }) {
    return (
        <input
            type="text"
            readOnly
            disabled
            value={value}
            placeholder={placeholder}
            className={lockedFieldClass}
            aria-readonly
        />
    );
}

export function TopicBriefPanel({ topic, primaryKeyword, onConfirm, onBack }: TopicBriefPanelProps) {
    const fromStrategy = isStrategyDirectoryTopic(topic);
    const [userNotes, setUserNotes] = useState("");
    const [files, setFiles] = useState<SupplementaryFile[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [fileError, setFileError] = useState<string | null>(null);
    const [isProcessingFiles, setIsProcessingFiles] = useState(false);
    const [showStructure, setShowStructure] = useState(true);
    const [wordCount, setWordCount] = useState("");
    const [h1Title, setH1Title] = useState(topic.title || "");
    const [h2Count, setH2Count] = useState(
        topic.h2Titles?.length ? String(topic.h2Titles.length) : "",
    );
    const [h2TitlesText, setH2TitlesText] = useState((topic.h2Titles ?? []).join("\n"));
    const [h3TitlesText, setH3TitlesText] = useState((topic.h3Titles ?? []).join("\n"));
    const [secondaryKeywordsText, setSecondaryKeywordsText] = useState((topic.secondaryKeywords ?? []).join("\n"));
    const [tertiaryKeywordsText, setTertiaryKeywordsText] = useState((topic.tertiaryKeywords ?? []).join("\n"));
    const domainKeyword = primaryKeyword?.trim() || "";
    const topicPrimaryKeyword = topic.primaryKeyword?.trim() || primaryKeyword?.trim() || "";
    const [h1PrimaryKeyword, setH1PrimaryKeyword] = useState(topicPrimaryKeyword);
    const [h3PerH2, setH3PerH2] = useState("");
    const [structureError, setStructureError] = useState<string | null>(null);
    const [showLinking, setShowLinking] = useState(false);
    const [showSupplementary, setShowSupplementary] = useState(false);
    const [linkInstructions, setLinkInstructions] = useState("");
    const [minLinks, setMinLinks] = useState(String(DEFAULT_INTERLINKING_RULES.minLinks ?? ""));
    const [maxLinks, setMaxLinks] = useState(String(DEFAULT_INTERLINKING_RULES.maxLinks ?? ""));
    const inputRef = useRef<HTMLInputElement>(null);

    const addFiles = async (fileList: FileList | File[]) => {
        const incoming = Array.from(fileList);
        if (incoming.length === 0) return;

        setFileError(null);
        setIsProcessingFiles(true);
        const added: SupplementaryFile[] = [];
        const errors: string[] = [];

        for (const file of incoming) {
            if (!isBriefFileSupported(file)) {
                errors.push(`${file.name}: use .txt, .md, .csv, or .json`);
                continue;
            }
            if (files.some((f) => f.name === file.name)) {
                errors.push(`${file.name} is already attached`);
                continue;
            }
            try {
                const content = await extractBriefFileText(file);
                added.push({ name: file.name, type: file.type || "text/plain", content });
            } catch (e) {
                errors.push(e instanceof Error ? e.message : `Could not read ${file.name}`);
            }
        }

        if (added.length > 0) {
            setFiles((prev) => [...prev, ...added].slice(0, 8));
        }
        if (errors.length > 0) setFileError(errors.join(" · "));
        setIsProcessingFiles(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        void addFiles(e.dataTransfer.files);
    };

    const handleConfirm = () => {
        setStructureError(null);

        if (!h1PrimaryKeyword.trim()) {
            setStructureError("Primary keyword is required for every blog.");
            return;
        }
        if (!h1Title.trim()) {
            setStructureError("H1 title is required for every blog.");
            return;
        }

        const h2Titles = h2TitlesText
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);
        const h3Titles = h3TitlesText
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);
        const secondaryKeywords = parseKeywordList(secondaryKeywordsText);
        const tertiaryKeywords = parseKeywordList(tertiaryKeywordsText);
        const hasH2 = h2Titles.length > 0 || Boolean(h2Count);

        const contentConstraints = normalizeContentConstraints({
            wordCount: wordCount ? Number(wordCount) : undefined,
            h1Title: h1Title.trim(),
            h1PrimaryKeyword: h1PrimaryKeyword.trim(),
            h2Count: h2Titles.length === 0 && h2Count ? Number(h2Count) : undefined,
            h2Titles: h2Titles.length > 0 ? h2Titles : undefined,
            h3Titles: h3Titles.length > 0 ? h3Titles : undefined,
            h3PerH2: h3Titles.length === 0 && h3PerH2.trim() ? Number(h3PerH2) : undefined,
            secondaryKeywords: secondaryKeywords.length > 0 ? secondaryKeywords : undefined,
            tertiaryKeywords: tertiaryKeywords.length > 0 ? tertiaryKeywords : undefined,
            domainPrimaryKeyword: domainKeyword || undefined,
        });

        onConfirm({
            userNotes: userNotes.trim(),
            supplementaryFiles: files,
            contentConstraints,
            interlinkingRules: normalizeInterlinkingRules(
                interlinkingRulesFromFields(linkInstructions, minLinks, maxLinks),
            ),
        });
    };

    const hasBrief = userNotes.trim().length > 0 || files.length > 0;

    return (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 shadow-xl animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8 border-b border-neutral-800 pb-6">
                <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-900/30 text-emerald-500 border border-emerald-800/50">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white uppercase tracking-tighter">Your Angle &amp; Data</h2>
                        <p className="text-xs text-neutral-400 font-medium max-w-md mt-1">
                            {fromStrategy
                                ? "Keywords and outline are already set in your content directory. Add optional notes, length, files, and link rules here."
                                : "Optional — your angle, reference files, SEO structure, and internal link targets. The writer drafts first; optimization adds on-site links using your rules below."}
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onBack}
                    className="text-[10px] font-black text-neutral-500 hover:text-white uppercase tracking-widest shrink-0"
                >
                    ← Change topic
                </button>
            </div>

            <div className="mb-6 rounded-2xl border border-neutral-800 bg-neutral-950/50 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Selected topic</p>
                <h3 className="text-sm font-bold text-white leading-snug">{topic.title}</h3>
                <p className="mt-1 text-xs text-neutral-400 line-clamp-2">{topic.description}</p>
                {fromStrategy && (
                    <p className="mt-3 text-[11px] text-neutral-500">
                        Edit keywords or outline via the pencil on the topic card before this step.
                    </p>
                )}
            </div>

            {!fromStrategy && (
                <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03] p-4 space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500/90">
                        Required for this blog
                    </p>
                    {structureError && (
                        <p className="text-xs text-red-400/90">{structureError}</p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">
                                Primary keyword
                                <span className="ml-1.5 font-bold normal-case tracking-normal text-emerald-600/90">
                                    (required)
                                </span>
                            </label>
                            <input
                                type="text"
                                value={h1PrimaryKeyword}
                                onChange={(e) => setH1PrimaryKeyword(e.target.value)}
                                placeholder="e.g. online vs on-campus degrees"
                                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">
                                H1
                                <span className="ml-1.5 font-bold normal-case tracking-normal text-emerald-600/90">
                                    (required)
                                </span>
                            </label>
                            <input
                                type="text"
                                value={h1Title}
                                onChange={(e) => setH1Title(e.target.value)}
                                placeholder="Exact H1 / page title"
                                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                    </div>
                </div>
            )}

            {fromStrategy ? (
                <div className="mb-6 rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4 space-y-3">
                    {structureError && <p className="text-xs text-red-400/90">{structureError}</p>}
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">
                            Target word count
                            <span className="ml-1.5 font-bold normal-case tracking-normal text-neutral-600">
                                (optional)
                            </span>
                        </label>
                        <NumberInput
                            min={200}
                            max={15000}
                            value={wordCount}
                            onChange={setWordCount}
                            placeholder="e.g. 1800"
                        />
                    </div>
                </div>
            ) : (
                <div className="mb-6 rounded-2xl border border-neutral-800 bg-neutral-950/40 overflow-hidden">
                    <button
                        type="button"
                        onClick={() => setShowStructure((v) => !v)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-neutral-900/50 transition-colors"
                    >
                        <span className="text-sm font-medium text-neutral-300">Optional structure &amp; keywords</span>
                        <span className="text-xs text-neutral-500">{showStructure ? "Hide" : "Show"}</span>
                    </button>
                    {showStructure && (
                        <div className="px-4 pb-4 pt-1 border-t border-neutral-800 space-y-4">
                            <p className="text-[11px] text-neutral-500 leading-relaxed">
                                H2s, secondary keywords, H3s, and tertiary keywords are optional hints. The content
                                writer finalizes keywords and density targets in{" "}
                                <strong className="text-neutral-400">keywordPlan</strong>; the optimizer measures
                                actual density across the full article.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">
                                        Target word count
                                    </label>
                                    <NumberInput
                                        min={200}
                                        max={15000}
                                        value={wordCount}
                                        onChange={setWordCount}
                                        placeholder="e.g. 1800"
                                    />
                                </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">
                                            Domain primary keyword
                                            <span className="ml-1.5 font-bold normal-case tracking-normal text-neutral-600">
                                                (from strategy)
                                            </span>
                                        </label>
                                        <LockedTextField
                                            value={domainKeyword}
                                            placeholder="Save keyword strategy first"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">
                                            Number of H2 sections
                                        </label>
                                        <NumberInput
                                            min={1}
                                            max={12}
                                            value={h2Count}
                                            onChange={setH2Count}
                                            placeholder="e.g. 6"
                                            disabled={h2TitlesText.trim().length > 0}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">
                                            H3 subheadings per H2
                                            <span className="ml-1.5 font-bold normal-case tracking-normal text-neutral-600">
                                                (optional)
                                            </span>
                                        </label>
                                        <NumberInput
                                            min={1}
                                            max={8}
                                            value={h3PerH2}
                                            onChange={setH3PerH2}
                                            placeholder={String(DEFAULT_H3_PER_H2)}
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">
                                            H2 headings
                                        </label>
                                        <textarea
                                            value={h2TitlesText}
                                            onChange={(e) => setH2TitlesText(e.target.value)}
                                            placeholder={"What is an online MBA?\nFees and ROI\nTop universities in India"}
                                            rows={4}
                                            className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 resize-y"
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">
                                            Secondary keywords
                                        </label>
                                        <textarea
                                            value={secondaryKeywordsText}
                                            onChange={(e) => setSecondaryKeywordsText(e.target.value)}
                                            rows={3}
                                            className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 resize-y"
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">
                                            H3 headings
                                        </label>
                                        <textarea
                                            value={h3TitlesText}
                                            onChange={(e) => setH3TitlesText(e.target.value)}
                                            rows={3}
                                            className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 resize-y"
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">
                                            Tertiary keywords
                                        </label>
                                        <textarea
                                            value={tertiaryKeywordsText}
                                            onChange={(e) => setTertiaryKeywordsText(e.target.value)}
                                            rows={3}
                                            className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 resize-y"
                                        />
                                    </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="mb-6 rounded-2xl border border-neutral-800 bg-neutral-950/40 overflow-hidden">
                <button
                    type="button"
                    onClick={() => setShowLinking((v) => !v)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-neutral-900/50 transition-colors"
                >
                    <span className="text-sm font-medium text-neutral-300">
                        Internal linking (optional)
                    </span>
                    <span className="text-xs text-neutral-500">
                        {showLinking ? "Hide" : "Show"}
                    </span>
                </button>
                {showLinking && (
                    <div className="px-4 pb-4 pt-1 border-t border-neutral-800">
                        <InternalLinkingFields
                            instructions={linkInstructions}
                            minLinks={minLinks}
                            maxLinks={maxLinks}
                            onInstructionsChange={setLinkInstructions}
                            onMinLinksChange={setMinLinks}
                            onMaxLinksChange={setMaxLinks}
                        />
                    </div>
                )}
            </div>

            <label className="block text-sm font-medium text-neutral-400 mb-3">
                Your thoughts and direction (optional)
            </label>
            <textarea
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                placeholder="e.g. Compare NMIMS vs Amity on fees and placements; mention our 2026 cohort stats; tone should be authoritative not salesy…"
                rows={5}
                className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-y min-h-[120px] mb-6"
            />

            <div className="mb-6 rounded-2xl border border-neutral-800 bg-neutral-950/40 overflow-hidden">
                <button
                    type="button"
                    onClick={() => setShowSupplementary((v) => !v)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-neutral-900/50 transition-colors"
                >
                    <span className="text-sm font-medium text-neutral-300">
                        Supplementary data (optional)
                    </span>
                    <span className="text-xs text-neutral-500">
                        {showSupplementary ? "Hide" : "Show"}
                    </span>
                </button>
                {showSupplementary && (
                    <div className="px-4 pb-4 pt-1 border-t border-neutral-800">
            <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`mb-4 cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all ${isDragging
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-neutral-700 bg-neutral-950/50 hover:border-neutral-600 hover:bg-neutral-900/30"
                    }`}
            >
                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    accept=".txt,.md,.csv,.json,.html,.xml,.tsv,text/plain,text/markdown,text/csv,application/json"
                    className="hidden"
                    onChange={(e) => {
                        if (e.target.files) void addFiles(e.target.files);
                        e.target.value = "";
                    }}
                />
                <svg className="w-8 h-8 mx-auto text-neutral-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm font-medium text-neutral-300">
                    {isProcessingFiles ? "Reading files…" : "Drop files here or click to upload"}
                </p>
                <p className="text-xs text-neutral-500 mt-1">.txt, .md, .csv, .json — up to 8 files, 500KB each</p>
            </div>

            {fileError && (
                <p className="text-xs text-red-400/90 mb-4">{fileError}</p>
            )}

            {files.length > 0 && (
                <ul className="space-y-2 mb-4">
                    {files.map((f, i) => (
                        <li
                            key={`${f.name}-${i}`}
                            className="flex items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-2.5"
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <svg className="w-4 h-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="text-xs font-medium text-neutral-200 truncate">{f.name}</span>
                                <span className="text-[10px] text-neutral-500 shrink-0">
                                    {(f.content.length / 1024).toFixed(1)}KB text
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setFiles((prev) => prev.filter((_, idx) => idx !== i));
                                }}
                                className="text-neutral-500 hover:text-red-400 p-1"
                                aria-label={`Remove ${f.name}`}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
                    </div>
                )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-neutral-800">
                <CtaButton
                    type="button"
                    onClick={handleConfirm}
                    loading={isProcessingFiles}
                    loadingLabel="Processing files…"
                    className="flex-1 rounded-2xl px-8 py-5 text-sm shadow-2xl shadow-emerald-900/40"
                    trailingIcon={
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    }
                >
                    {hasBrief ? "Start writing with my brief" : "Start writing"}
                </CtaButton>
            </div>
        </div>
    );
}
