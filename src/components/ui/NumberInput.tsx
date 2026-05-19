"use client";

import { useId, type InputHTMLAttributes } from "react";

type NumberInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> & {
    value: string;
    onChange: (value: string) => void;
};

function parseNum(value: string): number | null {
    const n = Number(value);
    return value.trim() === "" || Number.isNaN(n) ? null : n;
}

function clamp(n: number, min?: number, max?: number): number {
    if (min != null && n < min) return min;
    if (max != null && n > max) return max;
    return n;
}

export function NumberInput({
    value,
    onChange,
    min,
    max,
    step = 1,
    disabled,
    className = "",
    id: idProp,
    ...props
}: NumberInputProps) {
    const autoId = useId();
    const id = idProp ?? autoId;
    const stepNum = typeof step === "number" ? step : Number(step) || 1;

    const bump = (direction: 1 | -1) => {
        if (disabled) return;
        const current = parseNum(value);
        const floor = min != null ? Number(min) : undefined;
        const ceiling = max != null ? Number(max) : undefined;

        if (current == null) {
            const seed = direction === 1 ? (floor ?? stepNum) : (ceiling ?? floor ?? 0);
            onChange(String(seed));
            return;
        }

        const next = clamp(current + direction * stepNum, floor, ceiling);
        const decimals = String(stepNum).includes(".") ? String(stepNum).split(".")[1]?.length ?? 0 : 0;
        onChange(decimals > 0 ? next.toFixed(decimals) : String(next));
    };

    return (
        <div className="relative">
            <input
                {...props}
                id={id}
                type="number"
                value={value}
                disabled={disabled}
                min={min}
                max={max}
                step={step}
                onChange={(e) => onChange(e.target.value)}
                className={[
                    "no-number-spinner w-full rounded-xl border border-neutral-800 bg-neutral-950 py-2.5 pl-4 pr-9 text-sm text-white placeholder:text-neutral-600",
                    "focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30",
                    "disabled:opacity-40",
                    className,
                ]
                    .filter(Boolean)
                    .join(" ")}
            />
            <div
                className={`absolute right-2 top-1/2 flex -translate-y-1/2 flex-col gap-0.5 ${disabled ? "pointer-events-none opacity-30" : ""}`}
            >
                <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => bump(1)}
                    className="flex h-3.5 w-4 items-center justify-center text-emerald-500 transition-colors hover:text-emerald-400"
                    aria-label="Increase"
                >
                    <svg className="h-2.5 w-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 8l4-4 4 4" />
                    </svg>
                </button>
                <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => bump(-1)}
                    className="flex h-3.5 w-4 items-center justify-center text-emerald-500 transition-colors hover:text-emerald-400"
                    aria-label="Decrease"
                >
                    <svg className="h-2.5 w-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 4l4 4 4-4" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
