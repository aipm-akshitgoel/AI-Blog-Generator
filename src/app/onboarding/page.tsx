import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
    const { userId } = await auth();

    if (!userId) {
        redirect("/");
    } else {
        redirect("/setup");
    }

    return (
        <main className="min-h-screen bg-neutral-950 flex items-center justify-center p-6 md:p-12 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-900/20 blur-[100px] rounded-full mix-blend-screen pointer-events-none"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-900/20 blur-[100px] rounded-full mix-blend-screen pointer-events-none"></div>

            <div className="max-w-2xl w-full bg-neutral-900/80 backdrop-blur-xl border border-neutral-800 rounded-3xl p-8 md:p-12 shadow-2xl relative z-10">
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-900/50">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">Connect Your Platform</h1>
                    <p className="text-neutral-400 text-lg max-w-md mx-auto">
                        Before we can auto-publish your AI-generated blogs, we need to link our agents to your live website.
                    </p>
                </div>

                <div className="space-y-4 mb-10">
                    {/* Option 1: Web Hosting / CMS */}
                    <label className="block relative cursor-pointer group">
                        <input type="radio" name="connection_type" className="peer sr-only" defaultChecked />
                        <div className="rounded-2xl border-2 border-neutral-800 bg-neutral-950/50 p-6 transition-all peer-checked:border-emerald-500 peer-checked:bg-emerald-950/20 hover:border-neutral-700">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-800 text-emerald-400 peer-checked:bg-emerald-900/50 group-hover:scale-105 transition-transform">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-1">Login to Hosting Provider</h3>
                                    <p className="text-sm text-neutral-400">Connect directly to WordPress, Webflow, Shopify, or Sanity via OAuth.</p>
                                </div>
                            </div>
                        </div>
                    </label>

                    {/* Option 2: DNS Records */}
                    <label className="block relative cursor-pointer group">
                        <input type="radio" name="connection_type" className="peer sr-only" />
                        <div className="rounded-2xl border-2 border-neutral-800 bg-neutral-950/50 p-6 transition-all peer-checked:border-emerald-500 peer-checked:bg-emerald-950/20 hover:border-neutral-700">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-800 text-indigo-400 peer-checked:bg-indigo-900/50 group-hover:scale-105 transition-transform">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-1">Update DNS Records</h3>
                                    <p className="text-sm text-neutral-400">Add a custom CNAME and TXT record to your domain registrar (GoDaddy, Namecheap).</p>
                                </div>
                            </div>
                        </div>
                    </label>
                </div>

                <div className="flex flex-col items-center justify-between gap-4 pt-6 border-t border-neutral-800 sm:flex-row">
                    <p className="text-xs text-neutral-500 text-center sm:text-left">
                        Don't have access right now?<br />
                        <span className="text-neutral-400">You can skip this and export HTML drafts manually.</span>
                    </p>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <Link
                            href="/dashboard"
                            className="flex-1 sm:flex-none text-center rounded-xl px-6 py-3 text-sm font-bold text-neutral-300 bg-neutral-800 hover:bg-neutral-700 transition-colors"
                        >
                            Skip for Now
                        </Link>
                        <Link
                            href="/dashboard"
                            className="flex-1 sm:flex-none text-center rounded-xl px-6 py-3 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-900/20 transition-all hover:scale-105"
                        >
                            Continue Setup
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    );
}
