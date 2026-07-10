"use client";

import { useParams } from "next/navigation";

import { TasksToday } from "./_components/tasks-today";

export default function PlanningPage() {
  const params = useParams();
  const establishmentId = params.id as string;

  return <TasksToday establishmentId={establishmentId} />;
}
