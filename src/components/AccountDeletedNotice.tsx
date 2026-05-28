"use client";

import { useSearchParams } from "next/navigation";

export function AccountDeletedNotice() {
    const params = useSearchParams();
    if (params.get("deleted") !== "1") return null;

    return (
        <div className="mb-6 w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center text-sm text-emerald-100">
            Your account was deleted. Use <strong className="font-semibold">Get started</strong> below to
            create a fresh account with the same email.
        </div>
    );
}
