"use client";

import { useState } from "react";
import { HelpTip } from "@/components/HelpTip";

type SubMetric = {
  label: string;
  value: string;
  movement: string;
};

type Pillar = {
  id: string;
  label: string;
  metrics: SubMetric[];
};

const PILLARS: Pillar[] = [
  {
    id: "engagement-health",
    label: "Engagement Health",
    metrics: [
      { label: "Homework completion %", value: "61%", movement: "+2% DoD" },
      { label: "App activity", value: "58%", movement: "-3% WoW" },
      { label: "Assessment participation", value: "67%", movement: "+1% WoW" },
    ],
  },
  {
    id: "risk-signals",
    label: "Risk Signals",
    metrics: [
      { label: "7+ day inactivity breaches", value: "6", movement: "+2 DoD" },
      { label: "Negative sentiment volatility", value: "High", movement: "+11 pts WoW" },
      { label: "Unresolved escalations", value: "8", movement: "+3 WoW" },
    ],
  },
  {
    id: "renewal-risk",
    label: "Renewal Risk Pool",
    metrics: [
      { label: "Renewal risk score", value: "High", movement: "+7 pts WoW" },
      { label: "Student sentiment", value: "Neutral-", movement: "-4 pts WoW" },
      { label: "Parent sentiment", value: "Low", movement: "-6 pts WoW" },
    ],
  },
];

const TOTAL_STUDENTS = 400;
const AT_RISK_STUDENTS = 50;
const ACTIVE_STUDENTS = TOTAL_STUDENTS - AT_RISK_STUDENTS;
const ACTIVE_RATE_PERCENT = 82.5;
const ACTIVE_AVERAGE_PERCENT = 85.0;

export default function EngagementMetricsPanel() {
  const [showPillarDetails, setShowPillarDetails] = useState(false);
  const isActiveBelowAverage = ACTIVE_RATE_PERCENT < ACTIVE_AVERAGE_PERCENT;
  const activeCardTone = isActiveBelowAverage
    ? {
        card: "border-rose-200 bg-rose-50",
        text: "text-rose-800",
        label: "text-rose-700",
        divider: "border-rose-300",
        button: "border-rose-300 text-rose-700",
      }
    : {
        card: "border-emerald-200 bg-emerald-50",
        text: "text-emerald-800",
        label: "text-emerald-700",
        divider: "border-emerald-300",
        button: "border-emerald-300 text-emerald-700",
      };
  const getValueTone = (value: string) => {
    const normalized = value.toLowerCase();
    if (normalized.includes("low") || normalized.includes("neutral-")) return "text-rose-700";
    if (normalized.includes("high")) return "text-amber-700";
    return "text-slate-900";
  };
  const getMovementTone = (label: string, movement: string) => {
    const metric = label.toLowerCase();
    const normalized = movement.toLowerCase();

    // Metrics where an increase is positive.
    const increaseIsGood =
      metric.includes("homework completion") ||
      metric.includes("assessment participation") ||
      metric.includes("app activity");

    // Metrics where a decrease is positive.
    const decreaseIsGood =
      metric.includes("inactivity breaches") ||
      metric.includes("unresolved escalations");

    if (increaseIsGood) {
      if (normalized.startsWith("+")) return "text-emerald-700";
      if (normalized.startsWith("-")) return "text-rose-700";
    }

    if (decreaseIsGood) {
      if (normalized.startsWith("-")) return "text-emerald-700";
      if (normalized.startsWith("+")) return "text-rose-700";
    }

    // For sentiment volatility and risk-point deltas, higher is generally worse.
    if (metric.includes("volatility") || metric.includes("risk score") || metric.includes("sentiment")) {
      if (normalized.startsWith("-")) return "text-emerald-700";
      if (normalized.startsWith("+")) return "text-rose-700";
    }

    return "text-slate-500";
  };

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-slate-900">Performance Overview</h2>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="grid gap-3 sm:grid-cols-5">
          <div className={`rounded-lg border p-2.5 sm:col-span-2 ${activeCardTone.card}`}>
            <div className="flex items-center gap-1.5">
              <p className={`text-[11px] uppercase tracking-[0.08em] ${activeCardTone.label}`}>Current active students</p>
              <HelpTip
                side="bottom"
                variant="light"
                text="Share of allocated students currently considered active based on attendance, activity, and sentiment thresholds."
              />
            </div>
            <div className="mt-0.5 flex items-start justify-between gap-3">
              <p className={`text-3xl font-semibold ${activeCardTone.text}`}>{ACTIVE_RATE_PERCENT.toFixed(1)}%</p>
              <div className={`border-l pl-3 ${activeCardTone.text} ${activeCardTone.divider}`}>
                <p className="text-3xl font-semibold leading-none">{AT_RISK_STUDENTS}</p>
                <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.08em]">out of</p>
                <p className="mt-0.5 text-sm font-semibold leading-none">{TOTAL_STUDENTS} disengaged</p>
              </div>
            </div>
            <p className={`mt-1 text-xs ${activeCardTone.label}`}>Average: {ACTIVE_AVERAGE_PERCENT.toFixed(1)}%</p>
            {!showPillarDetails ? (
              <div className="mt-1 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowPillarDetails(true)}
                  aria-expanded={showPillarDetails}
                  className={`rounded-full border bg-white px-2 py-0.5 text-[11px] font-medium ${activeCardTone.button}`}
                >
                  Show details ↓
                </button>
              </div>
            ) : null}
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-3 text-center">
            <div className="flex items-center justify-center gap-1.5">
              <p className="text-[11px] uppercase tracking-[0.1em] text-slate-600">Day over day</p>
              <HelpTip
                side="bottom"
                variant="light"
                text="Change in active-student percentage compared with yesterday."
              />
            </div>
            <p className="mt-1 text-4xl font-bold leading-none text-rose-700">-0.2%</p>
            <div className="mt-2 inline-flex flex-col rounded-lg border border-rose-200 bg-white px-3 py-1">
              <p className="text-base font-semibold text-slate-900">1 student</p>
              <p className="text-sm font-medium text-rose-700">disengaged</p>
            </div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 text-center">
            <div className="flex items-center justify-center gap-1.5">
              <p className="text-[11px] uppercase tracking-[0.1em] text-slate-600">Week over week</p>
              <HelpTip
                side="bottom"
                variant="light"
                text="Change in active-student percentage versus the same day last week."
              />
            </div>
            <p className="mt-1 text-4xl font-bold leading-none text-emerald-700">+0.9%</p>
            <div className="mt-2 inline-flex flex-col rounded-lg border border-emerald-200 bg-white px-3 py-1">
              <p className="text-base font-semibold text-slate-900">4 students</p>
              <p className="text-sm font-medium text-emerald-700">re-engaged</p>
            </div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 text-center">
            <div className="flex items-center justify-center gap-1.5">
              <p className="text-[11px] uppercase tracking-[0.1em] text-slate-600">Month over month</p>
              <HelpTip
                side="bottom"
                variant="light"
                text="Change in active-student percentage compared with the same period last month."
              />
            </div>
            <p className="mt-1 text-4xl font-bold leading-none text-emerald-700">+1.7%</p>
            <div className="mt-2 inline-flex flex-col rounded-lg border border-emerald-200 bg-white px-3 py-1">
              <p className="text-base font-semibold text-slate-900">7 students</p>
              <p className="text-sm font-medium text-emerald-700">re-engaged</p>
            </div>
          </div>
        </div>
      </div>

      {showPillarDetails ? (
        <div className="mt-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {PILLARS.map((pillar) => (
              <div key={pillar.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-[0.1em] text-slate-600">{pillar.label}</p>
                <div className="mt-2 space-y-2">
                  {pillar.metrics.map((metric) => (
                    <div key={metric.label} className="rounded-md border border-slate-200 bg-white px-2.5 py-2">
                      <p className="text-[11px] text-slate-600">{metric.label}</p>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p className={`text-sm font-semibold ${getValueTone(metric.value)}`}>{metric.value}</p>
                        <p className={`text-[11px] font-medium ${getMovementTone(metric.label, metric.movement)}`}>{metric.movement}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-center">
            <button
              type="button"
              onClick={() => setShowPillarDetails(false)}
              aria-expanded={showPillarDetails}
              className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700"
            >
              Hide details ↑
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
