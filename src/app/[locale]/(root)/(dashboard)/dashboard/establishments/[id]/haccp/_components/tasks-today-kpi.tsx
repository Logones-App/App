"use client";

import Link from "next/link";

import { startOfDay } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { summarize, useHaccpTasks } from "@/lib/queries/haccp-tasks";

/** KPI « Tâches à faire » dérivé des cadences (période courante par fréquence). */
export function TasksTodayKpiCard({ establishmentId, base }: { establishmentId: string; base: string }) {
  const ref = startOfDay(new Date());
  const now = new Date();
  const { tasks, isLoading } = useHaccpTasks(establishmentId, ref);
  const { remaining, nonConform } = summarize(tasks, ref, now);
  const alert = remaining > 0 || nonConform > 0;

  return (
    <Link href={`${base}/haccp/planning`}>
      <Card className={`hover:bg-muted/50 h-full cursor-pointer transition-colors ${alert ? "border-amber-200" : ""}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">Tâches à faire</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-2xl font-bold ${remaining > 0 ? "text-amber-600" : ""}`}>{isLoading ? "…" : remaining}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            {nonConform > 0 ? `${nonConform} non conforme${nonConform > 1 ? "s" : ""}` : "à jour"}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
