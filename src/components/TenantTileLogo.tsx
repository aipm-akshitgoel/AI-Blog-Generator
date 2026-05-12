"use client";

import { useMemo, useState } from "react";
import { tenantLogoCandidateUrls } from "@/lib/faqTenantTileLogos";

type Props = {
  logoHost: string;
  /** First URL tried (e.g. header logo from `pages.talentedge.dev` for that programme). */
  prioritizedLogoUrl?: string | null;
  /** `sm` for compact rows (e.g. microsite list). */
  size?: "md" | "sm";
};

/** Outer frame: identical box on every tile; image is letterboxed inside with `object-contain`. */
const frame = {
  md: "h-12 w-12 text-[1.25rem]",
  sm: "h-9 w-9 text-[1.05rem]",
} as const;

/**
 * Tries curated header logo (if any), then each site’s favicon / touch icon / Google favicon, then 🎓.
 */
export function TenantTileLogo({ logoHost, prioritizedLogoUrl, size = "md" }: Props) {
  const candidates = useMemo(
    () => tenantLogoCandidateUrls(logoHost, prioritizedLogoUrl),
    [logoHost, prioritizedLogoUrl],
  );
  const [index, setIndex] = useState(0);
  const wh = frame[size];

  if (index >= candidates.length) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-lg bg-white p-2 ring-1 ring-slate-200/80 ${wh}`}
        aria-hidden
      >
        🎓
      </div>
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-2 ring-1 ring-slate-200/80 ${wh}`}
    >
      <img
        src={candidates[index]}
        alt=""
        role="presentation"
        className="max-h-full max-w-full object-contain object-center"
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setIndex((i) => i + 1)}
      />
    </div>
  );
}
