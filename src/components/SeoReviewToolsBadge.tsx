/** Attribution for readability scores verified via SEO Review Tools. */

import Image from "next/image";
import { formatReadabilityGradeNumber } from "@/lib/seoReviewToolsReadability";

const DOCS_URL =
    "https://api.seoreviewtools.com/documentation/readability-score-api-content/";

const LOGO_SRC = "/assets/logos/seo-review-tools.ico";

export function SeoReviewToolsLogo({
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

export function SeoReviewToolsBadge({
    className = "",
    size = "sm",
    variant = "dark",
    logoOnly = false,
}: {
    className?: string;
    size?: "sm" | "md";
    variant?: "dark" | "light";
    /** Show only the provider logo (for inline metric rows). */
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
                title="Verified with SEO Review Tools"
            >
                <SeoReviewToolsLogo size={logoSize} />
            </a>
        );
    }

    return (
        <a
            href={DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-colors ${shell} ${className}`}
            title="Readability verified with SEO Review Tools Flesch-Kincaid API"
        >
            <SeoReviewToolsLogo size={logoSize} />
            <span className={`${textClass} font-bold uppercase tracking-wide`}>
                SEO Review Tools
            </span>
        </a>
    );
}

export function ReadabilityGradeBadge({
    gradeLabel,
    gradeLevel,
    targetMet,
    fleschScore,
    className = "",
    variant = "dark",
}: {
    gradeLabel: string;
    gradeLevel: number;
    targetMet?: boolean;
    fleschScore?: number;
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

    const gradeDisplay = formatReadabilityGradeNumber({ gradeLevel, gradeLabel });

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold ${tone} ${className}`}
        >
            {gradeDisplay}
            {typeof fleschScore === "number" && fleschScore > 0 ? (
                <span className="font-normal opacity-70">· Flesch {fleschScore}</span>
            ) : null}
        </span>
    );
}
