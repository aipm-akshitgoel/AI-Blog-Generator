"use client";

import { useState } from "react";

export default function GeminiChat() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Request failed");
        return;
      }
      setResponse(data.text ?? "");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-lg rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
      <h2 className="mb-3 text-lg font-semibold text-neutral-100">
        Try Gemini
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask Gemini anything..."
          rows={3}
          className="w-full resize-none rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 placeholder-neutral-500 focus:border-neutral-500 focus:outline-none"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          className="rounded-lg bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-500 disabled:opacity-50"
        >
          {loading ? "Thinking…" : "Send"}
        </button>
      </form>
      {error && (
        <p className="mt-3 text-sm text-red-400">{error}</p>
      )}
      {response && (
        <div className="mt-3 rounded-lg border border-neutral-700 bg-neutral-950 p-3 text-sm text-neutral-300 whitespace-pre-wrap">
          {response}
        </div>
      )}
    </div>
  );
}
