"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const DEMO_TENANT = "demo";

export default function AiFaqTestLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/faq/auth/session", { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!cancelled && json?.authenticated && json?.tenant?.id === DEMO_TENANT) {
          router.replace("/ai-faq-test/app");
          return;
        }
      } finally {
        if (!cancelled) setCheckingSession(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/faq/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tenant: DEMO_TENANT,
          username,
          password,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        setError(json?.error || "Login failed. Please check credentials.");
        return;
      }
      router.push("/ai-faq-test/app");
    } catch {
      setError("Unable to sign in right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f5f3ff_0%,#f8fafc_45%,#f8fafc_100%)] px-6 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-3xl bg-transparent p-8">
        <div className="mb-2 inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold tracking-wide text-violet-700">
          AI FAQ
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">AI FAQ Login</h1>
        <p className="mt-2 text-sm text-slate-600">Select your university to continue.</p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <button
            type="button"
            className="min-h-[152px] rounded-2xl border border-violet-400 bg-gradient-to-br from-violet-50 to-indigo-50 px-6 py-6 text-left shadow-[0_16px_30px_-16px_rgba(124,58,237,0.55)]"
          >
            <div className="text-[1.95rem] leading-none">🎓</div>
            <div className="mt-5 text-3xl font-semibold tracking-tight text-slate-900">Online University</div>
            <div className="mt-2 text-base text-slate-600">Online University FAQ Admin (Demo)</div>
          </button>
        </div>

        <form className="mt-8 space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-5" onSubmit={onSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">University</label>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800">
              Online University
            </div>
          </div>

          <div>
            <label htmlFor="faq-test-username" className="mb-1 block text-sm font-medium text-slate-700">
              Username
            </label>
            <input
              id="faq-test-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 caret-slate-900 outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="faq-test-password" className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="faq-test-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 caret-slate-900 outline-none focus:border-indigo-500"
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={loading || checkingSession}
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Continue"}
          </button>
        </form>
      </div>
    </main>
  );
}
