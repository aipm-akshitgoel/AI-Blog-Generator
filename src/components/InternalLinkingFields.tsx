"use client";

import type { InterlinkingRules } from "@/lib/types/contentSpec";
import { NumberInput } from "@/components/ui/NumberInput";

interface InternalLinkingFieldsProps {
    instructions: string;
    minLinks: string;
    maxLinks: string;
    onInstructionsChange: (v: string) => void;
    onMinLinksChange: (v: string) => void;
    onMaxLinksChange: (v: string) => void;
    compact?: boolean;
}

export function InternalLinkingFields({
    instructions,
    minLinks,
    maxLinks,
    onInstructionsChange,
    onMinLinksChange,
    onMaxLinksChange,
    compact = false,
}: InternalLinkingFieldsProps) {
    return (
        <div className="space-y-4">
            <p className="text-[11px] text-neutral-500 leading-relaxed">
                On-site links only (your pages and blog posts). Applied when the draft is optimized — not shown as citations on the live post.
            </p>
            <label className="block text-xs font-medium text-neutral-500 mb-2">
                Internal linking instructions
            </label>
            <textarea
                value={instructions}
                onChange={(e) => onInstructionsChange(e.target.value)}
                placeholder="e.g. Link /services and /pricing; include 2 related blog posts; descriptive anchor text; no links in H2 headings…"
                rows={compact ? 3 : 4}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 resize-y"
            />
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">
                        Min internal links
                    </label>
                    <NumberInput
                        min={0}
                        max={20}
                        value={minLinks}
                        onChange={onMinLinksChange}
                        placeholder="e.g. 4"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-neutral-500 mb-2">
                        Max internal links
                    </label>
                    <NumberInput
                        min={0}
                        max={20}
                        value={maxLinks}
                        onChange={onMaxLinksChange}
                        placeholder="e.g. 6"
                    />
                </div>
            </div>
        </div>
    );
}

export function interlinkingRulesFromFields(
    instructions: string,
    minLinks: string,
    maxLinks: string,
): InterlinkingRules {
    return {
        instructions: instructions.trim(),
        minLinks: minLinks ? Number(minLinks) : undefined,
        maxLinks: maxLinks ? Number(maxLinks) : undefined,
    };
}
