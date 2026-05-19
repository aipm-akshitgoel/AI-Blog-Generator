"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { FactSource } from "@/lib/types/factSource";
import { faviconUrl } from "@/lib/referenceCatalog";

const PANEL_WIDTH = 288;
const VIEWPORT_PAD = 12;

interface FactCitationChipProps {
    index: number;
    source: FactSource;
    onRemove?: () => void;
}

function clampPopoverPosition(anchor: DOMRect): { top: number; left: number; placement: "above" | "below" } {
    const centerX = anchor.left + anchor.width / 2;
    let left = centerX - PANEL_WIDTH / 2;
    left = Math.max(VIEWPORT_PAD, Math.min(left, window.innerWidth - PANEL_WIDTH - VIEWPORT_PAD));

    const estimatedHeight = 220;
    const spaceAbove = anchor.top - VIEWPORT_PAD;
    const spaceBelow = window.innerHeight - anchor.bottom - VIEWPORT_PAD;

    if (spaceAbove >= estimatedHeight || spaceAbove >= spaceBelow) {
        return {
            top: Math.max(VIEWPORT_PAD, anchor.top - 8),
            left,
            placement: "above",
        };
    }

    return {
        top: Math.min(window.innerHeight - VIEWPORT_PAD, anchor.bottom + 8),
        left,
        placement: "below",
    };
}

export function FactCitationChip({ index, source, onRemove }: FactCitationChipProps) {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState<{ top: number; left: number; placement: "above" | "below" } | null>(
        null,
    );
    const rootRef = useRef<HTMLSpanElement>(null);
    const href = source.url?.trim();
    const icon = href ? faviconUrl(href, 32) : "";

    useLayoutEffect(() => {
        if (!open || !rootRef.current) {
            setPos(null);
            return;
        }

        const update = () => {
            if (!rootRef.current) return;
            setPos(clampPopoverPosition(rootRef.current.getBoundingClientRect()));
        };

        update();
        window.addEventListener("resize", update);
        window.addEventListener("scroll", update, true);
        return () => {
            window.removeEventListener("resize", update);
            window.removeEventListener("scroll", update, true);
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onDoc = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
                const panel = document.getElementById(`fact-citation-panel-${source.id}`);
                if (panel?.contains(e.target as Node)) return;
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, [open, source.id]);

    const panel =
        open && pos ? (
            <div
                id={`fact-citation-panel-${source.id}`}
                role="dialog"
                className="fixed z-[200] rounded-xl border border-neutral-600 bg-neutral-900 p-3 text-left shadow-2xl shadow-black/60"
                style={{
                    width: PANEL_WIDTH,
                    left: pos.left,
                    top: pos.top,
                    transform: pos.placement === "above" ? "translateY(-100%)" : "none",
                }}
            >
                <div className="flex items-center gap-2 mb-2">
                    {icon ? (
                        <img
                            src={icon}
                            alt=""
                            width={24}
                            height={24}
                            className="h-6 w-6 rounded-md bg-white shrink-0"
                        />
                    ) : (
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-600 text-[10px] font-black text-white">
                            {index}
                        </span>
                    )}
                    <span className="text-sm font-bold text-white leading-tight">{source.source}</span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-snug line-clamp-4 mb-2">
                    &ldquo;{source.excerpt}&rdquo;
                </p>
                {href ? (
                    <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/40 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-600/30"
                    >
                        {icon && (
                            <img src={icon} alt="" width={14} height={14} className="rounded-sm" />
                        )}
                        {(() => {
                            try {
                                return new URL(href).hostname.replace(/^www\./i, "");
                            } catch {
                                return "Open source";
                            }
                        })()}
                        <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                    </a>
                ) : (
                    <span className="text-[10px] text-amber-400">
                        Missing source URL — regenerate draft with reference links in your brief.
                    </span>
                )}
                {onRemove && (
                    <button
                        type="button"
                        onClick={() => {
                            onRemove();
                            setOpen(false);
                        }}
                        className="mt-2 block text-[10px] font-bold text-neutral-500 hover:text-red-400"
                    >
                        Remove citation
                    </button>
                )}
            </div>
        ) : null;

    return (
        <>
            <span ref={rootRef} className="relative inline-flex align-super mx-0.5 -translate-y-px">
                <button
                    type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                        e.stopPropagation();
                        setOpen((v) => !v);
                    }}
                    className={`inline-flex h-[20px] items-center gap-0.5 rounded-full pl-0.5 pr-1.5 text-[11px] font-black leading-none transition-all shadow-md ${
                        open
                            ? "bg-emerald-400 text-neutral-950 ring-2 ring-emerald-300/80"
                            : "bg-emerald-500 text-white ring-1 ring-white/20 hover:bg-emerald-400"
                    }`}
                    aria-expanded={open}
                    aria-label={`Source ${index}: ${source.source}`}
                >
                    {icon ? (
                        <img
                            src={icon}
                            alt=""
                            width={16}
                            height={16}
                            className="h-4 w-4 rounded-full bg-white/90 shrink-0"
                        />
                    ) : (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[9px]">
                            {index}
                        </span>
                    )}
                    <span className="min-w-[0.65rem] text-center">{index}</span>
                </button>
            </span>
            {typeof document !== "undefined" && panel ? createPortal(panel, document.body) : null}
        </>
    );
}
