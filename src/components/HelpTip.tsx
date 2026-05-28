"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface HelpTipProps {
    text: string;
    side?: "top" | "bottom" | "left" | "right";
    variant?: "dark" | "light";
}

const TOOLTIP_WIDTH_PX = 240;

type Placement = "top" | "bottom" | "left" | "right";

type TooltipPos = {
    top: number;
    left: number;
    placement: Placement;
    transform?: string;
};

/**
 * Contextual help icon. Tooltip renders in a portal so it is not clipped by overflow-hidden parents.
 */
export function HelpTip({ text, side = "top", variant = "dark" }: HelpTipProps) {
    const [visible, setVisible] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [pos, setPos] = useState<TooltipPos>({ top: 0, left: 0, placement: "top" });
    const triggerRef = useRef<HTMLButtonElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    useEffect(() => setMounted(true), []);

    const updatePosition = useCallback(() => {
        const el = triggerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const pad = 8;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        if (side === "left") {
            const left = Math.max(pad, rect.left - pad - TOOLTIP_WIDTH_PX);
            const top = Math.max(pad, Math.min(rect.top + rect.height / 2, vh - pad));
            setPos({ top, left, placement: "left", transform: "translateY(-50%)" });
            return;
        }

        if (side === "right") {
            let left = rect.right + pad;
            left = Math.min(left, vw - TOOLTIP_WIDTH_PX - pad);
            const top = Math.max(pad, Math.min(rect.top + rect.height / 2, vh - pad));
            setPos({ top, left, placement: "right", transform: "translateY(-50%)" });
            return;
        }

        let left = rect.left + rect.width / 2 - TOOLTIP_WIDTH_PX / 2;
        left = Math.max(pad, Math.min(left, vw - TOOLTIP_WIDTH_PX - pad));

        if (side === "bottom") {
            setPos({ top: rect.bottom + pad, left, placement: "bottom" });
        } else {
            setPos({ top: rect.top - pad, left, placement: "top", transform: "translateY(-100%)" });
        }
    }, [side]);

    const open = useCallback(() => {
        updatePosition();
        setVisible(true);
    }, [updatePosition]);

    const close = useCallback(() => setVisible(false), []);

    useLayoutEffect(() => {
        if (!visible) return;
        updatePosition();
        const onReposition = () => updatePosition();
        window.addEventListener("scroll", onReposition, true);
        window.addEventListener("resize", onReposition);
        return () => {
            window.removeEventListener("scroll", onReposition, true);
            window.removeEventListener("resize", onReposition);
        };
    }, [visible, updatePosition]);

    useEffect(() => {
        if (!visible) return;
        const onPointerDown = (e: PointerEvent) => {
            const target = e.target as Node;
            if (triggerRef.current?.contains(target)) return;
            if (tooltipRef.current?.contains(target)) return;
            close();
        };
        document.addEventListener("pointerdown", onPointerDown);
        return () => document.removeEventListener("pointerdown", onPointerDown);
    }, [visible, close]);

    const buttonClass =
        variant === "light"
            ? "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-white text-[9px] font-black text-neutral-500 transition-colors hover:border-emerald-500 hover:text-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 select-none"
            : "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-neutral-600 bg-neutral-800 text-[9px] font-black text-neutral-400 transition-colors hover:border-emerald-500 hover:text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 select-none";

    const tooltipClass =
        variant === "light"
            ? "fixed z-[200] rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-xs leading-relaxed text-neutral-700 shadow-lg shadow-black/10"
            : "fixed z-[200] rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-xs leading-relaxed text-neutral-300 shadow-xl shadow-black/40";

    const tooltip =
        visible && mounted
            ? createPortal(
                  <div
                      ref={tooltipRef}
                      role="tooltip"
                      id="helptip-tooltip"
                      style={{
                          top: pos.top,
                          left: pos.left,
                          width: TOOLTIP_WIDTH_PX,
                          transform: pos.transform,
                      }}
                      className={tooltipClass}
                      onMouseEnter={open}
                      onMouseLeave={close}
                  >
                      {text}
                  </div>,
                  document.body,
              )
            : null;

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                aria-label="Help"
                aria-expanded={visible}
                aria-describedby={visible ? "helptip-tooltip" : undefined}
                className={buttonClass}
                onMouseEnter={open}
                onMouseLeave={close}
                onFocus={open}
                onBlur={close}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (visible) close();
                    else open();
                }}
            >
                i
            </button>
            {tooltip}
        </>
    );
}
