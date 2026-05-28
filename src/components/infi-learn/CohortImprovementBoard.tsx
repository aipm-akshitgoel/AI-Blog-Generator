"use client";

import { useMemo, useState } from "react";

type CohortAction = {
  id: string;
  label: string;
  systemTriggerable: boolean;
};

type Cohort = {
  id: string;
  title: string;
  students: number;
  riskLevel: "High" | "Medium";
  summary: string;
  metrics: Array<{ label: string; value: string; trend: string }>;
  conversations: string[];
  actions: CohortAction[];
};

type ActionState = {
  completedAt: string | null;
  triggerStatus: "idle" | "triggered";
  triggeredAt: string | null;
};

type StudentTarget = {
  id: string;
  studentName: string;
  parentName: string;
  riskScore: number;
  reason: string;
  riskTrendSinceLastCall: "improved" | "stable" | "worsened";
  trailingHistory: string[];
  callObjective: string;
  commitmentLine: string;
  feedbackCallPriority: "High" | "Medium" | "Low";
};

type CohortAudit = {
  plannedActions: number;
  completedActions: number;
  plannedCalls: number;
  completedCalls: number;
  callMinutes: number;
  impactSummary: string;
};

type NoteItem = {
  id: string;
  text: string;
  createdAt: string;
};

type StudentCallStatus = {
  firstCallCompletedAt: string | null;
  feedbackCompletedAt: string | null;
};

const COHORTS: Cohort[] = [
  {
    id: "g8-hyd-teacher-x",
    title: "Grade 8 · Hyderabad · Teacher X",
    students: 26,
    riskLevel: "High",
    summary: "Disengagement is driven by class pace mismatch and confidence drop.",
    metrics: [
      { label: "Attendance", value: "62%", trend: "-8% WoW" },
      { label: "Homework completion", value: "58%", trend: "-6% WoW" },
      { label: "Parent sentiment", value: "Low", trend: "-11 pts" },
      { label: "Renewal risk", value: "High", trend: "+9 pts" },
    ],
    conversations: [
      "Students report classes move too fast for concept retention.",
      "Parents are unsure whether progress is translating to outcomes.",
      "Mentor notes repeated exam anxiety and low confidence before tests.",
    ],
    actions: [
      { id: "a1", label: "Parent reassurance call", systemTriggerable: false },
      { id: "a2", label: "Teacher escalation", systemTriggerable: true },
      { id: "a3", label: "Counselor intervention", systemTriggerable: true },
    ],
  },
  {
    id: "city-pune-grade7",
    title: "Pune · Grade 7 Cluster",
    students: 22,
    riskLevel: "Medium",
    summary: "City-level cohort showing low homework continuity after holidays.",
    metrics: [
      { label: "Homework completion", value: "52%", trend: "-9% WoW" },
      { label: "Attendance", value: "69%", trend: "-3% WoW" },
      { label: "Student sentiment", value: "Neutral-", trend: "-4 pts" },
      { label: "Renewal risk", value: "Medium", trend: "+4 pts" },
    ],
    conversations: [
      "Mentors report weaker study routine consistency post-break.",
      "Parents ask for stronger accountability checks.",
      "Students mention difficulty catching up with pending tasks.",
    ],
    actions: [
      { id: "p1", label: "Study support plan", systemTriggerable: false },
      { id: "p2", label: "Parent reassurance call", systemTriggerable: false },
      { id: "p3", label: "Counselor intervention", systemTriggerable: true },
    ],
  },
  {
    id: "g9-evening-batch",
    title: "Class 9 · Evening Batch",
    students: 31,
    riskLevel: "High",
    summary: "Attendance and app activity are dropping due to schedule fatigue.",
    metrics: [
      { label: "Attendance", value: "57%", trend: "-12% WoW" },
      { label: "App activity", value: "41%", trend: "-10% WoW" },
      { label: "Consecutive inactive days", value: "5.2", trend: "+1.4 DoD" },
      { label: "Renewal risk", value: "High", trend: "+7 pts" },
    ],
    conversations: [
      "Students say evening timing clashes with school workload.",
      "Parents ask for alternate slots and consistency plan.",
      "Mentor notes reduced focus in late sessions.",
    ],
    actions: [
      { id: "b1", label: "Batch transfer recommendation", systemTriggerable: true },
      { id: "b2", label: "Study support plan", systemTriggerable: false },
      { id: "b3", label: "Parent reassurance call", systemTriggerable: false },
    ],
  },
  {
    id: "math-remedial-subject-cluster",
    title: "Subject Cluster · Math Remedial",
    students: 19,
    riskLevel: "High",
    summary: "Subject-specific drop in confidence and test participation.",
    metrics: [
      { label: "Math assessment participation", value: "49%", trend: "-10% WoW" },
      { label: "Concept mastery checks", value: "Low", trend: "-8 pts" },
      { label: "Student sentiment", value: "Low", trend: "-9 pts" },
      { label: "Renewal risk", value: "High", trend: "+8 pts" },
    ],
    conversations: [
      "Students feel sessions move from basics to advanced too quickly.",
      "Parents request more structured remediation milestones.",
      "Mentor logs indicate repeated doubt backlog before assessments.",
    ],
    actions: [
      { id: "m1", label: "Teacher escalation", systemTriggerable: true },
      { id: "m2", label: "Study support plan", systemTriggerable: false },
      { id: "m3", label: "Escalate academic concern", systemTriggerable: true },
    ],
  },
  {
    id: "g10-tech-heavy",
    title: "Class 10 · Tech-Issue Heavy Group",
    students: 18,
    riskLevel: "Medium",
    summary: "Engagement loss is linked to recurring platform and video issues.",
    metrics: [
      { label: "Technical complaint frequency", value: "High", trend: "+5 incidents WoW" },
      { label: "Test participation", value: "64%", trend: "-4% WoW" },
      { label: "Student sentiment", value: "Neutral-", trend: "-6 pts" },
      { label: "Renewal risk", value: "Medium", trend: "+3 pts" },
    ],
    conversations: [
      "Students cite lag and app crashes during revision sessions.",
      "Parents want faster issue resolution updates.",
      "Mentor notes disengagement spikes after technical incidents.",
    ],
    actions: [
      { id: "c1", label: "Technical support intervention", systemTriggerable: true },
      { id: "c2", label: "Escalate academic concern", systemTriggerable: true },
      { id: "c3", label: "Parent reassurance call", systemTriggerable: false },
    ],
  },
  {
    id: "negative-parent-sentiment-cluster",
    title: "Parent Sentiment Cluster · Confidence Dip",
    students: 24,
    riskLevel: "High",
    summary: "Cross-batch cohort grouped by repeated parent concern themes.",
    metrics: [
      { label: "Parent sentiment", value: "Low", trend: "-13 pts WoW" },
      { label: "Renewal intent", value: "At risk", trend: "+11 pts churn risk" },
      { label: "Mentor follow-up SLA", value: "78%", trend: "-6% WoW" },
      { label: "Student engagement", value: "63%", trend: "-5% WoW" },
    ],
    conversations: [
      "Parents do not see visible learning progress despite attendance.",
      "Multiple families ask for stronger outcome communication.",
      "Mentors report reassurance calls reducing escalation intensity.",
    ],
    actions: [
      { id: "s1", label: "Parent reassurance call", systemTriggerable: false },
      { id: "s2", label: "Trigger counselor intervention", systemTriggerable: true },
      { id: "s3", label: "Batch transfer recommendation", systemTriggerable: true },
    ],
  },
];

const STUDENT_TARGETS_BY_COHORT: Record<string, StudentTarget[]> = {
  "g8-hyd-teacher-x": [
    {
      id: "g8-s1",
      studentName: "Aarav Reddy",
      parentName: "Mrs. Reddy",
      riskScore: 92,
      reason: "Sharp drop in attendance and pace-related anxiety.",
      riskTrendSinceLastCall: "worsened",
      trailingHistory: [
        "2 missed classes in last 4 days.",
        "Parent raised concern on speed of explanation last week.",
        "Student reported exam stress in mentor call.",
      ],
      callObjective: "Reassure parent, align short study cadence, and retain attendance momentum.",
      commitmentLine: "Share a 2-week stabilization plan and weekly update checkpoint.",
      feedbackCallPriority: "Medium",
    },
    {
      id: "g8-s2",
      studentName: "Ishita Sharma",
      parentName: "Mr. Sharma",
      riskScore: 88,
      reason: "Low homework completion and confidence dip before tests.",
      riskTrendSinceLastCall: "stable",
      trailingHistory: [
        "Homework completion down from 74% to 52% in 10 days.",
        "Parent call requested revision support structure.",
        "Student skipped one remediation session.",
      ],
      callObjective: "Set accountability rhythm and remove blockers for homework continuity.",
      commitmentLine: "Confirm revised homework support and direct escalation path.",
      feedbackCallPriority: "Low",
    },
    {
      id: "g8-s3",
      studentName: "Vihaan Rao",
      parentName: "Mrs. Rao",
      riskScore: 84,
      reason: "Irregular engagement after teacher pace complaints.",
      riskTrendSinceLastCall: "improved",
      trailingHistory: [
        "App activity down 18% WoW.",
        "Parent sentiment shifted from neutral to negative.",
        "Mentor noted low classroom participation.",
      ],
      callObjective: "Retain trust while teacher calibration request is processed.",
      commitmentLine: "Set expectation on timeline for teacher feedback loop.",
      feedbackCallPriority: "Low",
    },
  ],
  "g9-evening-batch": [
    {
      id: "g9-s1",
      studentName: "Kabir Mehta",
      parentName: "Mr. Mehta",
      riskScore: 90,
      reason: "Evening fatigue causing attendance and focus deterioration.",
      riskTrendSinceLastCall: "worsened",
      trailingHistory: [
        "Attendance dropped to 55% this week.",
        "Parent requested alternate timing consideration.",
        "Student indicated clash with school assignments.",
      ],
      callObjective: "Stabilize schedule and prevent immediate drop-off.",
      commitmentLine: "Evaluate batch shift and provide interim study schedule.",
      feedbackCallPriority: "Medium",
    },
    {
      id: "g9-s2",
      studentName: "Myra Nair",
      parentName: "Mrs. Nair",
      riskScore: 85,
      reason: "Reduced app usage and incomplete assessments.",
      riskTrendSinceLastCall: "stable",
      trailingHistory: [
        "App usage down 21% in 7 days.",
        "Parent asked for progress clarity.",
        "Student missed latest mock test.",
      ],
      callObjective: "Re-engage via simpler weekly plan and reassurance.",
      commitmentLine: "Share personalized catch-up checklist and follow-up window.",
      feedbackCallPriority: "Low",
    },
  ],
};

const AUDIT_BY_COHORT: Record<string, CohortAudit> = {
  "g8-hyd-teacher-x": {
    plannedActions: 14,
    completedActions: 9,
    plannedCalls: 8,
    completedCalls: 5,
    callMinutes: 132,
    impactSummary: "Attendance stabilized for 6/9 contacted students; parent escalation intensity reduced.",
  },
  "g9-evening-batch": {
    plannedActions: 16,
    completedActions: 10,
    plannedCalls: 10,
    completedCalls: 6,
    callMinutes: 149,
    impactSummary: "Batch-change requests clarified; two at-risk students resumed classes.",
  },
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getStudentContactKey(student: Pick<StudentTarget, "studentName" | "parentName">): string {
  return `${student.studentName.toLowerCase()}::${student.parentName.toLowerCase()}`;
}

function actionKeywordScore(actionLabel: string, noteText: string): number {
  const text = noteText.toLowerCase();
  if (actionLabel.toLowerCase().includes("parent") && (text.includes("parent") || text.includes("reassure"))) return 2;
  if (actionLabel.toLowerCase().includes("teacher") && (text.includes("teacher") || text.includes("pace"))) return 2;
  if (actionLabel.toLowerCase().includes("technical") && (text.includes("app") || text.includes("lag") || text.includes("technical")))
    return 2;
  if (actionLabel.toLowerCase().includes("counselor") && (text.includes("stress") || text.includes("anxiety"))) return 2;
  if (actionLabel.toLowerCase().includes("batch") && (text.includes("schedule") || text.includes("timing"))) return 2;
  if (actionLabel.toLowerCase().includes("study") && (text.includes("homework") || text.includes("revision"))) return 2;
  return 0;
}

export default function CohortImprovementBoard() {
  const [selectedCohortId, setSelectedCohortId] = useState(COHORTS[0].id);
  const [actionStates, setActionStates] = useState<Record<string, ActionState>>({});
  const [selectedStudentByCohort, setSelectedStudentByCohort] = useState<Record<string, string>>({});
  const [noteInput, setNoteInput] = useState("");
  const [notesByStudent, setNotesByStudent] = useState<Record<string, NoteItem[]>>({});
  const [studentCallStatusById, setStudentCallStatusById] = useState<Record<string, StudentCallStatus>>({});

  const selectedCohort = useMemo(
    () => COHORTS.find((cohort) => cohort.id === selectedCohortId) ?? COHORTS[0],
    [selectedCohortId],
  );

  const selectedActionState = (cohortId: string, actionId: string): ActionState =>
    actionStates[`${cohortId}:${actionId}`] ?? { completedAt: null, triggerStatus: "idle", triggeredAt: null };

  const studentTargets = STUDENT_TARGETS_BY_COHORT[selectedCohort.id] ?? [];
  const selectedStudentId = selectedStudentByCohort[selectedCohort.id] ?? studentTargets[0]?.id ?? null;
  const selectedStudent = studentTargets.find((student) => student.id === selectedStudentId) ?? null;
  const selectedStudentNotes = selectedStudent ? notesByStudent[selectedStudent.id] ?? [] : [];
  const selectedStudentStatusKey = selectedStudent ? getStudentContactKey(selectedStudent) : null;
  const selectedStudentCallStatus = selectedStudent
    ? studentCallStatusById[selectedStudentStatusKey ?? selectedStudent.id] ?? {
        firstCallCompletedAt: null,
        feedbackCompletedAt: null,
      }
    : { firstCallCompletedAt: null, feedbackCompletedAt: null };
  const notesContextText = selectedStudentNotes.map((n) => n.text).join(" ");
  const cohortAudit = AUDIT_BY_COHORT[selectedCohort.id] ?? {
    plannedActions: selectedCohort.actions.length * 4,
    completedActions: Math.floor(selectedCohort.actions.length * 2),
    plannedCalls: 6,
    completedCalls: 3,
    callMinutes: 75,
    impactSummary: "Early interventions started; impact trending to be measured in next cycle.",
  };

  function toggleActionDone(cohortId: string, actionId: string) {
    const now = new Date().toISOString();
    setActionStates((prev) => {
      const key = `${cohortId}:${actionId}`;
      const current = prev[key] ?? { completedAt: null, triggerStatus: "idle", triggeredAt: null };
      return {
        ...prev,
        [key]: {
          ...current,
          completedAt: current.completedAt ? null : now,
        },
      };
    });
  }

  function triggerAction(cohortId: string, actionId: string) {
    const now = new Date().toISOString();
    setActionStates((prev) => {
      const key = `${cohortId}:${actionId}`;
      const current = prev[key] ?? { completedAt: null, triggerStatus: "idle", triggeredAt: null };
      return {
        ...prev,
        [key]: {
          ...current,
          triggerStatus: "triggered",
          triggeredAt: now,
        },
      };
    });
  }

  function addStudentNote() {
    if (!selectedStudent || !noteInput.trim()) return;
    const next: NoteItem = {
      id: `${selectedStudent.id}-${Date.now()}`,
      text: noteInput.trim(),
      createdAt: new Date().toISOString(),
    };
    setNotesByStudent((prev) => ({
      ...prev,
      [selectedStudent.id]: [next, ...(prev[selectedStudent.id] ?? [])],
    }));
    setNoteInput("");
  }

  function toggleFirstCallStatus(studentId: string) {
    const now = new Date().toISOString();
    setStudentCallStatusById((prev) => {
      const current = prev[studentId] ?? { firstCallCompletedAt: null, feedbackCompletedAt: null };
      return {
        ...prev,
        [studentId]: {
          ...current,
          firstCallCompletedAt: current.firstCallCompletedAt ? null : now,
        },
      };
    });
  }

  function toggleFeedbackStatus(studentId: string) {
    const now = new Date().toISOString();
    setStudentCallStatusById((prev) => {
      const current = prev[studentId] ?? { firstCallCompletedAt: null, feedbackCompletedAt: null };
      return {
        ...prev,
        [studentId]: {
          ...current,
          feedbackCompletedAt: current.feedbackCompletedAt ? null : now,
        },
      };
    });
  }

  return (
    <section className="mt-6 grid gap-6 xl:grid-cols-5">
      <article className="rounded-2xl border border-slate-200 bg-white p-5 xl:col-span-2">
        <h2 className="text-lg font-semibold text-slate-900">Priority Cohorts</h2>
        <p className="mt-2 text-sm text-slate-600">
          Select a cohort to review metrics, conversation insights, and intervention status.
        </p>
        <div className="mt-4 space-y-3">
          {COHORTS.map((cohort) => {
            const active = cohort.id === selectedCohort.id;
            return (
              <button
                key={cohort.id}
                type="button"
                onClick={() => {
                  setSelectedCohortId(cohort.id);
                }}
                className={`w-full rounded-xl border p-4 text-left transition ${
                  active
                    ? "border-indigo-300 bg-indigo-50 shadow-sm"
                    : "border-slate-200 bg-slate-50 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{cohort.title}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      cohort.riskLevel === "High" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {cohort.riskLevel} risk
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600">{cohort.students} students</p>
                <p className="mt-2 text-sm text-slate-700">{cohort.summary}</p>
              </button>
            );
          })}
        </div>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-5 xl:col-span-3">
        <h3 className="text-lg font-semibold text-slate-900">{selectedCohort.title}</h3>
        <p className="mt-1 text-sm text-slate-600">{selectedCohort.summary}</p>

        <div className="mt-4">
          <h4 className="text-sm font-semibold text-slate-900">Cohort Metrics</h4>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {selectedCohort.metrics.map((metric) => (
              <div key={metric.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">{metric.label}</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{metric.value}</p>
                <p className="mt-1 text-xs text-slate-600">{metric.trend}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <h4 className="text-sm font-semibold text-slate-900">Conversation Insights</h4>
          <div className="mt-2 space-y-2">
            {selectedCohort.conversations.map((line) => (
              <p key={line} className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm text-slate-700">
                {line}
              </p>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <h4 className="text-sm font-semibold text-slate-900">Top Students & Parents to Target</h4>
          <p className="mt-1 text-xs text-slate-600">
            Prioritized call queue from this cohort to retain engagement while root issues are being resolved.
          </p>
          <div className="mt-2 grid gap-2 lg:grid-cols-2">
            <div className="space-y-2">
              {studentTargets.length > 0 ? (
                studentTargets.map((student) => {
                  const active = student.id === selectedStudentId;
                  const statusKey = getStudentContactKey(student);
                  const callStatus = studentCallStatusById[statusKey] ?? {
                    firstCallCompletedAt: null,
                    feedbackCompletedAt: null,
                  };
                  const lastCallAt = callStatus.feedbackCompletedAt ?? callStatus.firstCallCompletedAt;
                  const hasAnyCall = Boolean(lastCallAt);
                  const statusTone = !hasAnyCall
                    ? "bg-amber-100 text-amber-700"
                    : student.riskTrendSinceLastCall === "worsened"
                      ? "bg-rose-100 text-rose-700"
                      : "bg-emerald-100 text-emerald-700";
                  const statusLabel = !hasAnyCall
                    ? "Pending call"
                    : student.riskTrendSinceLastCall === "worsened"
                      ? "Risk worsened"
                      : student.riskTrendSinceLastCall === "stable"
                        ? "Stable post-call"
                        : "Improving post-call";
                  return (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() =>
                        setSelectedStudentByCohort((prev) => ({
                          ...prev,
                          [selectedCohort.id]: student.id,
                        }))
                      }
                      className={`w-full rounded-lg border p-3 text-left transition ${
                        active ? "border-indigo-300 bg-indigo-50" : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">{student.studentName}</p>
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">
                          Risk {student.riskScore}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">Parent: {student.parentName}</p>
                      <p className="mt-1 text-xs text-slate-700">{student.reason}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusTone}`}>
                          {statusLabel}
                        </span>
                        <span className="text-[10px] text-slate-600">
                          {lastCallAt ? `Last call ${formatTime(lastCallAt)}` : "Last call: none"}
                        </span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-600">
                  No student-level targets configured for this cohort yet.
                </div>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              {selectedStudent ? (
                <>
                  <h5 className="text-sm font-semibold text-slate-900">
                    Pre-call briefing · {selectedStudent.studentName}
                  </h5>
                  <p className="mt-2 text-xs font-medium text-slate-700">Call objective</p>
                  <p className="text-sm text-slate-700">{selectedStudent.callObjective}</p>
                  <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
                    <p className="text-xs font-medium text-slate-700">Call progress status</p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-1">
                      <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${
                              selectedStudentCallStatus.firstCallCompletedAt ? "bg-emerald-500" : "bg-amber-500"
                            }`}
                          />
                          <p className="text-xs font-medium text-slate-800">First call</p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              selectedStudentCallStatus.firstCallCompletedAt
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {selectedStudentCallStatus.firstCallCompletedAt ? "Completed" : "Pending"}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-600">
                          {selectedStudentCallStatus.firstCallCompletedAt
                            ? `Completed at ${formatTime(selectedStudentCallStatus.firstCallCompletedAt)}`
                            : "Awaiting first call"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-2">
                      <p className="text-[11px] font-medium text-slate-600">Update status</p>
                      <div className="mt-1 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => toggleFirstCallStatus(getStudentContactKey(selectedStudent))}
                        className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                          selectedStudentCallStatus.firstCallCompletedAt
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {selectedStudentCallStatus.firstCallCompletedAt ? "First call completed" : "Mark first call done"}
                      </button>
                      </div>
                    </div>
                  </div>
                  <p className="mt-2 text-xs font-medium text-slate-700">Commitment to communicate</p>
                  <p className="text-sm text-slate-700">{selectedStudent.commitmentLine}</p>
                  <p className="mt-2 text-xs font-medium text-slate-700">Trailing history</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-slate-600">
                    {selectedStudent.trailingHistory.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
                    <p className="text-xs font-medium text-slate-700">Call notes</p>
                    <div className="mt-2 flex gap-2">
                      <input
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        placeholder="Add mentor call note for context..."
                        className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-400"
                      />
                      <button
                        type="button"
                        onClick={addStudentNote}
                        className="rounded-md border border-indigo-300 bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                      >
                        Add note
                      </button>
                    </div>
                    <div className="mt-2 space-y-1">
                      {selectedStudentNotes.length > 0 ? (
                        selectedStudentNotes.map((note) => (
                          <div key={note.id} className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700">
                            <p>{note.text}</p>
                            <p className="mt-1 text-[10px] text-slate-500">Logged at {formatTime(note.createdAt)}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500">No notes logged yet for this student.</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
                    <p className="text-xs font-medium text-slate-700">Second call timeline (feedback)</p>
                    <div className="mt-3 space-y-0">
                      <div className="flex gap-3">
                        <div className="flex w-4 flex-col items-center">
                          <span className="mt-1 inline-block h-2.5 w-2.5 rounded-full bg-slate-500" />
                          <span className="mt-1 h-9 w-px bg-slate-300" />
                        </div>
                        <div className="pb-2">
                          <p className="text-xs font-medium text-slate-800">Issue identified</p>
                          <p className="text-[11px] text-slate-600">Cluster-level concern logged and assigned.</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex w-4 flex-col items-center">
                          <span
                            className={`mt-1 inline-block h-2.5 w-2.5 rounded-full ${
                              selectedStudentCallStatus.firstCallCompletedAt ? "bg-emerald-500" : "bg-amber-500"
                            }`}
                          />
                          <span className="mt-1 h-9 w-px bg-slate-300" />
                        </div>
                        <div className="pb-2">
                          <p className="text-xs font-medium text-slate-800">First call completed</p>
                          <p className="text-[11px] text-slate-600">
                            {selectedStudentCallStatus.firstCallCompletedAt
                              ? `Completed at ${formatTime(selectedStudentCallStatus.firstCallCompletedAt)}`
                              : "Pending"}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex w-4 flex-col items-center">
                          <span
                            className={`mt-1 inline-block h-2.5 w-2.5 rounded-full ${
                              selectedStudentCallStatus.feedbackCompletedAt ? "bg-indigo-500" : "bg-slate-400"
                            }`}
                          />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-800">Second call (feedback) completion</p>
                          <p className="text-[11px] text-slate-600">
                            {selectedStudentCallStatus.feedbackCompletedAt
                              ? `Completed at ${formatTime(selectedStudentCallStatus.feedbackCompletedAt)}`
                              : "Pending issue resolution"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => toggleFeedbackStatus(getStudentContactKey(selectedStudent))}
                        className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                          selectedStudentCallStatus.feedbackCompletedAt
                            ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {selectedStudentCallStatus.feedbackCompletedAt
                          ? "Second call completed"
                          : "Mark second call complete"}
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-600">
                    Feedback call priority after issue resolution:{" "}
                    <span className="font-semibold text-slate-800">{selectedStudent.feedbackCallPriority}</span>{" "}
                    (de-prioritize if new high-churn queue emerges).
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-600">Select a student to view pre-call brief and history.</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <h4 className="text-sm font-semibold text-slate-900">Interventions & Action Tracking</h4>
          <div className="mt-2 space-y-2">
            {selectedCohort.actions
              .filter((action) => !action.label.toLowerCase().includes("parent reassurance call"))
              .map((action) => {
              const actionState = selectedActionState(selectedCohort.id, action.id);
              const done = Boolean(actionState.completedAt);
              const triggered = actionState.triggerStatus === "triggered";
              const validationScore = actionKeywordScore(action.label, notesContextText);
              return (
                <div key={action.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-slate-900">{action.label}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        done ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {done ? "Taken" : "Pending"}
                    </span>
                    {action.systemTriggerable ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          triggered ? "bg-indigo-100 text-indigo-700" : "bg-indigo-50 text-indigo-700"
                        }`}
                      >
                        {triggered ? "Triggered" : "System triggerable"}
                      </span>
                    ) : null}
                    {selectedStudent && selectedStudentNotes.length > 0 ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          validationScore > 0 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {validationScore > 0 ? "Validated by notes" : "Needs note validation"}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => toggleActionDone(selectedCohort.id, action.id)}
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      {done ? "Mark pending" : "Mark completed"}
                    </button>
                    {action.systemTriggerable ? (
                      <>
                        <button
                          type="button"
                          onClick={() => triggerAction(selectedCohort.id, action.id)}
                          className="rounded-md border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                        >
                          {triggered ? "Review & send again" : "Review template & send"}
                        </button>
                        <div className="w-full rounded-md border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-800">
                          <p className="font-semibold">Template preview</p>
                          <p className="mt-1">
                            Subject/Channel: {action.label} ({selectedCohort.title})
                          </p>
                          <p className="mt-1">
                            Context: {selectedCohort.summary} {selectedStudent ? `Priority case: ${selectedStudent.studentName}.` : ""}
                          </p>
                          <p className="mt-1">Message draft: Request action, expected timeline, and closure confirmation.</p>
                        </div>
                      </>
                    ) : null}
                  </div>

                  <div className="mt-2 text-xs text-slate-500">
                    {done && actionState.completedAt ? <p>Completed at {formatTime(actionState.completedAt)}</p> : null}
                    {triggered && actionState.triggeredAt ? <p>Workflow triggered at {formatTime(actionState.triggeredAt)}</p> : null}
                    {selectedStudent && selectedStudentNotes.length > 0 ? (
                      <p>
                        Context check:{" "}
                        {validationScore > 0
                          ? "recent call notes support this action."
                          : "no direct supporting signal found in recent notes."}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h4 className="text-sm font-semibold text-slate-900">Execution Audit</h4>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <div className="rounded-md border border-slate-200 bg-white p-2">
              <p className="text-xs text-slate-500">Actions</p>
              <p className="text-sm font-semibold text-slate-900">
                {cohortAudit.completedActions} / {cohortAudit.plannedActions} completed
              </p>
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-2">
              <p className="text-xs text-slate-500">Calls completed</p>
              <p className="text-sm font-semibold text-slate-900">
                {cohortAudit.completedCalls} / {cohortAudit.plannedCalls}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-2">
              <p className="text-xs text-slate-500">Time spent on calls</p>
              <p className="text-sm font-semibold text-slate-900">{cohortAudit.callMinutes} minutes</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-600">Impact delivered: {cohortAudit.impactSummary}</p>
        </div>
      </article>
    </section>
  );
}
