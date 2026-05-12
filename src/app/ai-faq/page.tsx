"use client";

import { FormEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getCampusTenantKeyForHost,
  isCampusOnlyFaqHost,
  listCampusFaqMicrosites,
} from "@/lib/faqCampusHostTenantKey";
import type { FaqTenantId } from "@/lib/faqTenantConfig";
import { FAQ_HUB_LOGIN_TILE_ORDER, type FaqHubTenantId } from "@/lib/faqTenantConfig";
import { PROGRAMME_CAMPUS_UNIS, programmeTileLogoUrl } from "@/lib/faqProgrammeCampusUnis";
import { TenantTileLogo } from "@/components/TenantTileLogo";
import { CORE_TILE_LOGO_URLS } from "@/lib/faqTenantTileLogos";

type TenantTile = { id: FaqHubTenantId; label: string; logoHost: string; tileLogoUrl?: string };

function hubTenantTile(id: FaqHubTenantId): TenantTile {
  switch (id) {
    case "kgp":
      return {
        id: "kgp",
        label: "IIT KGP",
        logoHost: "online.iitkgp.ac.in",
        tileLogoUrl: CORE_TILE_LOGO_URLS.kgp,
      };
    case "cu":
      return {
        id: "cu",
        label: "CUOnline",
        logoHost: "www.cuonlineedu.in",
        tileLogoUrl: CORE_TILE_LOGO_URLS.cu,
      };
    case "dyp":
      return {
        id: "dyp",
        label: "DYP",
        logoHost: "www.dypatiledu.com",
        tileLogoUrl: CORE_TILE_LOGO_URLS.dyp,
      };
    case "svu":
      return {
        id: "svu",
        label: "SVU",
        logoHost: "www.svuonline.in",
        tileLogoUrl: CORE_TILE_LOGO_URLS.svu,
      };
    case "cutn":
      return {
        id: "cutn",
        label: "CUTN",
        logoHost: "www.cutnonline.in",
        tileLogoUrl: CORE_TILE_LOGO_URLS.cutn,
      };
    case "vistas":
      return {
        id: "vistas",
        label: "VISTAS",
        logoHost: "www.vistasonlineedu.in",
        tileLogoUrl: CORE_TILE_LOGO_URLS.vistas,
      };
    default: {
      const u = PROGRAMME_CAMPUS_UNIS.find((row) => row.id === id);
      if (!u) throw new Error(`Unknown hub tenant tile: ${id}`);
      return {
        id: u.id,
        label: u.label,
        logoHost: u.wwwHost,
        tileLogoUrl: programmeTileLogoUrl(u),
      };
    }
  }
}

const TENANTS: TenantTile[] = FAQ_HUB_LOGIN_TILE_ORDER.map(hubTenantTile);

const CAMPUS_HOST_TILES: TenantTile[] = [
  { id: "dyp", label: "DYP", logoHost: "www.dypatiledu.com", tileLogoUrl: CORE_TILE_LOGO_URLS.dyp },
];

export default function AiFaqTenantLoginPage() {
  const router = useRouter();
  const [tenant, setTenant] = useState<FaqHubTenantId | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [clientHost, setClientHost] = useState<string | null>(null);
  const [tenantSearch, setTenantSearch] = useState("");
  const credentialsFormRef = useRef<HTMLFormElement | null>(null);

  const campusMicrosites = useMemo(() => listCampusFaqMicrosites(), []);

  // Hostname must not wait on a paint-delayed useEffect — that left the page stuck on "Loading…"
  // when the effect ran late or hydration was slow. Layout effect runs before the browser paints.
  useLayoutEffect(() => {
    const host = window.location.hostname;
    setClientHost(host);
    if (isCampusOnlyFaqHost(host)) {
      setTenant("dyp");
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setClientHost((prev) => {
        if (prev != null) return prev;
        const host = window.location.hostname;
        if (isCampusOnlyFaqHost(host)) {
          setTenant("dyp");
        }
        return host;
      });
    }, 2500);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();
    const sessionTimeoutMs = 12_000;
    const timer = window.setTimeout(() => ac.abort(), sessionTimeoutMs);
    (async () => {
      try {
        const res = await fetch("/api/faq/auth/session", {
          cache: "no-store",
          signal: ac.signal,
        });
        const json = await res.json().catch(() => null);
        if (!cancelled && json?.authenticated) {
          // Demo tenant belongs on the test slug; real domains use /ai-faq/app.
          if (json?.tenant?.id === "demo") {
            router.replace("/ai-faq-test/app");
          } else {
            router.replace("/ai-faq/app");
          }
          return;
        }
      } catch {
        // Timeout or network error — stay on login; do not block the form forever.
      } finally {
        window.clearTimeout(timer);
        if (!cancelled) setCheckingSession(false);
      }
    })();
    return () => {
      cancelled = true;
      ac.abort();
      window.clearTimeout(timer);
    };
  }, [router]);

  useEffect(() => {
    if (!tenant) return;
    const id = requestAnimationFrame(() => {
      credentialsFormRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    return () => cancelAnimationFrame(id);
  }, [tenant]);

  const campusOnly = Boolean(clientHost && isCampusOnlyFaqHost(clientHost));
  const campusKey = clientHost ? getCampusTenantKeyForHost(clientHost) : null;
  const tenantTiles = campusOnly ? CAMPUS_HOST_TILES : TENANTS;

  const selectedTenant = useMemo(
    () => tenantTiles.find((t) => t.id === tenant) || null,
    [tenant, tenantTiles],
  );
  const showCredentialsForm = Boolean(selectedTenant);

  const filteredTenantTiles = useMemo(() => {
    const q = tenantSearch.trim().toLowerCase();
    if (!q) return tenantTiles;
    return tenantTiles.filter(
      (t) =>
        t.label.toLowerCase().includes(q) ||
        String(t.id).toLowerCase().includes(q) ||
        t.logoHost.toLowerCase().includes(q),
    );
  }, [tenantTiles, tenantSearch]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!tenant) {
      setError("Please choose a domain first.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/faq/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tenant,
          username,
          password,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        setError(json?.error || "Login failed. Please check credentials.");
        return;
      }
      router.push("/ai-faq/app");
    } catch {
      setError("Unable to sign in right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative z-10 min-h-screen bg-[radial-gradient(circle_at_top,#f5f3ff_0%,#f8fafc_45%,#f8fafc_100%)] px-6 py-10 sm:py-14">
      <div className="relative z-10 mx-auto w-full max-w-5xl bg-transparent p-8">
        <div className="mb-2 inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold tracking-wide text-violet-700">
          AI FAQ
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Login</h1>
        <p className="mt-2 text-sm text-slate-600">
          {campusOnly
            ? "This domain uses the shared Campus FAQ service. Sign in below."
            : "Select your domain to continue."}
        </p>
        {campusOnly && campusKey ? (
          <p className="mt-1 text-xs text-slate-500">
            Tenant key for this host: <span className="font-mono text-slate-700">{campusKey}</span>
          </p>
        ) : null}

        {!clientHost ? (
          <p className="mt-6 text-sm text-slate-500">Loading…</p>
        ) : (
          <>
            {tenantTiles.length > 1 ? (
              <div className="relative z-10 mt-5 max-w-xl">
                <label htmlFor="ai-faq-tenant-search" className="mb-1.5 block text-xs font-medium text-slate-600">
                  Search domains
                </label>
                <input
                  id="ai-faq-tenant-search"
                  type="search"
                  enterKeyHint="search"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder='Partial name, e.g. "alliance" or "kgp"'
                  value={tenantSearch}
                  onChange={(e) => setTenantSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none ring-violet-200 transition placeholder:text-slate-400 focus:border-violet-300 focus:ring-2"
                />
              </div>
            ) : null}

            <div
              className={`relative z-10 mt-5 grid gap-3 ${campusOnly ? "max-w-md sm:grid-cols-1" : "sm:grid-cols-2 lg:grid-cols-3"}`}
            >
              {filteredTenantTiles.length === 0 ? (
                <p className="col-span-full rounded-xl border border-dashed border-slate-200 bg-white/60 px-4 py-8 text-center text-sm text-slate-600">
                  No domains match &ldquo;{tenantSearch.trim()}&rdquo;.{" "}
                  <button
                    type="button"
                    className="font-medium text-violet-700 underline decoration-violet-300 underline-offset-2 hover:text-violet-900"
                    onClick={() => setTenantSearch("")}
                  >
                    Clear search
                  </button>
                </p>
              ) : null}
              {filteredTenantTiles.map((item) => {
                const active = tenant === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setTenant(item.id);
                      setError("");
                    }}
                    className={`min-h-[72px] cursor-pointer rounded-2xl border px-4 py-3.5 text-left transition ${
                      active
                        ? "border-violet-400 bg-gradient-to-br from-violet-50 to-indigo-50 shadow-[0_16px_30px_-16px_rgba(124,58,237,0.55)]"
                        : "border-slate-200 bg-white/90 hover:border-violet-200 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <TenantTileLogo logoHost={item.logoHost} prioritizedLogoUrl={item.tileLogoUrl} />
                      <div className="min-w-0 text-sm font-normal leading-snug tracking-tight text-slate-800 sm:text-[0.9375rem]">
                        {item.label}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {showCredentialsForm ? (
              <p className="mt-6 text-sm font-medium text-slate-700">Enter your FAQ admin username and password.</p>
            ) : null}

            {showCredentialsForm ? (
              <form
                ref={credentialsFormRef}
                className="mt-4 space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-5"
                onSubmit={onSubmit}
              >
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Domain</label>
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800">
                    {selectedTenant?.label}
                  </div>
                </div>

                <div>
                  <label htmlFor="faq-username" className="mb-1 block text-sm font-medium text-slate-700">
                    Username
                  </label>
                  <input
                    id="faq-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 caret-slate-900 outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label htmlFor="faq-password" className="mb-1 block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <input
                    id="faq-password"
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
            ) : null}

            {!campusOnly && campusMicrosites.length > 0 ? (
              <section className="mt-12 border-t border-slate-200 pt-10">
                <h2 className="text-lg font-semibold text-slate-900">Programme microsites (Campus FAQ)</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Each card jumps to that site&apos;s{" "}
                  <code className="rounded bg-slate-100 px-1 text-xs">/ai-faq</code> login. The same Next deployment
                  that powers Campus FAQ must answer on that hostname; otherwise you only see the public marketing
                  pages. Use your <strong>Campus FAQ</strong> admin account;{" "}
                  <code className="rounded bg-slate-100 px-1 text-xs">X-Tenant-Key</code> is chosen from the host.
                </p>
                <div className="mt-4 grid max-h-[min(420px,50vh)] gap-2 overflow-y-auto rounded-xl border border-slate-200 bg-white/80 p-3 sm:grid-cols-2 lg:grid-cols-3">
                  {campusMicrosites.map((site) => {
                    let microLogoHost = "";
                    try {
                      microLogoHost = new URL(site.origin).hostname;
                    } catch {
                      microLogoHost = "";
                    }
                    const prog = PROGRAMME_CAMPUS_UNIS.find((u) => u.id === site.tenantKey);
                    const microTileLogo = prog ? programmeTileLogoUrl(prog) : undefined;
                    return (
                    <button
                      key={site.tenantKey}
                      type="button"
                      onClick={() => {
                        window.location.assign(site.loginUrl);
                      }}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-3 text-left text-sm font-normal text-violet-800 transition hover:border-violet-200 hover:bg-violet-50/60"
                    >
                      {microLogoHost ? (
                        <TenantTileLogo
                          logoHost={microLogoHost}
                          prioritizedLogoUrl={microTileLogo}
                          size="sm"
                        />
                      ) : null}
                      <span className="min-w-0 flex-1">{site.label}</span>
                    </button>
                    );
                  })}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
