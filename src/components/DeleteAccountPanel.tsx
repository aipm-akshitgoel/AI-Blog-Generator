"use client";

import { useClerk } from "@clerk/nextjs";
import { useState } from "react";
import { CLERK_AFTER_ACCOUNT_DELETE_URL } from "@/lib/clerkAuth";
import { clearBusinessSetupStorage } from "@/lib/businessSetupStorage";

const CONFIRM_PHRASE = "DELETE";

export function DeleteAccountPanel() {
    const { signOut } = useClerk();
    const [confirmText, setConfirmText] = useState("");
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const canDelete = confirmText.trim() === CONFIRM_PHRASE && !deleting;

    const handleDeleteAccount = async () => {
        if (!canDelete) return;
        if (
            !window.confirm(
                "This permanently deletes your Clerk account and all blogs, drafts, business profile, and strategy data. Continue?",
            )
        ) {
            return;
        }

        setDeleting(true);
        setError(null);

        try {
            const res = await fetch("/api/user/delete", { method: "DELETE" });
            const data = (await res.json().catch(() => ({}))) as { error?: string };
            if (!res.ok) {
                throw new Error(data.error || "Failed to delete account");
            }

            clearBusinessSetupStorage();

            const redirectUrl = CLERK_AFTER_ACCOUNT_DELETE_URL;
            try {
                await signOut({ redirectUrl });
            } catch {
                /* Clerk user may already be deleted server-side */
            }
            // Hard navigation — signOut redirect alone can land on sign-in or a stale dashboard
            window.location.replace(redirectUrl);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete account");
            setDeleting(false);
        }
    };

    return (
        <div className="rounded-xl border border-red-500/20 bg-red-500/[0.03] p-6">
            <h3 className="text-lg font-black text-white uppercase tracking-tighter">Delete account</h3>
            <p className="mt-2 text-sm text-neutral-400 max-w-2xl leading-relaxed">
                Permanently removes your login, all blog posts (including drafts), business profile, and keyword
                strategy. You will be signed out and can create a fresh account with the same email afterward.
            </p>

            <div className="mt-5 space-y-3 max-w-md">
                <label className="block text-xs font-bold uppercase tracking-widest text-neutral-500">
                    Type {CONFIRM_PHRASE} to confirm
                </label>
                <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    disabled={deleting}
                    className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:border-red-500/50 focus:outline-none"
                    placeholder={CONFIRM_PHRASE}
                    autoComplete="off"
                />
            </div>

            {error && (
                <p className="mt-4 text-sm text-red-400" role="alert">
                    {error}
                </p>
            )}

            <button
                type="button"
                onClick={() => void handleDeleteAccount()}
                disabled={!canDelete}
                className="mt-5 inline-flex items-center justify-center rounded-xl border border-red-500/40 bg-red-600/90 px-6 py-3 text-sm font-black uppercase tracking-widest text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
                {deleting ? "Deleting account…" : "Delete my account"}
            </button>
        </div>
    );
}
