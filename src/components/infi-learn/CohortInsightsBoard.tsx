"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { HelpTip } from "@/components/HelpTip";

type ActionState = {
  completedAt: string | null;
  triggerStatus: "idle" | "triggered";
  triggeredAt: string | null;
};

type CohortAction = { id: string; label: string; systemTriggerable: boolean };
type CohortMetric = { label: string; value: string; movement: string };
type ActionTimelineEvent = { id: string; at: string; text: string; dotClass: string };
type Cohort = {
  id: string;
  title: string;
  students: number;
  riskLevel: "High" | "Medium";
  summary: string;
  metrics: CohortMetric[];
  conversations: string[];
  actions: CohortAction[];
};

const COHORTS: Cohort[] = [
  {
    id: "g8-hyd-teacher-x",
    title: "Grade 8 · Hyderabad · Teacher X",
    students: 10,
    riskLevel: "High",
    summary: "Disengagement is driven by class pace mismatch and confidence drop.",
    metrics: [
      { label: "Attendance consistency", value: "62%", movement: "-6% WoW" },
      { label: "Homework completion", value: "58%", movement: "-4% WoW" },
      { label: "Test confidence pulse", value: "Low", movement: "-9 pts WoW" },
    ],
    conversations: [
      "Students report classes move too fast for concept retention.",
      "Parents are unsure whether progress is translating to outcomes.",
      "Mentor notes repeated exam anxiety and low confidence before tests.",
    ],
    actions: [
      { id: "a2", label: "Teacher feedback", systemTriggerable: true },
      { id: "a3", label: "Content team feedback", systemTriggerable: true },
    ],
  },
  {
    id: "g9-evening-batch",
    title: "Class 9 · Evening Batch",
    students: 7,
    riskLevel: "High",
    summary: "Attendance and app activity are dropping due to schedule fatigue.",
    metrics: [
      { label: "Attendance consistency", value: "64%", movement: "-5% WoW" },
      { label: "App activity", value: "56%", movement: "-7% WoW" },
      { label: "Session focus pulse", value: "Moderate-", movement: "-6 pts WoW" },
    ],
    conversations: [
      "Students say evening timing clashes with school workload.",
      "Parents ask for alternate slots and consistency plan.",
      "Mentor notes reduced focus in late sessions.",
    ],
    actions: [
      { id: "b3", label: "Technical feedback", systemTriggerable: true },
      { id: "b4", label: "Request feature", systemTriggerable: true },
    ],
  },
];

const DEFAULT_TIMELINE_BY_COHORT: Record<string, ActionTimelineEvent[]> = {
  "g8-hyd-teacher-x": [
    {
      id: "g8-default-1",
      at: "2026-04-09T16:20:00.000Z",
      text: "Content team feedback shared with chapter-level blockers.",
      dotClass: "bg-indigo-500",
    },
    {
      id: "g8-default-2",
      at: "2026-04-12T11:10:00.000Z",
      text: "Parent progress update completed.",
      dotClass: "bg-emerald-500",
    },
    {
      id: "g8-default-3",
      at: "2026-04-15T17:25:00.000Z",
      text: "Teacher feedback requested on pacing changes for weak chapters.",
      dotClass: "bg-indigo-500",
    },
    {
      id: "g8-default-4",
      at: "2026-04-18T10:45:00.000Z",
      text: "Mentor call summary shared with parent and class teacher.",
      dotClass: "bg-emerald-500",
    },
    {
      id: "g8-default-5",
      at: "2026-04-22T14:30:00.000Z",
      text: "Content team feedback acknowledged with remediation timeline.",
      dotClass: "bg-indigo-500",
    },
    {
      id: "g8-default-6",
      at: "2026-04-25T12:15:00.000Z",
      text: "Weekly confidence-check follow-up completed.",
      dotClass: "bg-emerald-500",
    },
  ],
  "g9-evening-batch": [
    {
      id: "g9-default-1",
      at: "2026-04-11T15:35:00.000Z",
      text: "Technical feedback shared with platform support.",
      dotClass: "bg-indigo-500",
    },
    {
      id: "g9-default-2",
      at: "2026-04-13T18:05:00.000Z",
      text: "Technical issue follow-up completed by mentor.",
      dotClass: "bg-emerald-500",
    },
    {
      id: "g9-default-3",
      at: "2026-04-16T09:55:00.000Z",
      text: "Evening-batch lag reports consolidated and sent for review.",
      dotClass: "bg-indigo-500",
    },
    {
      id: "g9-default-4",
      at: "2026-04-19T13:40:00.000Z",
      text: "Platform fix ETA shared with mentors and parents.",
      dotClass: "bg-emerald-500",
    },
    {
      id: "g9-default-5",
      at: "2026-04-23T16:10:00.000Z",
      text: "Technical feedback re-sent with updated classroom examples.",
      dotClass: "bg-indigo-500",
    },
    {
      id: "g9-default-6",
      at: "2026-04-27T11:20:00.000Z",
      text: "Post-fix engagement check logged as completed.",
      dotClass: "bg-emerald-500",
    },
  ],
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getMetricTone(metric: CohortMetric): {
  card: string;
  value: string;
  movement: string;
} {
  const label = metric.label.toLowerCase();
  const value = metric.value.toLowerCase();
  const movement = metric.movement.trim();
  const isNegativeMovement = movement.startsWith("-");

  const highIsGoodMetric = label.includes("attendance") || label.includes("homework") || label.includes("activity");
  const lowValue = value.includes("low") || value.includes("moderate-");

  if ((highIsGoodMetric && isNegativeMovement) || lowValue) {
    return {
      card: "border-rose-200 bg-rose-50",
      value: "text-rose-800",
      movement: "text-rose-700",
    };
  }

  return {
    card: "border-emerald-200 bg-emerald-50",
    value: "text-emerald-800",
    movement: "text-emerald-700",
  };
}

export default function CohortInsightsBoard({
  actionStates,
  onToggleActionDone,
  onTriggerAction,
}: {
  actionStates: Record<string, ActionState>;
  onToggleActionDone: (cohortId: string, actionId: string) => void;
  onTriggerAction: (cohortId: string, actionId: string) => void;
}) {
  const [selectedCohortId, setSelectedCohortId] = useState(COHORTS[0].id);
  const [noteDraftByAction, setNoteDraftByAction] = useState<Record<string, string>>({});
  const [notesByAction, setNotesByAction] = useState<Record<string, string[]>>({});
  const [noteTimelineByCohort, setNoteTimelineByCohort] = useState<Record<string, ActionTimelineEvent[]>>({});
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const [timelineScrollMetrics, setTimelineScrollMetrics] = useState({
    scrollTop: 0,
    clientHeight: 1,
    scrollHeight: 1,
  });
  const [mailPopup, setMailPopup] = useState<{
    open: boolean;
    actionKey: string | null;
    subject: string;
    body: string;
  }>({
    open: false,
    actionKey: null,
    subject: "",
    body: "",
  });
  const selected = useMemo(
    () => COHORTS.find((c) => c.id === selectedCohortId) ?? COHORTS[0],
    [selectedCohortId],
  );
  const selectedActionTimeline = useMemo(() => {
    const defaultEvents = DEFAULT_TIMELINE_BY_COHORT[selected.id] ?? [];
    const noteEvents = noteTimelineByCohort[selected.id] ?? [];
    const events = selected.actions.flatMap((action) => {
      const key = `${selected.id}:${action.id}`;
      const st = actionStates[key] ?? {
        completedAt: null,
        triggerStatus: "idle" as const,
        triggeredAt: null,
      };
      const actionEvents: ActionTimelineEvent[] = [];
      if (st.triggeredAt) {
        actionEvents.push({
          id: `${key}-triggered`,
          at: st.triggeredAt,
          text: `${action.label} mail sent`,
          dotClass: "bg-indigo-500",
        });
      }
      if (st.completedAt) {
        actionEvents.push({
          id: `${key}-completed`,
          at: st.completedAt,
          text: `${action.label} marked completed`,
          dotClass: "bg-emerald-500",
        });
      }
      return actionEvents;
    });
    return [...events, ...noteEvents, ...defaultEvents].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [selected, actionStates, noteTimelineByCohort]);

  function updateTimelineScrollMetrics() {
    if (!timelineRef.current) return;
    setTimelineScrollMetrics({
      scrollTop: timelineRef.current.scrollTop,
      clientHeight: timelineRef.current.clientHeight || 1,
      scrollHeight: timelineRef.current.scrollHeight || 1,
    });
  }

  useEffect(() => {
    if (!timelineRef.current) return;
    timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
    updateTimelineScrollMetrics();
  }, [selected.id, selectedActionTimeline]);

  useEffect(() => {
    updateTimelineScrollMetrics();
  }, []);

  const timelineThumbHeight = Math.max(
    24,
    (timelineScrollMetrics.clientHeight * timelineScrollMetrics.clientHeight) / timelineScrollMetrics.scrollHeight,
  );
  const timelineScrollRange = Math.max(1, timelineScrollMetrics.scrollHeight - timelineScrollMetrics.clientHeight);
  const timelineThumbTop =
    ((timelineScrollMetrics.clientHeight - timelineThumbHeight) * timelineScrollMetrics.scrollTop) / timelineScrollRange;

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-1.5">
        <h2 className="text-lg font-semibold text-slate-900">Cohort Insights</h2>
        <HelpTip
          side="bottom"
          variant="light"
          text="Review this section every morning to prioritize cohort-level actions before starting mentor outreach."
        />
      </div>
      <p className="mt-1 text-sm text-slate-600">Use cohorts for shared context and cohort-level interventions.</p>

      <div className="mt-3 overflow-x-auto pb-1">
        <div className="flex min-w-max gap-2">
          {COHORTS.map((cohort) => (
            <button
              key={cohort.id}
              type="button"
              onClick={() => setSelectedCohortId(cohort.id)}
              className={`w-[280px] shrink-0 rounded-lg border p-3 text-left ${
                selected.id === cohort.id ? "border-indigo-300 bg-indigo-50" : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">{cohort.title}</p>
                <span className={`rounded-full px-2 py-0.5 text-xs ${cohort.riskLevel === "High" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                  {cohort.riskLevel}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-600">{cohort.students} students</p>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <h3 className="text-sm font-semibold text-slate-900">{selected.title}</h3>
          <p className="mt-1 text-xs text-slate-600">{selected.summary}</p>
          <h4 className="mt-3 text-sm font-semibold text-slate-900">Story-linked metrics</h4>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {selected.metrics.map((metric) => (
              <div key={metric.label} className={`rounded-md border px-3 py-2 ${getMetricTone(metric).card}`}>
                <p className="text-xs text-slate-600">{metric.label}</p>
                <div className="mt-1 flex items-end justify-between gap-2">
                  <p className={`text-base font-semibold ${getMetricTone(metric).value}`}>{metric.value}</p>
                  <p className={`text-xs font-semibold ${getMetricTone(metric).movement}`}>{metric.movement}</p>
                </div>
              </div>
            ))}
          </div>
          <h4 className="mt-3 text-sm font-semibold text-slate-900">Conversation insights</h4>
          <div className="mt-2 space-y-2">
            {selected.conversations.map((line) => (
              <p key={line} className="rounded-md border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm text-slate-700">
                {line}
              </p>
            ))}
          </div>
          <h4 className="mt-3 text-sm font-semibold text-slate-900">Actions taken timeline</h4>
          <div className="relative mt-2">
            <div
              ref={timelineRef}
              onScroll={updateTimelineScrollMetrics}
              className="infi-scrollbar max-h-48 overflow-y-scroll pr-4"
            >
              {selectedActionTimeline.length > 0 ? (
                selectedActionTimeline.map((item, idx) => {
                  const dt = new Date(item.at);
                  const date = dt.toLocaleDateString("en-GB");
                  const time = dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                  return (
                    <div key={item.id} className="relative grid grid-cols-[96px_14px_1fr] gap-2 pb-3 last:pb-0">
                      <div className="text-center text-xs text-slate-700">
                        <p className="font-semibold">{date}</p>
                        <p className="font-semibold">{time}</p>
                      </div>
                      <div className="relative flex w-4 justify-center">
                        {idx < selectedActionTimeline.length - 1 ? (
                          <span className="absolute top-2 left-1/2 h-full w-px -translate-x-1/2 bg-slate-300" />
                        ) : null}
                        <span className={`mt-1 inline-block h-2.5 w-2.5 rounded-full ${item.dotClass}`} />
                      </div>
                      <div className="text-xs text-slate-700">
                        <p className="font-medium text-slate-800">{item.text}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
                  No action updates logged yet.
                </p>
              )}
            </div>
            <div className="pointer-events-none absolute bottom-1 right-1 top-1 w-1.5 rounded-full bg-slate-200">
              <div
                className="absolute left-0 w-1.5 rounded-full bg-slate-500"
                style={{ height: `${timelineThumbHeight}px`, transform: `translateY(${timelineThumbTop}px)` }}
              />
            </div>
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <h4 className="text-sm font-semibold text-slate-900">Cohort-level actions</h4>
          <div className="mt-2 space-y-2">
            {selected.actions.map((action) => {
              const st = actionStates[`${selected.id}:${action.id}`] ?? {
                completedAt: null,
                triggerStatus: "idle" as const,
                triggeredAt: null,
              };
              const done = Boolean(st.completedAt);
              const trig = st.triggerStatus === "triggered";
              const actionKey = `${selected.id}:${action.id}`;
                    const actionNotes = notesByAction[actionKey] ?? [];
                    const noteDraft = noteDraftByAction[actionKey] ?? "";
              return (
                <div key={action.id} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-slate-900">{action.label}</p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {action.systemTriggerable ? (
                      <button
                        type="button"
                        onClick={() => {
                          onTriggerAction(selected.id, action.id);
                                const isFeatureRequest = action.label.toLowerCase().includes("request feature");
                                setMailPopup({
                                  open: true,
                                  actionKey,
                                  subject: `${action.label} | ${selected.title}`,
                                  body: isFeatureRequest
                                    ? `Hello Product Team,\n\nRequesting a feature enhancement based on repeated classroom intervention patterns.\n\nCohort details:\n- ${selected.title}\n- Students impacted: ${selected.students}\n\nCurrent classroom concern:\n${selected.summary}\n\nObserved signals from students and parents:\n- ${selected.conversations.join("\n- ")}\n\nRequested feature outcome:\nEnable mentors to resolve this concern type faster with clearer actionability and closure tracking.\n\nPlease share feasibility, expected timeline, and next steps.\n\nRegards,\nMentor Team`
                                    : `Hello,\n\nSharing an update for ${selected.title}.\n\nCurrent classroom concern:\n${selected.summary}\n\nWhat students and parents are reporting:\n- ${selected.conversations.join("\n- ")}\n\nRequested support from your side:\n${action.label}\n\nPlease share next steps and expected timeline so we can align mentor follow-up with your plan.\n\nRegards,\nMentor Team`,
                                });
                        }}
                        className="rounded-md border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs text-indigo-700"
                      >
                              {trig ? "Mail again" : "Mail"}
                      </button>
                    ) : null}
                  </div>
                        <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-2">
                          <p className="text-xs font-medium text-slate-700">Notes</p>
                          <div className="mt-2 flex gap-2">
                            <input
                              type="text"
                              value={noteDraft}
                              onChange={(e) =>
                                setNoteDraftByAction((prev) => ({
                                  ...prev,
                                  [actionKey]: e.target.value,
                                }))
                              }
                              placeholder="Add action note..."
                              className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-700"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const val = noteDraft.trim();
                                if (!val) return;
                                setNotesByAction((prev) => ({
                                  ...prev,
                                  [actionKey]: [val, ...(prev[actionKey] ?? [])],
                                }));
                                setNoteTimelineByCohort((prev) => ({
                                  ...prev,
                                  [selected.id]: [
                                    {
                                      id: `${actionKey}-note-${Date.now()}`,
                                      at: new Date().toISOString(),
                                      text: `${action.label} note added: ${val}`,
                                      dotClass: "bg-indigo-500",
                                    },
                                    ...(prev[selected.id] ?? []),
                                  ],
                                }));
                                setNoteDraftByAction((prev) => ({ ...prev, [actionKey]: "" }));
                              }}
                              className="rounded-md border border-indigo-300 bg-indigo-50 px-2.5 py-1.5 text-xs text-indigo-700"
                            >
                              Add note
                            </button>
                          </div>
                          {actionNotes.length > 0 ? (
                            <div className="mt-2 space-y-1">
                              {actionNotes.map((note, idx) => (
                                <p key={`${actionKey}-note-${idx}`} className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700">
                                  {note}
                                </p>
                              ))}
                            </div>
                          ) : null}
                        </div>
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => onToggleActionDone(selected.id, action.id)}
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700"
                    >
                      {done ? "Mark pending" : "Mark completed"}
                    </button>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {st.completedAt ? <p>Completed at {formatTime(st.completedAt)}</p> : null}
                    {st.triggeredAt ? <p>Triggered at {formatTime(st.triggeredAt)}</p> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </div>

      {mailPopup.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
            <div className="flex items-center justify-between gap-2">
              <h5 className="text-sm font-semibold text-slate-900">Mail draft</h5>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMailPopup((prev) => ({ ...prev, open: false }))}
                  className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-700"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => setMailPopup((prev) => ({ ...prev, open: false }))}
                  className="rounded border border-indigo-300 bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700"
                >
                  Send mail
                </button>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">Subject</p>
                <input
                  type="text"
                  value={mailPopup.subject}
                  onChange={(e) => setMailPopup((prev) => ({ ...prev, subject: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-700"
                />
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">Body</p>
                <textarea
                  value={mailPopup.body}
                  onChange={(e) => setMailPopup((prev) => ({ ...prev, body: e.target.value }))}
                  rows={10}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-700"
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

