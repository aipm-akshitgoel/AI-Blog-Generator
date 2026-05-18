"use client";

import { useState, useRef } from "react";
import type { TopicOption } from "@/lib/types/strategy";
import type { TopicBrief, SupplementaryFile } from "@/lib/types/topicBrief";
import { extractBriefFileText, isBriefFileSupported } from "@/lib/extractBriefFileText";

interface TopicBriefPanelProps {
    topic: TopicOption;
    onConfirm: (brief: TopicBrief) => void;
    onBack: () => void;
}

export function TopicBriefPanel({ topic, onConfirm, onBack }: TopicBriefPanelProps) {
    const [userNotes, setUserNotes] = useState("");
    const [files, setFiles] = useState<SupplementaryFile[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [fileError, setFileError] = useState<string | null>(null);
    const [isProcessingFiles, setIsProcessingFiles] = useState(false);
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
        onConfirm({
            userNotes: userNotes.trim(),
            supplementaryFiles: files,
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
                            Optional — add your take, stats, or reference files. The writing agent will weave these in before drafting.
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

            <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-500/80 mb-1">Selected topic</p>
                <h3 className="text-sm font-black uppercase tracking-tight text-amber-400">{topic.title}</h3>
                <p className="mt-1 text-xs text-neutral-400 line-clamp-2">{topic.description}</p>
            </div>

            <label className="block text-sm font-bold text-neutral-400 uppercase tracking-widest mb-3">
                Your thoughts &amp; direction
            </label>
            <textarea
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                placeholder="e.g. Compare NMIMS vs Amity on fees and placements; mention our 2026 cohort stats; tone should be authoritative not salesy…"
                rows={5}
                className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-y min-h-[120px] mb-6"
            />

            <label className="block text-sm font-bold text-neutral-400 uppercase tracking-widest mb-3">
                Supplementary data
            </label>
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
                <p className="text-xs text-amber-400/90 mb-4">{fileError}</p>
            )}

            {files.length > 0 && (
                <ul className="space-y-2 mb-6">
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

            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-neutral-800">
                <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={isProcessingFiles}
                    className="flex-1 flex items-center justify-center gap-3 rounded-2xl bg-emerald-600 px-8 py-5 text-sm font-black text-white transition-all hover:bg-emerald-500 shadow-2xl shadow-emerald-900/40 active:scale-[0.98] uppercase tracking-widest disabled:opacity-50"
                >
                    {hasBrief ? "Start writing with my brief" : "Start writing"}
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                </button>
                <button
                    type="button"
                    onClick={() => onConfirm({ userNotes: "", supplementaryFiles: [] })}
                    disabled={isProcessingFiles}
                    className="sm:w-auto w-full flex items-center justify-center rounded-2xl border border-neutral-700 bg-neutral-900 px-8 py-5 text-sm font-black text-neutral-300 transition-all hover:border-neutral-500 hover:text-white hover:bg-neutral-800 active:scale-[0.98] uppercase tracking-widest disabled:opacity-50"
                >
                    Skip
                </button>
            </div>
        </div>
    );
}
