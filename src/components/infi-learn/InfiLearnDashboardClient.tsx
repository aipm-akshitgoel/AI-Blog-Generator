"use client";

import { useState } from "react";
import EngagementMetricsPanel from "@/components/infi-learn/EngagementMetricsPanel";
import IndividualStudentBoard from "@/components/infi-learn/IndividualStudentBoard";
import CohortInsightsBoard from "@/components/infi-learn/CohortInsightsBoard";

type ActionState = {
  completedAt: string | null;
  triggerStatus: "idle" | "triggered";
  triggeredAt: string | null;
};

export default function InfiLearnDashboardClient() {
  const [actionStates, setActionStates] = useState<Record<string, ActionState>>({});

  function toggleActionDone(cohortId: string, actionId: string) {
    const now = new Date().toISOString();
    setActionStates((prev) => {
      const key = `${cohortId}:${actionId}`;
      const current = prev[key] ?? { completedAt: null, triggerStatus: "idle", triggeredAt: null };
      return {
        ...prev,
        [key]: { ...current, completedAt: current.completedAt ? null : now },
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
        [key]: { ...current, triggerStatus: "triggered", triggeredAt: now },
      };
    });
  }

  return (
    <>
      <EngagementMetricsPanel />
      <CohortInsightsBoard
        actionStates={actionStates}
        onToggleActionDone={toggleActionDone}
        onTriggerAction={triggerAction}
      />
      <IndividualStudentBoard actionStates={actionStates} />
    </>
  );
}

