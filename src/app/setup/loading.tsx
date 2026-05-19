export default function SetupLoading() {
    return (
        <main className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500" />
            <p className="mt-6 text-sm font-semibold text-white">Loading…</p>
        </main>
    );
}
