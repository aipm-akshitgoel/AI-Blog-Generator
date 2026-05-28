/** Attribution for AI detection verified via ZeroGPT. */

import Image from "next/image";

const DOCS_URL = "https://zerogpt.org/api";

const LOGO_SRC = "/assets/logos/zerogpt.ico";

export function ZeroGptLogo({
    size = 20,
    className = "",
}: {
    size?: number;
    className?: string;
}) {
    return (
        <Image
            src={LOGO_SRC}
            alt=""
            width={size}
            height={size}
            className={`shrink-0 rounded-sm object-contain ${className}`}
            aria-hidden
        />
    );
}

export function ZeroGptBadge({
    className = "",
    size = "sm",
    variant = "dark",
    logoOnly = false,
}: {
    className?: string;
    size?: "sm" | "md";
    variant?: "dark" | "light";
    logoOnly?: boolean;
}) {
    const textClass = size === "md" ? "text-xs" : "text-[10px]";
    const logoSize = size === "md" ? 22 : 18;
    const shell =
        variant === "light"
            ? "border-neutral-300 bg-white text-neutral-700 shadow-sm hover:border-neutral-400 hover:text-neutral-900"
            : "border-neutral-700/80 bg-neutral-900/60 text-neutral-400 hover:border-neutral-600 hover:text-neutral-300";

    if (logoOnly) {
        return (
            <a
                href={DOCS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex shrink-0 items-center rounded-md p-0.5 transition-opacity hover:opacity-80 ${className}`}
                title="Verified with ZeroGPT"
            >
                <ZeroGptLogo size={logoSize} />
            </a>
        );
    }

    return (
        <a
            href={DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-colors ${shell} ${className}`}
            title="AI detection verified with ZeroGPT"
        >
            <ZeroGptLogo size={logoSize} />
            <span className={`${textClass} font-bold uppercase tracking-wide`}>ZeroGPT</span>
        </a>
    );
}

export function AiDetectionBadge({
    aiPercent,
    targetMet,
    attempts,
    className = "",
    variant = "dark",
}: {
    aiPercent: number;
    targetMet?: boolean;
    attempts?: number;
    className?: string;
    variant?: "dark" | "light";
}) {
    const tone =
        variant === "light"
            ? targetMet
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : "border-amber-300 bg-amber-50 text-amber-900"
            : targetMet
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-amber-500/30 bg-amber-500/10 text-amber-300";

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold ${tone} ${className}`}
        >
            <span className="uppercase tracking-wider text-[10px] opacity-80">AI</span>
            {aiPercent}%
            {typeof attempts === "number" && attempts > 0 ? (
                <span className="font-normal opacity-70">· {attempts} humanize pass(es)</span>
            ) : null}
        </span>
    );
}
