"use client";

import { useState } from "react";
import type { BusinessContext } from "@/lib/types/businessContext";
import { BUSINESS_TYPES } from "@/lib/types/businessContext";
import type { StrategySession, TopicOption } from "@/lib/types/strategy";

interface ProfileEditFormProps {
  context: BusinessContext;
  strategy?: StrategySession | null;
  onSave: (updatedContext: Partial<BusinessContext>, updatedStrategy?: Partial<StrategySession>) => void;
  onCancel: () => void;
}

export function ProfileEditForm({ context, strategy, onSave, onCancel }: ProfileEditFormProps) {
  const [form, setForm] = useState({
    businessName: context.businessName ?? "",
    domain: context.domain ?? "",
    businessType: context.businessType ?? "salon",
    city: context.location?.city ?? "",
    region: context.location?.region ?? "",
    country: context.location?.country ?? "",
    services: context.services?.join(", ") ?? "",
    targetAudience: context.targetAudience ?? "",
    positioning: context.positioning ?? "",
    // Strategy fields
    primaryKeyword: strategy?.keywordStrategy?.primaryKeyword ?? "",
    secondaryKeywords: strategy?.keywordStrategy?.secondaryKeywords?.join(", ") ?? "",
    searchIntent: strategy?.keywordStrategy?.searchIntent ?? "informational",
    topics: strategy?.topicOptions ?? [] as TopicOption[],
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updatedContext = {
        businessName: form.businessName.trim(),
        domain: form.domain.trim() || undefined,
        businessType: form.businessType,
        location: { city: form.city.trim() || undefined, region: form.region.trim() || undefined, country: form.country.trim() || undefined },
        services: form.services.split(",").map((s) => s.trim()).filter(Boolean),
        targetAudience: form.targetAudience.trim(),
        positioning: form.positioning.trim(),
      };

      let updatedStrategy;
      if (strategy) {
        updatedStrategy = {
          ...strategy,
          keywordStrategy: {
            primaryKeyword: form.primaryKeyword.trim(),
            secondaryKeywords: form.secondaryKeywords.split(",").map((k: string) => k.trim()).filter(Boolean),
            searchIntent: form.searchIntent as any,
          },
          topicOptions: form.topics,
        };
      }

      await onSave(updatedContext, updatedStrategy);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.02] p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-500 backdrop-blur-md">
      <div className="flex items-center gap-3 mb-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5M16.586 3.586a2 2 0 112.828 2.828l-8.485 8.485-3 1-1-3 8.485-8.485z" />
          </svg>
        </div>
        <div>
          <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Edit Account Strategy</h3>
          <p className="text-xs text-neutral-500 font-medium">Update both your business profile and SEO keyword strategy.</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Business name</label>
          <input
            type="text"
            value={form.businessName}
            onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all placeholder:text-neutral-700"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Website Domain (Primary)</label>
          <input
            type="text"
            value={form.domain}
            onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all placeholder:e.g. https://www.example.com"
            placeholder="e.g. https://www.example.com"
          />
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Business type</label>
          <select
            value={form.businessType}
            onChange={(e) => setForm((f) => ({ ...f, businessType: e.target.value as BusinessContext["businessType"] }))}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all placeholder:text-neutral-700"
          >
            {BUSINESS_TYPES.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-neutral-400 mb-1">City</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all placeholder:text-neutral-700"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-1">Region</label>
            <input
              type="text"
              value={form.region}
              onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all placeholder:text-neutral-700"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-1">Country</label>
            <input
              type="text"
              value={form.country}
              onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all placeholder:text-neutral-700"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Services (comma-separated)</label>
          <input
            type="text"
            value={form.services}
            onChange={(e) => setForm((f) => ({ ...f, services: e.target.value }))}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all placeholder:text-neutral-700"
            placeholder="Hair styling, Coloring, Cuts"
          />
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Target audience</label>
          <textarea
            value={form.targetAudience}
            onChange={(e) => setForm((f) => ({ ...f, targetAudience: e.target.value }))}
            rows={2}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all placeholder:text-neutral-700"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Positioning</label>
          <textarea
            value={form.positioning}
            onChange={(e) => setForm((f) => ({ ...f, positioning: e.target.value }))}
            rows={2}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all placeholder:text-neutral-700"
            required
          />
        </div>
        {/* STRATEGY FIELDS SECTION */}
        {strategy && (
          <div className="mt-10 pt-10 border-t border-neutral-800/50 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <h4 className="text-[10px] uppercase font-black text-emerald-500 tracking-[0.2em] opacity-80">SEO Strategy Overwrite</h4>
              <div className="h-px flex-1 bg-neutral-800/50"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">Primary Keyword</label>
                <input
                  type="text"
                  value={form.primaryKeyword}
                  onChange={(e) => setForm((f) => ({ ...f, primaryKeyword: e.target.value }))}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 placeholder:text-neutral-700 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">Search Intent</label>
                <select
                  value={form.searchIntent}
                  onChange={(e) => setForm((f) => ({ ...f, searchIntent: e.target.value as any }))}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 focus:border-emerald-500/50 outline-none transition-all"
                >
                  <option value="informational">Informational</option>
                  <option value="commercial">Commercial</option>
                  <option value="transactional">Transactional</option>
                  <option value="navigational">Navigational</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">Secondary Keywords (comma-separated)</label>
              <input
                type="text"
                value={form.secondaryKeywords}
                onChange={(e) => setForm((f) => ({ ...f, secondaryKeywords: e.target.value }))}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 placeholder:text-neutral-700 focus:border-emerald-500/50 outline-none transition-all"
                placeholder="keyword1, keyword2, keyword3"
              />
            </div>

            <div className="space-y-4">
              <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500">Topics</label>
              <div className="space-y-3">
                {form.topics.map((topic: TopicOption, i: number) => (
                  <div key={i} className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/50 space-y-2">
                    <input
                      type="text"
                      value={topic.title}
                      onChange={(e) => {
                        const newTopics = [...form.topics];
                        newTopics[i] = { ...newTopics[i], title: e.target.value };
                        setForm(f => ({ ...f, topics: newTopics }));
                      }}
                      className="w-full bg-transparent border-none text-sm font-black text-neutral-200 outline-none p-0 focus:text-emerald-400 transition-colors uppercase"
                      placeholder="Topic Title"
                    />
                    <textarea
                      value={topic.description}
                      onChange={(e) => {
                        const newTopics = [...form.topics];
                        newTopics[i] = { ...newTopics[i], description: e.target.value };
                        setForm(f => ({ ...f, topics: newTopics }));
                      }}
                      rows={2}
                      className="w-full bg-transparent border-none text-xs text-neutral-500 outline-none p-0 resize-none font-medium"
                      placeholder="Topic Description"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-4 pt-8 border-t border-neutral-800/50">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-neutral-800 px-6 py-4 text-sm font-black text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all uppercase tracking-widest"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-[2] rounded-xl bg-emerald-600 px-6 py-4 text-sm font-black text-white hover:bg-emerald-500 disabled:opacity-50 transition-all shadow-xl shadow-emerald-900/20 uppercase tracking-widest active:scale-[0.98]"
          >
            {saving ? "Saving Changes…" : "Apply Strategy Updates"}
          </button>
        </div>
      </form>
    </div>
  );
}
