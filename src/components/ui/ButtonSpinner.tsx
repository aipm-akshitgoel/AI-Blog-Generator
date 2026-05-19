"use client";

type ButtonSpinnerProps = {
    /** Pixel size (width & height). */
    size?: number;
    className?: string;
};

/** Thin arc spinner — matches Clerk / Google OAuth button loading style. */
export function ButtonSpinner({ size = 18, className = "" }: ButtonSpinnerProps) {
    return (
        <svg
            className={`animate-spin shrink-0 ${className}`.trim()}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
        >
            <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="32 20"
            />
        </svg>
    );
}
