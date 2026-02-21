"use client";

import { useState, useRef, useEffect } from "react";
import { type BusinessContext as BusinessContextType } from "@/lib/types/businessContext";

export function BusinessContextSetup({ onComplete }: { onComplete?: (context: BusinessContextType) => void }) {
  const [messages, setMessages] = useState<{ role: "user" | "model"; content: string }[]>([
    {
      role: "model",
      content: "Hi! Let's get your business profile set up. To start, what is the name of your business?",
    },
  ]);
  const [input, setInput] = useState("");
  const [draftContext, setDraftContext] = useState<BusinessContextType | null>(null);
  const [saved, setSaved] = useState<BusinessContextType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, draftContext]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput("");
    setError(null);

    const newMessages: { role: "user" | "model"; content: string }[] = [
      ...messages,
      { role: "user", content: userMsg },
    ];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch("/api/setup-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      let data;
      try {
        data = await res.json();
      } catch (err) {
        throw new Error(`Server Error: Response is not valid JSON (${res.status} ${res.statusText}). Please restart your dev server if this persists.`);
      }

      if (!res.ok) throw new Error(data.error ?? "Failed to get response");

      if (data.complete && data.data) {
        setDraftContext(data.data as BusinessContextType);
      } else if (data.text) {
        setMessages((prev) => [...prev, { role: "model", content: data.text }]);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAndSave = async () => {
    if (!draftContext) return;
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/business-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draftContext),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setSaved(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong saving the context");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (saved && onComplete) {
      onComplete(saved);
    }
  }, [saved, onComplete]);

  const handleRestart = () => {
    setSaved(null);
    setDraftContext(null);
    setMessages([
      {
        role: "model",
        content: "Hi! Let's get your business profile set up. To start, what is the name of your business?",
      },
    ]);
    setInput("");
    setError(null);
  };

  // 1. If already saved to DB
  if (saved) {
    return (
      <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-emerald-400">Business context saved</h2>
            <p className="text-xs text-neutral-400">{saved.businessName}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleRestart}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white"
        >
          Edit Details
        </button>
      </div>
    );
  }

  // 2. If finished gathering input, show confirmation screen
  if (draftContext) {
    return (
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 shadow-xl animate-in fade-in zoom-in-95 duration-300">
        <h2 className="mb-4 text-xl font-semibold text-neutral-100">Review Your Business Details</h2>
        <div className="mb-6 space-y-4 rounded-lg border border-neutral-800 bg-neutral-950 p-5 text-sm text-neutral-300">
          <div>
            <span className="block text-xs font-medium text-neutral-500 uppercase tracking-wider">Business Name</span>
            <p className="mt-1 font-medium text-neutral-100 text-base">{draftContext.businessName}</p>
          </div>
          <div>
            <span className="block text-xs font-medium text-neutral-500 uppercase tracking-wider">Type</span>
            <p className="mt-1 capitalize">{draftContext.businessType}</p>
          </div>
          <div>
            <span className="block text-xs font-medium text-neutral-500 uppercase tracking-wider">Location</span>
            <p className="mt-1">
              {[draftContext.location?.city, draftContext.location?.region, draftContext.location?.country]
                .filter(Boolean)
                .join(", ") || "—"}
            </p>
          </div>
          <div>
            <span className="block text-xs font-medium text-neutral-500 uppercase tracking-wider">Services</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {draftContext.services && draftContext.services.length > 0 ? (
                draftContext.services.map((s) => (
                  <span key={s} className="rounded-full bg-neutral-800 px-3 py-1 text-xs text-neutral-200">
                    {s}
                  </span>
                ))
              ) : (
                <span className="text-neutral-500">—</span>
              )}
            </div>
          </div>
          <div>
            <span className="block text-xs font-medium text-neutral-500 uppercase tracking-wider">Target Audience</span>
            <p className="mt-1">{draftContext.targetAudience || "—"}</p>
          </div>
          <div>
            <span className="block text-xs font-medium text-neutral-500 uppercase tracking-wider">Positioning</span>
            <p className="mt-1">{draftContext.positioning || "—"}</p>
          </div>
        </div>

        <p className="mb-4 text-sm text-neutral-400">
          Everything look correct? Confirm to save and generate your canonical business context, or restart to start over.
        </p>

        {error && (
          <p className="mb-4 rounded-lg bg-red-900/20 p-3 text-sm text-red-400 border border-red-900/50">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleConfirmAndSave}
            disabled={saving}
            className="rounded-lg bg-amber-600 px-5 py-2.5 font-medium text-white transition-colors hover:bg-amber-500 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Confirm and save"}
          </button>
          <button
            type="button"
            onClick={handleRestart}
            disabled={saving}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-5 py-2.5 font-medium text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white disabled:opacity-50"
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  // 3. Chat Interface for Gathering Data
  return (
    <div className="flex h-[600px] flex-col overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/50 shadow-xl">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"
              }`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${msg.role === "user"
                ? "bg-amber-600 text-white rounded-br-sm"
                : "bg-neutral-800 text-neutral-100 rounded-tl-sm"
                }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-tl-sm bg-neutral-800 px-4 py-3 text-sm text-neutral-400">
              <span className="flex gap-1">
                <span className="animate-bounce">●</span>
                <span className="animate-bounce delay-100">●</span>
                <span className="animate-bounce delay-200">●</span>
              </span>
            </div>
          </div>
        )}
        {error && (
          <div className="flex justify-center">
            <div className="rounded-lg bg-red-900/20 px-3 py-2 text-xs text-red-400 border border-red-900/50 flex flex-col items-center">
              <span>{error}</span>
              <span className="mt-1 text-red-300">✨ If this is an API rate limit issue, please wait 1 min and retry.</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-neutral-800 bg-neutral-950 p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="Type your answer..."
            className="w-full rounded-full border border-neutral-700 bg-neutral-900 py-3 pl-4 pr-12 text-sm text-neutral-100 placeholder-neutral-500 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="absolute right-2 flex h-8 w-8 items-center justify-center rounded-full bg-amber-600 text-white transition-colors hover:bg-amber-500 disabled:opacity-50 disabled:bg-neutral-700"
            aria-label="Send"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-4 w-4 ml-0.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </form>
        {process.env.NODE_ENV === "development" && (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => {
                const mockContext: BusinessContextType = {
                  businessName: "First Salon",
                  businessType: "salon",
                  location: { city: "Dubai", region: "Dubai", country: "UAE" },
                  services: ["Hair Extensions", "Keratin Treatment", "Coloring"],
                  targetAudience: "Luxury seekers and modern professionals",
                  positioning: "High-end luxury and timeless elegance"
                };
                if (onComplete) onComplete(mockContext);
              }}
              className="group flex items-center gap-1.5 rounded-full bg-amber-900/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-amber-500 transition-colors hover:bg-amber-900/30 hover:text-amber-400 border border-amber-900/50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 transition-transform group-hover:translate-x-0.5">
                <path fillRule="evenodd" d="M10.21 14.77a.75.75 0 01.02-1.06L14.168 10 10.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M4.21 14.77a.75.75 0 01.02-1.06L8.168 10 4.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
              </svg>
              Fast-Forward to Step 2 (Dev Mode)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
