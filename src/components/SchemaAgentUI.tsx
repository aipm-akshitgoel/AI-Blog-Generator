import { useState, useEffect } from "react";
import type { OptimizedContent } from "@/lib/types/optimization";
import type { BusinessContext } from "@/lib/types/businessContext";
import type { MetaOption } from "@/lib/types/meta";
import type { SchemaData } from "@/lib/types/schema";

interface SchemaAgentProps {
    optimizedContent: OptimizedContent;
    businessContext: BusinessContext;
    meta: MetaOption;
    onComplete: (schema: SchemaData) => void;
}

export function SchemaAgentUI({ optimizedContent, businessContext, meta, onComplete }: SchemaAgentProps) {
    const [schemaData, setSchemaData] = useState<SchemaData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSchema = async () => {
            setLoading(true);
            try {
                const res = await fetch("/api/schema-gen", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ optimizedContent, businessContext, meta }),
                });

                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.error || "Failed to generate Schema JSON-LD.");
                }

                const data = await res.json();
                setSchemaData(data.schemaData);
            } catch (err) {
                setError(err instanceof Error ? err.message : "An error occurred.");
            } finally {
                setLoading(false);
            }
        };

        fetchSchema();
    }, [optimizedContent, businessContext, meta]);

    if (loading) {
        return (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-8 shadow-xl text-center">
                <div className="mb-6 inline-flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-fuchsia-900/20 text-fuchsia-500">
                    <svg className="w-8 h-8 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                </div>
                <h3 className="text-lg font-medium text-neutral-200">Structuring Data for Search Engines...</h3>
                <p className="mt-2 text-sm text-neutral-500">Generating JSON-LD schema (Article, LocalBusiness, FAQ).</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-6 text-center shadow-xl">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-900/30 text-red-500">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h3 className="text-lg font-medium text-neutral-100 mb-2">Generation Failed</h3>
                <p className="text-red-400 text-sm mb-4">{error}</p>
                <div className="inline-block rounded-lg bg-neutral-900 border border-neutral-800 p-3">
                    <p className="text-neutral-300 text-sm font-medium">✨ Nudge: If this is an API rate limit issue, please wait 1 minute and try again.</p>
                </div>
            </div>
        );
    }

    if (!schemaData) return null;

    return (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 shadow-xl animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-neutral-800 pb-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-fuchsia-900/30 text-fuchsia-400 border border-fuchsia-800/50">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                            <path fillRule="evenodd" d="M14.447 3.026a.75.75 0 01.527.921l-4.5 16.5a.75.75 0 01-1.448-.394l4.5-16.5a.75.75 0 01.921-.527zM16.72 6.22a.75.75 0 011.06 0l5.25 5.25a.75.75 0 010 1.06l-5.25 5.25a.75.75 0 11-1.06-1.06L21.44 12l-4.72-4.72a.75.75 0 010-1.06zm-9.44 0a.75.75 0 010 1.06L2.56 12l4.72 4.72a.75.75 0 01-1.06 1.06L.97 12.53a.75.75 0 010-1.06l5.25-5.25a.75.75 0 011.06 0z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-neutral-100">Schema & Technical SEO</h2>
                        <p className="text-xs text-neutral-400">JSON-LD structured data for rich snippets</p>
                    </div>
                </div>

                {schemaData.validationStatus === 'valid' && (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-900 text-emerald-400 text-xs font-medium">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                        </svg>
                        Valid JSON-LD
                    </div>
                )}
            </div>

            <div className="relative rounded-lg bg-[#0d1117] border border-neutral-800 p-4 overflow-hidden mb-6">
                <div className="absolute top-0 right-0 p-2 opacity-50 select-none">
                    <span className="text-xs font-mono text-neutral-500 uppercase">{schemaData.type}</span>
                </div>
                <pre className="text-xs text-neutral-300 font-mono overflow-auto max-h-[400px]">
                    <code>
                        {/* We parse and re-stringify to ensure pretty printing just in case */}
                        {JSON.stringify(JSON.parse(schemaData.jsonLd), null, 2)}
                    </code>
                </pre>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
                <button
                    onClick={() => onComplete(schemaData)}
                    className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white transition-colors hover:bg-indigo-500 shadow-lg shadow-indigo-900/20"
                >
                    Deploy Article & Schema
                </button>
            </div>
        </div>
    );
}
