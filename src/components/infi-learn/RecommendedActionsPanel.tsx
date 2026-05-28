"use client";

import { useMemo, useState } from "react";

type ActionItem = {
  id: string;
  label: string;
  systemTriggerable: boolean;
};

type ActionState = {
  completedAt: string | null;
  triggerStatus: "idle" | "triggered";
  triggeredAt: string | null;
};

const ACTIONS: ActionItem[] = [
  { id: "parent-reassurance", label: "Parent reassurance call", systemTriggerable: false },
  { id: "teacher-escalation", label: "Teacher escalation", systemTriggerable: true },
  { id: "technical-support", label: "Technical support intervention", systemTriggerable: true },
  { id: "counselor-intervention", label: "Counselor intervention", systemTriggerable: true },
  { id: "study-plan", label: "Study support plan", systemTriggerable: false },
  { id: "batch-transfer", label: "Batch transfer recommendation", systemTriggerable: true },
];

function formatTime(timeIso: string): string {
  return new Date(timeIso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RecommendedActionsPanel() {
  const [stateByAction, setStateByAction] = useState<Record<string, ActionState>>({});

  const completedCount = useMemo(
    () => Object.values(stateByAction).filter((item) => item.completedAt != null).length,
    [stateByAction],
  );

  const triggeredCount = useMemo(
    () => Object.values(stateByAction).filter((item) => item.triggerStatus === "triggered").length,
    [stateByAction],
  );

  function toggleCompleted(actionId: string) {
    const now = new Date().toISOString();
    setStateByAction((prev) => {
      const prevState = prev[actionId] ?? { completedAt: null, triggerStatus: "idle", triggeredAt: null };
      const nextCompletedAt = prevState.completedAt ? null : now;
      return {
        ...prev,
        [actionId]: {
          ...prevState,
          completedAt: nextCompletedAt,
        },
      };
    });
  }

  function triggerAction(actionId: string) {
    const now = new Date().toISOString();
    setStateByAction((prev) => {
      const prevState = prev[actionId] ?? { completedAt: null, triggerStatus: "idle", triggeredAt: null };
      return {
        ...prev,
        [actionId]: {
          ...prevState,
          triggerStatus: "triggered",
          triggeredAt: now,
        },
      };
    });
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Recommended Actions For Me</h2>
        <p className="text-xs text-slate-500">
          {completedCount} done · {triggeredCount} system-triggered
        </p>
      </div>

      <div className="mt-4 space-y-3">
        {ACTIONS.map((action) => {
          const current = stateByAction[action.id] ?? {
            completedAt: null,
            triggerStatus: "idle" as const,
            triggeredAt: null,
          };
          const isDone = current.completedAt != null;
          const isTriggered = current.triggerStatus === "triggered";

          return (
            <div key={action.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    isDone
                      ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                      : "border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  {isDone ? "Action taken" : "Pending"}
                </span>

                {action.systemTriggerable ? (
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      isTriggered
                        ? "border-indigo-300 bg-indigo-100 text-indigo-800"
                        : "border-indigo-200 bg-indigo-50 text-indigo-700"
                    }`}
                  >
                    {isTriggered ? "Workflow triggered" : "System triggerable"}
                  </span>
                ) : null}
              </div>

              <p className="mt-2 text-sm font-medium text-slate-900">{action.label}</p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleCompleted(action.id)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    isDone
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {isDone ? "Undo marker" : "Mark as taken"}
                </button>

                {action.systemTriggerable ? (
                  <button
                    type="button"
                    onClick={() => triggerAction(action.id)}
                    className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-800 transition hover:bg-indigo-100"
                  >
                    {isTriggered ? "Re-trigger workflow" : "Trigger workflow"}
                  </button>
                ) : null}
              </div>

              <div className="mt-2 space-y-1 text-xs text-slate-500">
                {isDone && current.completedAt ? <p>Marked taken at {formatTime(current.completedAt)}</p> : null}
                {isTriggered && current.triggeredAt ? <p>Workflow triggered at {formatTime(current.triggeredAt)}</p> : null}
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}
