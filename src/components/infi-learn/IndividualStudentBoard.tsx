"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { HelpTip } from "@/components/HelpTip";

type ActionState = {
  completedAt: string | null;
  triggerStatus: "idle" | "triggered";
  triggeredAt: string | null;
};

type Student = {
  id: string;
  name: string;
  parentName: string;
  cohortId: string;
  churnLikelihood: number;
  churnAtLastCall: number;
  lastCallAtDaysAgo: number | null;
};

type CallStatus = {
  firstCallCompletedAt: string | null;
  secondCallCompletedAt: string | null;
};

type NoteItem = { id: string; text: string; createdAt: string };
type AdditionalNoteMeta = { heading: string; subheading: string };
type ConversationItem = {
  dateTime: string;
  channel: "Call" | "WhatsApp" | "Email";
  summary: string;
};
type ActionLogItem = {
  dateTime: string;
  action: string;
  status: "Completed" | "In progress" | "Pending";
};
type StudentProfile = {
  grade: string;
  city: string;
  batch: string;
  enrolledSince: string;
  attendance: string;
};
type ConcernStatus = "Pending" | "In progress" | "Resolved";
type TimelineEvent = {
  dateTime: string;
  dotClass: string;
  title: string;
  subtitle: string;
};

const EMPTY_CONVERSATIONS: ConversationItem[] = [];
const EMPTY_ACTION_LOGS: ActionLogItem[] = [];
const EMPTY_CONCERNS: string[] = [];

function buildDefaultProfile(student: Student): StudentProfile {
  const numericId = Number(student.id.replace("s-", "")) || 1;
  const cities = ["Hyderabad", "Pune", "Bengaluru", "Mumbai", "Chennai", "Delhi"];
  const batches = ["Morning", "Evening", "Weekend"];
  const monthOptions = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];
  return {
    grade: String(8 + (numericId % 4)),
    city: cities[numericId % cities.length],
    batch: batches[numericId % batches.length],
    enrolledSince: `${monthOptions[numericId % monthOptions.length]} ${2024 + (numericId % 2)}`,
    attendance: `${55 + (numericId % 35)}%`,
  };
}

function getPreviousMonthDateTime(day: number, hour: number, minute: number): string {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth() - 1, day, hour, minute, 0, 0);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function getCurrentMonthDateTime(day: number, hour: number, minute: number): string {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), day, hour, minute, 0, 0);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function getNowDateTime(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

const BASE_STUDENTS: Student[] = [
  { id: "s-1", name: "Aarav Reddy", parentName: "Neha Reddy", cohortId: "g8-hyd-teacher-x", churnLikelihood: 92, churnAtLastCall: 84, lastCallAtDaysAgo: 12 },
  { id: "s-2", name: "Kabir Mehta", parentName: "Rohan Mehta", cohortId: "g9-evening-batch", churnLikelihood: 90, churnAtLastCall: 82, lastCallAtDaysAgo: 7 },
  { id: "s-3", name: "Ishita Sharma", parentName: "Amit Sharma", cohortId: "g8-hyd-teacher-x", churnLikelihood: 88, churnAtLastCall: 89, lastCallAtDaysAgo: null },
  { id: "s-4", name: "Myra Nair", parentName: "Priya Nair", cohortId: "g9-evening-batch", churnLikelihood: 85, churnAtLastCall: 86, lastCallAtDaysAgo: null },
  { id: "s-5", name: "Vihaan Rao", parentName: "Sunita Rao", cohortId: "g8-hyd-teacher-x", churnLikelihood: 84, churnAtLastCall: 84, lastCallAtDaysAgo: null },
];

const COHORT_ACTION_KEYS: Record<string, string[]> = {
  "g8-hyd-teacher-x": ["a2", "a3"],
  "g9-evening-batch": ["b3"],
};
const ACTION_LABEL_BY_ID: Record<string, string> = {
  a2: "Teacher feedback",
  a3: "Content team feedback",
  b3: "Technical feedback",
};

const STUDENT_PROFILES: Record<string, StudentProfile> = {
  "s-1": { grade: "8", city: "Hyderabad", batch: "Evening", enrolledSince: "Jun 2025", attendance: "62%" },
  "s-2": { grade: "9", city: "Pune", batch: "Evening", enrolledSince: "Apr 2025", attendance: "57%" },
  "s-3": { grade: "8", city: "Hyderabad", batch: "Morning", enrolledSince: "May 2025", attendance: "68%" },
  "s-4": { grade: "9", city: "Pune", batch: "Evening", enrolledSince: "Mar 2025", attendance: "61%" },
  "s-5": { grade: "8", city: "Hyderabad", batch: "Evening", enrolledSince: "Jul 2025", attendance: "66%" },
};

const STUDENT_CONVERSATIONS: Record<string, ConversationItem[]> = {
  "s-1": [
    { dateTime: "2026-05-22 18:40", channel: "Call", summary: "Parent concerned about class pace and exam anxiety." },
    { dateTime: "2026-05-15 17:10", channel: "WhatsApp", summary: "Shared two-week catch-up plan and requested confirmation." },
    { dateTime: "2026-05-08 19:05", channel: "Call", summary: "Student reported low confidence in weekly tests." },
  ],
  "s-2": [
    { dateTime: "2026-05-25 20:15", channel: "Call", summary: "Discussed schedule fatigue and batch timing alternatives." },
    { dateTime: "2026-05-19 11:30", channel: "Email", summary: "Sent engagement summary and pending assignment tracker." },
  ],
};

const STUDENT_ACTION_LOGS: Record<string, ActionLogItem[]> = {
  "s-1": [
    { dateTime: "2026-05-23 14:20", action: "Teacher escalation", status: "In progress" },
    { dateTime: "2026-05-20 16:45", action: "Study support plan", status: "Completed" },
  ],
  "s-2": [
    { dateTime: "2026-05-26 12:05", action: "Batch transfer recommendation", status: "Pending" },
    { dateTime: "2026-05-25 20:35", action: "Parent reassurance call", status: "Completed" },
  ],
};

const STUDENT_ACTIVE_CONCERNS: Record<string, string[]> = {
  "s-1": ["Class pace mismatch unresolved", "Exam anxiety still high", "Parent expects weekly progress proof"],
  "s-2": ["Schedule conflict with school workload", "Low app activity in weekdays"],
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function isThisMonth(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function buildStudents(total: number): Student[] {
  const students = [...BASE_STUDENTS];
  const firstNames = [
    "Arjun",
    "Riya",
    "Tanvi",
    "Neil",
    "Aisha",
    "Dev",
    "Mira",
    "Rohan",
    "Ira",
    "Aditya",
    "Mehul",
    "Kavya",
    "Sana",
    "Vihaan",
    "Nikhil",
    "Anaya",
    "Ishaan",
    "Pooja",
    "Shruti",
    "Yash",
  ];
  const lastNames = [
    "Verma",
    "Kulkarni",
    "Iyer",
    "Singh",
    "Shah",
    "Nair",
    "Bose",
    "Gupta",
    "Rao",
    "Mehra",
    "Malhotra",
    "Kapoor",
    "Joshi",
    "Trivedi",
    "Khanna",
    "Bhatia",
    "Saxena",
    "Desai",
    "Chopra",
    "Agarwal",
  ];
  const parentFirstNames = [
    "Anita",
    "Rakesh",
    "Pooja",
    "Vikram",
    "Sneha",
    "Manoj",
    "Kiran",
    "Deepa",
    "Naveen",
    "Shalini",
    "Suresh",
    "Meena",
    "Arvind",
    "Lakshmi",
    "Nitin",
    "Kavita",
    "Rahul",
    "Divya",
    "Sanjay",
    "Rekha",
  ];

  for (let i = BASE_STUDENTS.length + 1; i <= total; i += 1) {
    const idx = i - 1;
    const first = firstNames[Math.floor(idx / lastNames.length) % firstNames.length];
    const last = lastNames[idx % lastNames.length];
    const parentFirst = parentFirstNames[(idx * 3) % parentFirstNames.length];
    const churn = 45 + (i % 50);
    // ~60% have not been called yet to keep pending-call queue realistic.
    const hasRecentCall = i % 10 >= 6;
    const lastCallAtDaysAgo = hasRecentCall ? (i % 28) + 1 : null;
    // Only a smaller fraction worsened post-call; most called students are stable/improving.
    let churnAtLastCall = churn;
    if (hasRecentCall) {
      if (i % 10 === 6) churnAtLastCall = churn - 4; // worsened
      else if (i % 10 === 7) churnAtLastCall = churn + 1; // stable
      else if (i % 10 === 8) churnAtLastCall = churn + 3; // improved
      else churnAtLastCall = churn + 2; // improved
    }
    students.push({
      id: `s-${i}`,
      name: `${first} ${last}`,
      parentName: `${parentFirst} ${last}`,
      cohortId: i % 2 === 0 ? "g8-hyd-teacher-x" : "g9-evening-batch",
      churnLikelihood: Math.max(40, Math.min(96, churn)),
      churnAtLastCall: Math.max(35, Math.min(96, churnAtLastCall)),
      lastCallAtDaysAgo,
    });
  }

  return students;
}

const STUDENTS = buildStudents(400);
const PAGE_SIZE = 4;
const AT_RISK_POOL_SIZE = 50;

export default function IndividualStudentBoard({
  actionStates,
  onToggleActionDone,
  onTriggerAction,
}: {
  actionStates: Record<string, ActionState>;
  onToggleActionDone: (cohortId: string, actionId: string) => void;
  onTriggerAction: (cohortId: string, actionId: string) => void;
}) {
  const [selectedId, setSelectedId] = useState(STUDENTS[0].id);
  const [callStates, setCallStates] = useState<Record<string, CallStatus>>({});
  const [noteInput, setNoteInput] = useState("");
  const [notesByStudent, setNotesByStudent] = useState<Record<string, NoteItem[]>>({});
  const [additionalNoteDraft, setAdditionalNoteDraft] = useState<AdditionalNoteMeta>({
    heading: "",
    subheading: "",
  });
  const [additionalNotesByStudent, setAdditionalNotesByStudent] = useState<Record<string, AdditionalNoteMeta>>({});
  const [concernStatusByKey, setConcernStatusByKey] = useState<Record<string, ConcernStatus>>({});
  const [concernPendingStatusByKey, setConcernPendingStatusByKey] = useState<Record<string, ConcernStatus>>({});
  const [concernCommentByKey, setConcernCommentByKey] = useState<Record<string, string>>({});
  const [concernCommentDraftByKey, setConcernCommentDraftByKey] = useState<Record<string, string>>({});
  const [concernTimelineEventsByStudent, setConcernTimelineEventsByStudent] = useState<Record<string, TimelineEvent[]>>({});
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"atRisk" | "stable">("atRisk");
  const [atRiskSubFilter, setAtRiskSubFilter] = useState<"all" | "pending" | "worsened">("all");
  const [showAtRiskFilterMenu, setShowAtRiskFilterMenu] = useState(false);
  const [showAdditionalNoteFields, setShowAdditionalNoteFields] = useState(false);
  const [showStudentActions, setShowStudentActions] = useState(false);
  const [page, setPage] = useState(1);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const [timelineScrollMetrics, setTimelineScrollMetrics] = useState({
    scrollTop: 0,
    clientHeight: 1,
    scrollHeight: 1,
  });

  const getScoreOffset = (s: Student) => {
    const numericId = Number(s.id.replace("s-", "")) || 0;
    return (numericId % 5) - 2; // -2 to +2 keeps samples varied but realistic.
  };
  const getEngagementScore = (s: Student) => Math.max(0, Math.min(100, Math.round(100 - s.churnLikelihood + getScoreOffset(s))));
  const getEngagementScoreAtLastCall = (s: Student) =>
    Math.max(0, Math.min(100, Math.round(100 - s.churnAtLastCall + getScoreOffset(s))));
  const getScoreBreakup = (s: Student) => {
    const score = getEngagementScore(s);
    const numericId = Number(s.id.replace("s-", "")) || 1;
    const attendance = Math.max(0, Math.min(100, score + 6 - (numericId % 5)));
    const consistency = Math.max(0, Math.min(100, score - 4 + (numericId % 4)));
    const sentiment = Math.max(0, Math.min(100, score - 2 + (numericId % 3)));
    return { attendance, consistency, sentiment };
  };

  const getDerivedStatus = (s: Student) => {
    const status = callStates[s.id] ?? { firstCallCompletedAt: null, secondCallCompletedAt: null };
    const hasCall = Boolean(status.secondCallCompletedAt || status.firstCallCompletedAt || s.lastCallAtDaysAgo != null);
    const worsenedAfterCall = s.lastCallAtDaysAgo != null && s.lastCallAtDaysAgo <= 30 && getEngagementScore(s) < getEngagementScoreAtLastCall(s);
    const tone = !hasCall ? "bg-amber-100 text-amber-700" : worsenedAfterCall ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700";
    const label = !hasCall ? "Pending call" : worsenedAfterCall ? "Risk worsened post-call" : "Engaged";
    return { status, hasCall, worsenedAfterCall, tone, label };
  };
  const getChurnScoreTone = (score: number) => {
    // Engagement score: lower is riskier.
    if (score < 50) return "bg-rose-100 text-rose-700";
    if (score < 70) return "bg-amber-100 text-amber-700";
    return "bg-emerald-100 text-emerald-700";
  };
  const getConcernStatusTone = (status: ConcernStatus) => {
    if (status === "Resolved") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (status === "In progress") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-rose-50 text-rose-700 border-rose-200";
  };

  const sortedStudents = useMemo(() => {
    const priorityScore = (s: Student) => {
      const engagement = getEngagementScore(s);
      const derived = getDerivedStatus(s);
      const isAtRisk = engagement < 50;
      if (!isAtRisk) return 50 - engagement;
      if (!derived.hasCall) return 200 - engagement;
      if (derived.worsenedAfterCall) return 150 - engagement;
      return 100 - engagement;
    };
    return [...STUDENTS].sort((a, b) => priorityScore(b) - priorityScore(a));
  }, [callStates]);

  const atRiskStudents = useMemo(
    () =>
      [...sortedStudents]
        .filter((s) => {
          const engagement = getEngagementScore(s);
          return engagement < 50;
        })
        .slice(0, AT_RISK_POOL_SIZE),
    [sortedStudents],
  );
  const calledStableStudents = useMemo(
    () =>
      [...sortedStudents].filter((s) => {
        const engagement = getEngagementScore(s);
        return engagement >= 50;
      }),
    [sortedStudents],
  );

  const filteredStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sourceStudents = statusFilter === "stable" ? calledStableStudents : atRiskStudents;
    return sourceStudents.filter((s) => {
      const matchesQuery =
        !q || s.name.toLowerCase().includes(q) || s.parentName.toLowerCase().includes(q) || s.id.toLowerCase().includes(q);
      if (!matchesQuery) return false;
      const derived = getDerivedStatus(s);
      if (statusFilter === "atRisk") {
        if (atRiskSubFilter === "pending") return !derived.hasCall;
        if (atRiskSubFilter === "worsened") return derived.worsenedAfterCall;
        return true;
      }
      return getEngagementScore(s) >= 50;
    });
  }, [atRiskStudents, calledStableStudents, query, statusFilter, atRiskSubFilter]);

  const atRiskStudentsCount = atRiskStudents.length;
  const calledStableStudentsCount = calledStableStudents.length;
  const visiblePoolLabel =
    statusFilter === "stable"
      ? `${calledStableStudentsCount} engaged students`
      : atRiskSubFilter === "pending"
        ? `${atRiskStudents.filter((s) => !getDerivedStatus(s).hasCall).length} pending students`
        : atRiskSubFilter === "worsened"
          ? `${atRiskStudents.filter((s) => getDerivedStatus(s).worsenedAfterCall).length} worsened students`
          : `${atRiskStudentsCount} at-risk students`;

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedStudents = useMemo(
    () => filteredStudents.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filteredStudents, safePage],
  );
  const pageStart = (safePage - 1) * PAGE_SIZE + (pagedStudents.length > 0 ? 1 : 0);
  const pageEnd = (safePage - 1) * PAGE_SIZE + pagedStudents.length;

  useEffect(() => {
    if (pagedStudents.length === 0) return;
    const hasSelectedInView = pagedStudents.some((student) => student.id === selectedId);
    if (!hasSelectedInView) {
      setSelectedId(pagedStudents[0].id);
    }
  }, [pagedStudents, selectedId]);

  const selectedStudent = filteredStudents.find((s) => s.id === selectedId) ?? filteredStudents[0] ?? STUDENTS[0];
  const selectedCallStatus = callStates[selectedStudent.id] ?? {
    firstCallCompletedAt: null,
    secondCallCompletedAt: null,
  };
  const selectedNotes = notesByStudent[selectedStudent.id] ?? [];
  const selectedProfile = STUDENT_PROFILES[selectedStudent.id] ?? buildDefaultProfile(selectedStudent);
  const selectedConversations = STUDENT_CONVERSATIONS[selectedStudent.id] ?? EMPTY_CONVERSATIONS;
  const selectedActionLogs = STUDENT_ACTION_LOGS[selectedStudent.id] ?? EMPTY_ACTION_LOGS;
  const selectedConcerns = STUDENT_ACTIVE_CONCERNS[selectedStudent.id] ?? EMPTY_CONCERNS;
  const selectedAdditionalNote = additionalNotesByStudent[selectedStudent.id] ?? null;
  const selectedConcernsWithFallback = useMemo(() => {
    if (selectedConcerns.length > 0) return selectedConcerns;
    return [
      "Inconsistent weekday learning continuity observed.",
      "Mentor follow-up needed for routine adherence confirmation.",
    ];
  }, [selectedConcerns]);
  const selectedConcernsWithStatus = useMemo(() => {
    const rows = selectedConcernsWithFallback.map((item, idx) => {
      const concernKey = `${selectedStudent.id}:${idx}:${item}`;
      const status = concernStatusByKey[concernKey] ?? "Pending";
      return { concernKey, item, status };
    });
    const rank: Record<ConcernStatus, number> = { Resolved: 0, "In progress": 1, Pending: 2 };
    return rows.sort((a, b) => rank[a.status] - rank[b.status]);
  }, [selectedConcernsWithFallback, selectedStudent.id, concernStatusByKey]);
  const selectedConversationsWithFallback = useMemo(() => {
    if (selectedConversations.length > 0) return selectedConversations;
    return [
      {
        dateTime: getPreviousMonthDateTime(18, 18, 20),
        channel: "Call" as const,
        summary: "Monthly mentor check-in completed; continuity plan shared with parent.",
      },
      {
        dateTime: getPreviousMonthDateTime(10, 17, 5),
        channel: "WhatsApp" as const,
        summary: "Follow-up summary and next learning milestones communicated.",
      },
    ];
  }, [selectedConversations]);
  const selectedActionLogsWithFallback = useMemo(() => {
    if (selectedActionLogs.length > 0) return selectedActionLogs;
    return [
      {
        dateTime: getPreviousMonthDateTime(21, 14, 35),
        action: "Mentor follow-up scheduling",
        status: "Completed" as const,
      },
      {
        dateTime: getPreviousMonthDateTime(12, 11, 10),
        action: "Parent progress update",
        status: "Completed" as const,
      },
    ];
  }, [selectedActionLogs]);
  const interactionTimeline = useMemo(() => {
    const toTimestamp = (dateTime: string) => new Date(dateTime.replace(" ", "T")).getTime();
    const conversationEvents: TimelineEvent[] = selectedConversationsWithFallback.map((item) => ({
      dateTime: item.dateTime,
      dotClass: "bg-indigo-500",
      title: item.channel,
      subtitle: item.summary,
    }));
    const actionEvents: TimelineEvent[] = selectedActionLogsWithFallback.map((item) => ({
      dateTime: item.dateTime,
      dotClass:
        item.status === "Completed"
          ? "bg-emerald-500"
          : item.status === "In progress"
            ? "bg-amber-500"
            : "bg-slate-400",
      title: item.action,
      subtitle: item.status,
    }));
    const concernStatusEvents = concernTimelineEventsByStudent[selectedStudent.id] ?? [];
    const fallbackExtraEvents =
      conversationEvents.length + actionEvents.length + concernStatusEvents.length < 6
        ? [
            {
              dateTime: getCurrentMonthDateTime(26, 18, 15),
              dotClass: "bg-indigo-500",
              title: "Call",
              subtitle: "Mentor checked current attendance pattern and parent support availability.",
            },
            {
              dateTime: getCurrentMonthDateTime(24, 16, 40),
              dotClass: "bg-amber-500",
              title: "Follow-up action",
              subtitle: "Pending",
            },
            {
              dateTime: getCurrentMonthDateTime(19, 11, 5),
              dotClass: "bg-indigo-500",
              title: "WhatsApp",
              subtitle: "Shared weekly recovery checklist and requested acknowledgment.",
            },
          ]
        : [];
    return [...conversationEvents, ...actionEvents, ...concernStatusEvents, ...fallbackExtraEvents].sort(
      (a, b) => toTimestamp(a.dateTime) - toTimestamp(b.dateTime),
    );
  }, [selectedConversationsWithFallback, selectedActionLogsWithFallback, concernTimelineEventsByStudent, selectedStudent.id]);

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
  }, [selectedStudent.id, interactionTimeline]);
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

  const allCallEvents = useMemo(
    () =>
      Object.values(callStates).flatMap((s) =>
        [s.firstCallCompletedAt, s.secondCallCompletedAt].filter((x): x is string => Boolean(x)),
      ),
    [callStates],
  );
  const studentsCalledToday = useMemo(
    () =>
      Object.values(callStates).filter(
        (s) =>
          (s.firstCallCompletedAt && isToday(s.firstCallCompletedAt)) ||
          (s.secondCallCompletedAt && isToday(s.secondCallCompletedAt)),
      ).length,
    [callStates],
  );
  const callsMadeThisMonth = useMemo(
    () => allCallEvents.filter((iso) => isThisMonth(iso)).length,
    [allCallEvents],
  );
  const dayOfMonth = Math.max(1, new Date().getDate());
  const fallbackAvgCallsPerDay = 20;
  const fallbackCallsThisMonth = dayOfMonth * fallbackAvgCallsPerDay;
  const callsMadeThisMonthDisplay = callsMadeThisMonth === 0 ? fallbackCallsThisMonth : callsMadeThisMonth;
  const averageCallsPerDayDisplay = useMemo(() => {
    const baseCalls = callsMadeThisMonth === 0 ? fallbackCallsThisMonth : callsMadeThisMonth;
    return Math.max(1, Math.round(baseCalls / dayOfMonth));
  }, [callsMadeThisMonth, dayOfMonth, fallbackCallsThisMonth]);
  const studentsCalledTodayDisplay = studentsCalledToday === 0 ? 3 : studentsCalledToday;

  const completedCohortActions = (COHORT_ACTION_KEYS[selectedStudent.cohortId] ?? []).filter((actionId) =>
    actionStates[`${selectedStudent.cohortId}:${actionId}`]?.completedAt,
  ).length;
  const totalCohortActions = (COHORT_ACTION_KEYS[selectedStudent.cohortId] ?? []).length;
  const selectedStudentActionIds = COHORT_ACTION_KEYS[selectedStudent.cohortId] ?? [];

  const hasIndividualExecution =
    Boolean(selectedCallStatus.firstCallCompletedAt || selectedCallStatus.secondCallCompletedAt) ||
    selectedNotes.length > 0;
  const edgeCaseHighRiskUncovered =
    selectedStudent.churnLikelihood >= 88 && !hasIndividualExecution && completedCohortActions === 0;

  function toggleFirstCall(studentId: string) {
    const now = new Date().toISOString();
    setCallStates((prev) => {
      const curr = prev[studentId] ?? { firstCallCompletedAt: null, secondCallCompletedAt: null };
      return {
        ...prev,
        [studentId]: {
          ...curr,
          firstCallCompletedAt: curr.firstCallCompletedAt ? null : now,
        },
      };
    });
  }

  function toggleSecondCall(studentId: string) {
    const now = new Date().toISOString();
    setCallStates((prev) => {
      const curr = prev[studentId] ?? { firstCallCompletedAt: null, secondCallCompletedAt: null };
      return {
        ...prev,
        [studentId]: {
          ...curr,
          secondCallCompletedAt: curr.secondCallCompletedAt ? null : now,
        },
      };
    });
  }

  function addNote() {
    if (!noteInput.trim()) return;
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

  function saveAdditionalNote() {
    const heading = additionalNoteDraft.heading.trim();
    const subheading = additionalNoteDraft.subheading.trim();
    if (!heading && !subheading) return;
    setAdditionalNotesByStudent((prev) => ({
      ...prev,
      [selectedStudent.id]: { heading, subheading },
    }));
    setAdditionalNoteDraft({ heading: "", subheading: "" });
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <h2 className="text-lg font-semibold text-slate-900">1:1 Student Grievance Redressal Queue</h2>
          <HelpTip
            side="bottom"
            variant="light"
            text="Students are prioritized by overall engagement score. Hover on any score to view its breakup and movement from the last mentor checkpoint."
          />
        </div>
        <div className="flex justify-end">
          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] text-indigo-700">
            Calls this month: {callsMadeThisMonthDisplay} | Avg/day: {averageCallsPerDayDisplay}
          </span>
        </div>
      </div>
      <div className="mt-2">
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] text-rose-700">
            At-risk students: {atRiskStudentsCount}
          </span>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
            Called today: {studentsCalledTodayDisplay}
          </span>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search student or parent..."
              className="min-w-[220px] flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-700"
            />
            <button
              type="button"
              onClick={() => {
                setStatusFilter("atRisk");
                setAtRiskSubFilter("all");
                setPage(1);
              }}
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${statusFilter === "atRisk" ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-300 bg-white text-slate-700"}`}
            >
              At-risk
              {statusFilter === "atRisk" ? (
                <span
                  role="button"
                  aria-label="Open at-risk sub-filters"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAtRiskFilterMenu((current) => !current);
                  }}
                  className="inline-flex h-4 w-4 items-center justify-center rounded border border-current/30"
                >
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 5h18l-7 8v5l-4 2v-7L3 5z" />
                  </svg>
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter("stable");
                setPage(1);
              }}
              className={`rounded-md border px-2 py-1 text-xs ${statusFilter === "stable" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-300 bg-white text-slate-700"}`}
            >
              Engaged
            </button>
          </div>
          {statusFilter === "atRisk" ? (
            <div className="relative mt-2">
              {showAtRiskFilterMenu ? (
                <div className="absolute right-0 top-9 z-10 min-w-[170px] rounded-md border border-slate-200 bg-white p-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setAtRiskSubFilter("all");
                      setPage(1);
                      setShowAtRiskFilterMenu(false);
                    }}
                    className={`block w-full rounded px-2 py-1 text-left text-xs ${atRiskSubFilter === "all" ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:bg-slate-50"}`}
                  >
                    All at-risk
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAtRiskSubFilter("pending");
                      setPage(1);
                      setShowAtRiskFilterMenu(false);
                    }}
                    className={`mt-1 block w-full rounded px-2 py-1 text-left text-xs ${atRiskSubFilter === "pending" ? "bg-amber-50 text-amber-700" : "text-slate-700 hover:bg-slate-50"}`}
                  >
                    Pending
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAtRiskSubFilter("worsened");
                      setPage(1);
                      setShowAtRiskFilterMenu(false);
                    }}
                    className={`mt-1 block w-full rounded px-2 py-1 text-left text-xs ${atRiskSubFilter === "worsened" ? "bg-rose-50 text-rose-700" : "text-slate-700 hover:bg-slate-50"}`}
                  >
                    Worsened
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="mt-2 grid grid-cols-[36px_1fr_36px] items-center gap-2">
            <button
              type="button"
              aria-label="Previous students"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-9 w-9 rounded-full border border-slate-300 bg-white text-sm text-slate-700 disabled:opacity-40"
            >
              ←
            </button>
            <p className="text-center text-[11px] text-slate-600">
              {pageStart} to {pageEnd} of {visiblePoolLabel}
            </p>
            <button
              type="button"
              aria-label="Next students"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-9 w-9 rounded-full border border-slate-300 bg-white text-sm text-slate-700 disabled:opacity-40"
            >
              →
            </button>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {pagedStudents.map((s) => {
            const derived = getDerivedStatus(s);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedId(s.id)}
                className={`rounded-lg border p-3 text-left ${
                  selectedId === s.id ? "border-indigo-400 bg-indigo-50 ring-1 ring-indigo-200" : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">{s.name}</p>
                    <span className="group relative inline-flex">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${getChurnScoreTone(getEngagementScore(s))}`}>
                      {getEngagementScore(s)}
                    </span>
                    <span className="pointer-events-none absolute right-0 top-6 z-20 hidden w-52 rounded-md border border-slate-200 bg-white p-2 text-[10px] text-slate-700 shadow-md group-hover:block">
                      <p className="font-semibold text-slate-800">Score breakup</p>
                      <p className="mt-1">Attendance: {getScoreBreakup(s).attendance}</p>
                      <p>Consistency: {getScoreBreakup(s).consistency}</p>
                      <p>Sentiment: {getScoreBreakup(s).sentiment}</p>
                      <p className="mt-1">
                        Last checkpoint: {getEngagementScoreAtLastCall(s)} | Movement:{" "}
                        {getEngagementScore(s) - getEngagementScoreAtLastCall(s) >= 0 ? "+" : ""}
                        {getEngagementScore(s) - getEngagementScoreAtLastCall(s)}
                      </p>
                    </span>
                    </span>
                </div>
                <p className="mt-1 text-xs text-slate-600">Parent: {s.parentName}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${derived.tone}`}>{derived.label}</span>
                  {derived.status.secondCallCompletedAt || derived.status.firstCallCompletedAt || s.lastCallAtDaysAgo != null ? (
                    <span className="text-[10px] text-slate-600">
                      {derived.status.secondCallCompletedAt || derived.status.firstCallCompletedAt
                        ? `Last call ${formatTime(derived.status.secondCallCompletedAt ?? derived.status.firstCallCompletedAt ?? "")}`
                        : `Last call ${s.lastCallAtDaysAgo}d ago`}
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
            <h4 className="text-xs font-semibold text-slate-800">Student profile</h4>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <p className="border-b border-slate-200 pb-1 text-xs text-slate-700">Grade: {selectedProfile.grade}</p>
              <p className="border-b border-slate-200 pb-1 text-xs text-slate-700">City: {selectedProfile.city}</p>
              <p className="border-b border-slate-200 pb-1 text-xs text-slate-700">Batch: {selectedProfile.batch}</p>
              <p className="border-b border-slate-200 pb-1 text-xs text-slate-700">Enrolled since: {selectedProfile.enrolledSince}</p>
            </div>

            <h4 className="mt-3 text-xs font-semibold text-slate-800">Interaction timeline</h4>
            <div className="relative mt-2">
              <div
                ref={timelineRef}
                onScroll={updateTimelineScrollMetrics}
                className="infi-scrollbar max-h-48 overflow-y-scroll pr-4"
              >
                {interactionTimeline.length > 0 ? (
                  interactionTimeline.map((item, idx) => (
                    <div key={`${item.dateTime}-${item.title}-${idx}`} className="relative grid grid-cols-[80px_14px_1fr] gap-2 pb-3 last:pb-0">
                      <div className="text-center text-xs text-slate-700">
                        <p className="font-semibold">{item.dateTime.split(" ")[0]}</p>
                        <p className="font-semibold">{item.dateTime.split(" ")[1] ?? ""}</p>
                      </div>
                      <div className="relative flex w-4 justify-center">
                        {idx < interactionTimeline.length - 1 ? (
                          <span className="absolute top-2 left-1/2 h-full w-px -translate-x-1/2 bg-slate-300" />
                        ) : null}
                        <span className={`mt-1 inline-block h-2.5 w-2.5 rounded-full ${item.dotClass}`} />
                      </div>
                      <div className="text-xs text-slate-700">
                        <p className="font-medium text-slate-800">{item.title}</p>
                        <p className="text-slate-600">{item.subtitle}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">No interaction timeline available.</p>
                )}
              </div>
              <div className="pointer-events-none absolute right-0 top-0 h-48 w-1.5 rounded-full bg-slate-200">
                <div
                  className="absolute left-0 w-1.5 rounded-full bg-slate-500"
                  style={{ height: `${timelineThumbHeight}px`, transform: `translateY(${timelineThumbTop}px)` }}
                />
              </div>
            </div>

            <h4 className="mt-3 text-xs font-semibold text-slate-800">Active / latest concerns</h4>
            <div className="mt-1 space-y-1">
              {selectedConcernsWithStatus.length > 0 ? (
                selectedConcernsWithStatus.map(({ concernKey, item, status: concernStatus }) => {
                  const savedComment = concernCommentByKey[concernKey] ?? "";
                  const commentDraft = concernCommentDraftByKey[concernKey] ?? "";
                  const pendingStatus = concernPendingStatusByKey[concernKey] ?? concernStatus;
                  const hasPendingChange = pendingStatus !== concernStatus;
                  const canSaveChange = hasPendingChange && Boolean(commentDraft.trim());
                  return (
                    <div key={concernKey} className="rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs text-amber-800">{item}</p>
                        <select
                          value={pendingStatus}
                          onChange={(e) =>
                            setConcernPendingStatusByKey((prev) => ({
                              ...prev,
                              [concernKey]: e.target.value as ConcernStatus,
                            }))
                          }
                          className={`rounded border px-2 py-0.5 text-[10px] font-medium ${getConcernStatusTone(pendingStatus)}`}
                        >
                          <option value="Pending">Pending</option>
                          <option value="In progress">In progress</option>
                          <option value="Resolved">Resolved</option>
                        </select>
                      </div>
                      {hasPendingChange ? (
                        <div className="mt-2 rounded border border-slate-200 bg-white p-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={commentDraft}
                              onChange={(e) =>
                                setConcernCommentDraftByKey((prev) => ({
                                  ...prev,
                                  [concernKey]: e.target.value,
                                }))
                              }
                              placeholder="Add status-change comment..."
                              className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs text-slate-700"
                            />
                            <button
                              type="button"
                              disabled={!canSaveChange}
                              onClick={() => {
                                if (!canSaveChange) return;
                                const val = commentDraft.trim();
                                setConcernStatusByKey((prev) => ({ ...prev, [concernKey]: pendingStatus }));
                                setConcernCommentByKey((prev) => ({ ...prev, [concernKey]: val }));
                                setConcernCommentDraftByKey((prev) => ({ ...prev, [concernKey]: "" }));
                                setConcernPendingStatusByKey((prev) => ({ ...prev, [concernKey]: pendingStatus }));
                                const event: TimelineEvent = {
                                  dateTime: getNowDateTime(),
                                  dotClass:
                                    pendingStatus === "Resolved"
                                      ? "bg-emerald-500"
                                      : pendingStatus === "In progress"
                                        ? "bg-amber-500"
                                        : "bg-rose-500",
                                  title: "Concern status updated",
                                  subtitle: `${item} -> ${pendingStatus} (${val})`,
                                };
                                setConcernTimelineEventsByStudent((prev) => ({
                                  ...prev,
                                  [selectedStudent.id]: [event, ...(prev[selectedStudent.id] ?? [])],
                                }));
                              }}
                              className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Save
                            </button>
                          </div>
                          <p className="mt-1 text-[10px] text-slate-500">Add a note to save status change.</p>
                        </div>
                      ) : null}
                      {savedComment ? <p className="mt-1 text-xs text-emerald-700">Comment: {savedComment}</p> : null}
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-500">No active concerns.</p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div>
            <p className="text-xs font-medium text-slate-700">Call notes</p>
            <div className="mt-2 flex gap-2">
              <input
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Add mentor note..."
                className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs"
              />
              <button type="button" onClick={addNote} className="rounded-md border border-indigo-300 bg-indigo-50 px-2.5 py-1.5 text-xs text-indigo-700">
                Add note
              </button>
            </div>
            <div className="mt-2 space-y-1">
              {selectedNotes.map((note) => (
                <div key={note.id} className="rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700">
                  <p>{note.text}</p>
                  <p className="mt-1 text-[10px] text-slate-500">Logged at {formatTime(note.createdAt)}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleFirstCall(selectedStudent.id)}
              disabled={selectedNotes.length === 0}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {selectedCallStatus.firstCallCompletedAt ? "Marked done" : "Mark done"}
            </button>
            <HelpTip side="top" variant="light" text="Add notes to enable mark done" />
          </div>
          <p className="mt-1 text-xs text-slate-600">
            {selectedCallStatus.firstCallCompletedAt
              ? `Completed at ${formatTime(selectedCallStatus.firstCallCompletedAt)}`
              : null}
          </p>

          <div className="mt-4 border-t border-slate-200 pt-3 text-xs">
            <button
              type="button"
              onClick={() => setShowStudentActions((prev) => !prev)}
              className="flex w-full items-center justify-between text-left text-xs font-medium text-slate-700"
            >
              <span>Actions</span>
              <span className="text-slate-500">{showStudentActions ? "Click to collapse" : "Click to expand"}</span>
            </button>
            {showStudentActions ? (
              <div className="mt-2 space-y-2">
                {selectedStudentActionIds.map((actionId) => {
                  const actionKey = `${selectedStudent.cohortId}:${actionId}`;
                  const st = actionStates[actionKey] ?? { completedAt: null, triggerStatus: "idle" as const, triggeredAt: null };
                  return (
                    <div key={actionKey} className="rounded-md border border-slate-200 bg-slate-50 p-2">
                      <p className="text-xs font-medium text-slate-800">{ACTION_LABEL_BY_ID[actionId] ?? actionId}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => onTriggerAction(selectedStudent.cohortId, actionId)}
                          className="rounded-md border border-indigo-300 bg-indigo-50 px-2.5 py-1 text-xs text-indigo-700"
                        >
                          {st.triggerStatus === "triggered" ? "Mail again" : "Mail"}
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggleActionDone(selectedStudent.cohortId, actionId)}
                          className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700"
                        >
                          {st.completedAt ? "Mark pending" : "Mark completed"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="mt-4 border-t border-slate-200 pt-3 text-xs">
            <button
              type="button"
              onClick={() => setShowAdditionalNoteFields((prev) => !prev)}
              className="flex w-full items-center justify-between text-left text-xs font-medium text-slate-700"
            >
              <span>Additional notes</span>
              <span className="text-slate-500">{showAdditionalNoteFields ? "Click to collapse" : "Click to expand"}</span>
            </button>
            {showAdditionalNoteFields ? (
              <div className="mt-2 space-y-2">
                <input
                  type="text"
                  value={additionalNoteDraft.heading}
                  onChange={(e) =>
                    setAdditionalNoteDraft((prev) => ({
                      ...prev,
                      heading: e.target.value,
                    }))
                  }
                  placeholder="Add heading..."
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-700"
                />
                <textarea
                  value={additionalNoteDraft.subheading}
                  onChange={(e) =>
                    setAdditionalNoteDraft((prev) => ({
                      ...prev,
                      subheading: e.target.value,
                    }))
                  }
                  placeholder="Add description..."
                  rows={2}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-700"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={saveAdditionalNote}
                    disabled={!additionalNoteDraft.heading.trim() || !additionalNoteDraft.subheading.trim()}
                    className="rounded-md border border-indigo-300 bg-indigo-50 px-2.5 py-1.5 text-xs text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Save additional note
                  </button>
                  <HelpTip side="top" variant="light" text="Fill both heading and description to enable this action." />
                </div>
              </div>
            ) : null}
            {selectedAdditionalNote ? (
              <div className="mt-2 rounded-md border border-slate-200 bg-white p-2">
                <p className="font-medium text-slate-800">{selectedAdditionalNote.heading || "Untitled"}</p>
                {selectedAdditionalNote.subheading ? (
                  <p className="mt-1 text-slate-600">{selectedAdditionalNote.subheading}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

