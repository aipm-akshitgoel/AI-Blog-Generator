"use client";

import { useState } from "react";
import {
  BUSINESS_TYPES,
  type BusinessContext as BusinessContextType,
  type BusinessContextLocation,
} from "@/lib/types/businessContext";

const STEPS = [
  "business",
  "location",
  "services",
  "audience",
  "positioning",
  "confirm",
] as const;

type Step = (typeof STEPS)[number];

const initialForm: Omit<BusinessContextType, "id" | "confirmedAt" | "createdAt" | "updatedAt"> = {
  businessName: "",
  businessType: "salon",
  location: {},
  services: [],
  targetAudience: "",
  positioning: "",
};

export function BusinessContextSetup() {
  const [step, setStep] = useState<Step>("business");
  const [form, setForm] = useState(initialForm);
  const [servicesInput, setServicesInput] = useState("");
  const [saved, setSaved] = useState<BusinessContextType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goNext = () => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  };
  const goPrev = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  };

  const handleConfirmAndSave = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/business-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: form.businessName,
          businessType: form.businessType,
          location: form.location,
          services: form.services,
          targetAudience: form.targetAudience,
          positioning: form.positioning,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setSaved(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const addService = () => {
    const v = servicesInput.trim();
    if (v && !form.services.includes(v)) {
      setForm((f) => ({ ...f, services: [...f.services, v] }));
      setServicesInput("");
    }
  };
  const removeService = (s: string) => {
    setForm((f) => ({ ...f, services: f.services.filter((x) => x !== s) }));
  };

  const handleRestart = () => {
    setSaved(null);
    setForm(initialForm);
    setStep("business");
    setServicesInput("");
    setError(null);
  };

  if (saved) {
    return (
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
        <h2 className="mb-4 text-lg font-semibold text-neutral-100">
          Canonical business context (saved)
        </h2>
        <pre className="mb-6 overflow-auto rounded-lg bg-neutral-950 p-4 text-sm text-neutral-300 whitespace-pre-wrap">
          {JSON.stringify(saved, null, 2)}
        </pre>
        <p className="mb-4 text-sm text-neutral-500">
          Want to update your business details? Restart the journey from the beginning.
        </p>
        <button
          type="button"
          onClick={handleRestart}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500"
        >
          Restart from beginning
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
      <div className="mb-6 flex gap-2 text-sm text-neutral-500">
        {STEPS.map((s) => (
          <span
            key={s}
            className={
              step === s ? "font-medium text-neutral-200" : ""
            }
          >
            {s}
          </span>
        ))}
      </div>

      {step === "business" && (
        <>
          <label className="mb-2 block text-sm text-neutral-400">
            Business name
          </label>
          <input
            type="text"
            value={form.businessName}
            onChange={(e) =>
              setForm((f) => ({ ...f, businessName: e.target.value }))
            }
            className="mb-4 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100"
            placeholder="e.g. Glow Salon"
          />
          <label className="mb-2 block text-sm text-neutral-400">
            Business type
          </label>
          <select
            value={form.businessType}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                businessType: e.target.value as BusinessContextType["businessType"],
              }))
            }
            className="mb-4 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100"
          >
            {BUSINESS_TYPES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </>
      )}

      {step === "location" && (
        <>
          <label className="mb-2 block text-sm text-neutral-400">City</label>
          <input
            type="text"
            value={form.location.city ?? ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                location: { ...f.location, city: e.target.value || undefined },
              }))
            }
            className="mb-4 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100"
            placeholder="e.g. Austin"
          />
          <label className="mb-2 block text-sm text-neutral-400">
            Region / state
          </label>
          <input
            type="text"
            value={form.location.region ?? ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                location: {
                  ...f.location,
                  region: e.target.value || undefined,
                },
              }))
            }
            className="mb-4 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100"
            placeholder="e.g. Texas"
          />
          <label className="mb-2 block text-sm text-neutral-400">Country</label>
          <input
            type="text"
            value={form.location.country ?? ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                location: {
                  ...f.location,
                  country: e.target.value || undefined,
                },
              }))
            }
            className="mb-4 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100"
            placeholder="e.g. USA"
          />
        </>
      )}

      {step === "services" && (
        <>
          <label className="mb-2 block text-sm text-neutral-400">
            Services (add one at a time)
          </label>
          <div className="mb-4 flex gap-2">
            <input
              type="text"
              value={servicesInput}
              onChange={(e) => setServicesInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addService())}
              className="flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100"
              placeholder="e.g. Hair coloring"
            />
            <button
              type="button"
              onClick={addService}
              className="rounded-lg bg-neutral-700 px-4 py-2 text-sm font-medium text-neutral-100 hover:bg-neutral-600"
            >
              Add
            </button>
          </div>
          {form.services.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {form.services.map((s) => (
                <li
                  key={s}
                  className="flex items-center gap-1 rounded-full bg-neutral-800 px-3 py-1 text-sm text-neutral-200"
                >
                  {s}
                  <button
                    type="button"
                    onClick={() => removeService(s)}
                    className="text-neutral-500 hover:text-red-400"
                    aria-label={`Remove ${s}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {step === "audience" && (
        <>
          <label className="mb-2 block text-sm text-neutral-400">
            Target audience
          </label>
          <textarea
            value={form.targetAudience}
            onChange={(e) =>
              setForm((f) => ({ ...f, targetAudience: e.target.value }))
            }
            rows={3}
            className="mb-4 w-full resize-none rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100"
            placeholder="e.g. Women 25–55 looking for premium cuts and color in the neighborhood"
          />
        </>
      )}

      {step === "positioning" && (
        <>
          <label className="mb-2 block text-sm text-neutral-400">
            Positioning (how you want to be perceived)
          </label>
          <textarea
            value={form.positioning}
            onChange={(e) =>
              setForm((f) => ({ ...f, positioning: e.target.value }))
            }
            rows={3}
            className="mb-4 w-full resize-none rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100"
            placeholder="e.g. Friendly, expert, and trusted for natural-looking color and healthy hair"
          />
        </>
      )}

      {step === "confirm" && (
        <>
          <div className="mb-4 rounded-lg border border-neutral-700 bg-neutral-950 p-4 text-sm text-neutral-300">
            <p className="font-medium text-neutral-100">{form.businessName}</p>
            <p className="text-neutral-500">{form.businessType}</p>
            <p>
              {[form.location.city, form.location.region, form.location.country]
                .filter(Boolean)
                .join(", ") || "—"}
            </p>
            <p>Services: {form.services.join(", ") || "—"}</p>
            <p className="mt-2">Audience: {form.targetAudience || "—"}</p>
            <p>Positioning: {form.positioning || "—"}</p>
          </div>
          <p className="mb-4 text-sm text-neutral-500">
            Confirm to save and see the canonical business context object.
          </p>
          {error && (
            <p className="mb-4 text-sm text-red-400">{error}</p>
          )}
          <button
            type="button"
            onClick={handleConfirmAndSave}
            disabled={loading}
            className="rounded-lg bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-500 disabled:opacity-50"
          >
            {loading ? "Saving…" : "Confirm and save"}
          </button>
        </>
      )}

      <div className="mt-6 flex justify-between">
        <button
          type="button"
          onClick={goPrev}
          disabled={step === "business"}
          className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
        >
          Back
        </button>
        {step !== "confirm" ? (
          <button
            type="button"
            onClick={goNext}
            className="rounded-lg bg-neutral-700 px-4 py-2 text-sm font-medium text-neutral-100 hover:bg-neutral-600"
          >
            Next
          </button>
        ) : null}
      </div>
    </div>
  );
}
