"use client";

import { useState, useRef, useEffect } from "react";

interface HelpTipProps {
    text: string;
    side?: "top" | "bottom" | "left" | "right";
}

/**
 * A small contextual help icon that shows a plain-English tooltip on hover/focus.
 * Usage: <HelpTip text="The clickable headline in Google search results. Keep it under 60 characters." />
 */
export function HelpTip({ text, side = "top" }: HelpTipProps) {
    const [visible, setVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setVisible(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const posClass = {
        top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
        bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
        left: "right-full top-1/2 -translate-y-1/2 mr-2",
        right: "left-full top-1/2 -translate-y-1/2 ml-2",
    }[side];

    return (
        <div ref={ref} className="relative inline-flex items-center">
            <button
                type="button"
                onMouseEnter={() => setVisible(true)}
                onMouseLeave={() => setVisible(false)}
                onFocus={() => setVisible(true)}
                onBlur={() => setVisible(false)}
                onClick={() => setVisible(v => !v)}
                aria-label="Help"
                className="flex h-4 w-4 items-center justify-center rounded-full border border-neutral-600 bg-neutral-800 text-[9px] font-black text-neutral-400 hover:border-emerald-500 hover:text-emerald-400 transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500 select-none"
            >
                ?
            </button>

            {visible && (
                <div
                    role="tooltip"
                    className={`absolute z-50 w-60 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-xs text-neutral-300 shadow-xl shadow-black/40 leading-relaxed animate-in fade-in zoom-in-95 duration-150 ${posClass}`}
                >
                    {text}
                    {/* little arrow nub */}
                    {side === "top" && (
                        <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-neutral-700" />
                    )}
                    {side === "bottom" && (
                        <span className="absolute left-1/2 bottom-full -translate-x-1/2 border-4 border-transparent border-b-neutral-700" />
                    )}
                </div>
            )}
        </div>
    );
}
