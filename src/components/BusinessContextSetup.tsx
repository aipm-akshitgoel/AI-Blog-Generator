"use client";

import { useState } from "react";
import { type BusinessContext as BusinessContextType } from "@/lib/types/businessContext";

export function BusinessContextSetup({ onComplete, platform = "blog" }: { onComplete?: (context: BusinessContextType) => void, platform?: "blog" | "linkedin" }) {
  // Application State
  const [step, setStep] = useState<"input" | "scraping" | "verify">("input");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Scraped Data State
  const [draftContext, setDraftContext] = useState<BusinessContextType | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState<BusinessContextType | null>(null);

  // Form Editing State
  const [editServicesStr, setEditServicesStr] = useState("");

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    // Formatting URL if missing protocol
    let formattedUrl = url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    try {
      new URL(formattedUrl);
    } catch {
      setError("Please enter a valid website URL.");
      return;
    }

    setError(null);
    setStep("scraping");

    try {
      const res = await fetch("/api/scrape-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: formattedUrl }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to analyze website");

      const contextData = data.data as BusinessContextType;
      setDraftContext({
        ...contextData,
        // Ensure arrays and objects exist so the form doesn't break
        services: contextData.services || [],
        location: contextData.location || { city: "", region: "", country: "" },
      });
      setEditServicesStr((contextData.services || []).join(", "));
      setStep("verify");

    } catch (err: any) {
      setError(err.message);
      setStep("input");
    }
  };

  const handleSave = async () => {
    if (!draftContext) return;
    setError(null);
    setIsSaving(true);

    // Parse the comma-separated services back to an array
    const finalDeps = {
      ...draftContext,
      services: editServicesStr.split(",").map(s => s.trim()).filter(Boolean)
    };

    try {
      const res = await fetch("/api/business-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalDeps),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");

      setSaved(data);
      if (onComplete) onComplete(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestart = () => {
    setSaved(null);
    setDraftContext(null);
    setStep("input");
    setError(null);
    setUrl("");
  };

  if (saved) {
    return (
      <div className={`rounded-xl border ${platform === 'linkedin' ? 'border-blue-900/50 bg-blue-950/20' : 'border-emerald-900/50 bg-emerald-950/20'} p-4 shadow-sm flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full ${platform === 'linkedin' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h2 className={`text-sm font-semibold ${platform === 'linkedin' ? 'text-blue-400' : 'text-emerald-400'}`}>Business identity verified</h2>
            <p className="text-xs text-neutral-400">{saved.businessName}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleRestart}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white"
        >
          Start Over
        </button>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/50 shadow-xl transition-all duration-500`}>

      {/* ── STEP 1: INPUT URL ── */}
      {step === "input" && (
        <div className="p-8 text-center animate-in fade-in zoom-in-95 duration-500">
          <div className={`w-16 h-16 ${platform === 'linkedin' ? 'bg-blue-500/10 border-blue-500/20' : 'bg-emerald-500/10 border-emerald-500/20'} border rounded-full flex items-center justify-center mx-auto mb-6`}>
            <svg className={`w-8 h-8 ${platform === 'linkedin' ? 'text-blue-400' : 'text-emerald-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">Enter Your Website</h2>
          <p className="text-neutral-400 mb-8 max-w-sm mx-auto italic">
            {platform === "linkedin" ? "Our platform" : "Bloggie AI"} will scan your website to automatically extract your services, brand tone, and target audience. No long forms required.
          </p>

          <form onSubmit={handleScrape} className="mx-auto max-w-md relative">
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="e.g. yoursalon.com"
              autoFocus
              className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl py-4 pl-5 pr-32 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder:text-neutral-600 shadow-inner"
            />
            <button
              type="submit"
              disabled={!url.trim()}
              className="absolute right-2 top-2 bottom-2 rounded-xl bg-emerald-600 px-6 font-bold text-white transition-all hover:bg-emerald-500 disabled:opacity-50 disabled:bg-neutral-800 shadow-lg shadow-emerald-900/50"
            >
              Scan
            </button>
          </form>

          {error && <p className="mt-4 text-sm text-red-400 font-medium bg-red-900/20 inline-block px-4 py-2 rounded-lg border border-red-900/50">{error}</p>}
        </div>
      )}

      {/* ── STEP 2: SCRAPING LOADING ── */}
      {step === "scraping" && (
        <div className="p-12 text-center animate-in fade-in duration-300">
          <div className="relative w-20 h-20 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full border-b-2 border-emerald-500 animate-spin"></div>
            <div className="absolute inset-2 rounded-full border-t-2 border-emerald-400 animate-spin delay-150 direction-reverse"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-8 h-8 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
          </div>
          <h2 className="text-xl font-black text-white mb-2 uppercase tracking-tight">AI Analyst at Work</h2>
          <p className="text-neutral-400 text-sm max-w-xs mx-auto animate-pulse">
            Reading your website copy to extract brand positioning, services, and target demographic...
          </p>
        </div>
      )}

      {/* ── STEP 3: VERIFY AND EDIT ── */}
      {step === "verify" && draftContext && (
        <div className="p-6 md:p-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="mb-6 flex justify-between items-center border-b border-neutral-800 pb-4">
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tighter">Verify Business Profile</h2>
              <p className="text-sm text-neutral-400 mt-1">Review the AI extraction. Correct any mistakes or fill out missing data.</p>
            </div>
            <button onClick={handleRestart} className="text-xs text-neutral-500 hover:text-white uppercase tracking-widest font-bold">Start Over</button>
          </div>

          {error && <p className="mb-6 text-sm text-red-400 font-medium bg-red-900/20 px-4 py-3 rounded-xl border border-red-900/50">{error}</p>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-emerald-500 mb-1.5">Business Name</label>
                <input
                  type="text"
                  value={draftContext.businessName || ""}
                  onChange={e => setDraftContext({ ...draftContext, businessName: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-1.5">Type</label>
                  <input
                    type="text"
                    value={draftContext.businessType || ""}
                    onChange={e => setDraftContext({ ...draftContext, businessType: e.target.value })}
                    placeholder="e.g. Salon, Agency"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-1.5">Domain</label>
                  <input
                    type="text"
                    value={draftContext.domain || ""}
                    onChange={e => setDraftContext({ ...draftContext, domain: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-1.5">Location</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="City"
                    value={draftContext.location?.city || ""}
                    onChange={e => setDraftContext({ ...draftContext, location: { ...draftContext.location, city: e.target.value, country: draftContext.location?.country || "" } })}
                    className="w-1/2 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                  <input
                    type="text"
                    placeholder="Country"
                    value={draftContext.location?.country || ""}
                    onChange={e => setDraftContext({ ...draftContext, location: { ...draftContext.location, country: e.target.value, city: draftContext.location?.city || "" } })}
                    className="w-1/2 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-emerald-500 mb-1.5">Services</label>
                <textarea
                  value={editServicesStr}
                  onChange={e => setEditServicesStr(e.target.value)}
                  placeholder="Haircuts, Balayage, Extensions (Comma separated)"
                  rows={2}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none"
                />
                <p className="text-[10px] mt-1 text-neutral-500 uppercase">Separate with commas</p>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-emerald-500 mb-1.5">Target Audience</label>
                <textarea
                  value={draftContext.targetAudience || ""}
                  onChange={e => setDraftContext({ ...draftContext, targetAudience: e.target.value })}
                  placeholder="e.g. Modern professionals looking for luxury"
                  rows={2}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-emerald-500 mb-1.5">Brand Tone & Positioning</label>
                <textarea
                  value={draftContext.positioning || ""}
                  onChange={e => setDraftContext({ ...draftContext, positioning: e.target.value })}
                  placeholder="e.g. High-end, exclusive, slightly casual"
                  rows={2}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving || !draftContext.businessName}
            className="w-full flex items-center justify-center gap-3 rounded-xl bg-amber-500 px-6 py-4 font-black text-neutral-900 transition-all hover:bg-amber-400 disabled:opacity-50 uppercase tracking-widest shadow-xl shadow-amber-900/30"
          >
            {isSaving ? "Saving Identity..." : "Confirm & Setup Strategy Session"}
            {!isSaving && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>}
          </button>
        </div>
      )}
    </div>
  );
}
