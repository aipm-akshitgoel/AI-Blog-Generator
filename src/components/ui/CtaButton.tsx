"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ButtonSpinner } from "@/components/ui/ButtonSpinner";

type CtaButtonVariant = "primary" | "amber" | "blue" | "secondary" | "ghost";

const variantClass: Record<CtaButtonVariant, string> = {
    primary:
        "bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-900/25 border border-transparent",
    amber: "bg-amber-500 text-neutral-900 hover:bg-amber-400 shadow-lg shadow-amber-900/30 border border-transparent",
    blue: "bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/25 border border-transparent",
    secondary:
        "bg-neutral-800 text-white hover:bg-neutral-700 border border-neutral-700 shadow-sm",
    ghost:
        "bg-transparent text-neutral-400 hover:text-white hover:bg-neutral-800/50 border border-neutral-700",
};

export type CtaButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    loading?: boolean;
    /** Shown next to spinner while loading; defaults to `children`. */
    loadingLabel?: ReactNode;
    variant?: CtaButtonVariant;
    /** Icon after label (hidden while loading). */
    trailingIcon?: ReactNode;
};

export function CtaButton({
    loading = false,
    loadingLabel,
    variant = "primary",
    trailingIcon,
    children,
    disabled,
    className = "",
    type = "button",
    ...props
}: CtaButtonProps) {
    const isDisabled = disabled || loading;
    const label = loading && loadingLabel != null ? loadingLabel : children;

    return (
        <button
            type={type}
            disabled={isDisabled}
            className={[
                "inline-flex items-center justify-center gap-2.5 font-black uppercase tracking-widest transition-all",
                "disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]",
                variantClass[variant],
                className,
            ]
                .filter(Boolean)
                .join(" ")}
            {...props}
        >
            {loading && <ButtonSpinner size={18} />}
            <span>{label}</span>
            {!loading && trailingIcon}
        </button>
    );
}
