"use client";

import { useState } from "react";

interface RawPayloadViewerProps {
    payload: any;
}

export function RawPayloadViewer({ payload }: RawPayloadViewerProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="mt-12 bg-neutral-900/40 rounded-xl border border-neutral-800 overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-neutral-800/50 transition-colors"
            >
                <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Technical Data</h2>
                    <p className="text-sm text-neutral-500 mt-1">Raw JSON payload for debugging and verification</p>
                </div>
                <div className={`transform transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
                    <svg className="w-5 h-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {isOpen && (
                <div className="p-6 pt-0 border-t border-neutral-800 animate-in slide-in-from-top-2 duration-200">
                    <pre className="text-[10px] md:text-xs text-emerald-400/80 overflow-x-auto p-4 bg-black/50 rounded-lg max-h-[500px] font-mono whitespace-pre-wrap">
                        {JSON.stringify(payload, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}
