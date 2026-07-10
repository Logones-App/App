"use client";

import { useParams } from "next/navigation";

import { Loader2, Smartphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useHaccpChecklists } from "@/lib/queries/haccp-config-queries";
import { type HaccpChecklistRun, fmtDate, fmtTime, useHaccpChecklistRuns } from "@/lib/queries/haccp-registers-queries";

import { ChecklistCadence } from "./_components/checklist-cadence";

type Check = { checked?: boolean; ok?: boolean; done?: boolean };

function checkStats(checks: HaccpChecklistRun["checks"]): { done: number; total: number } {
  if (!Array.isArray(checks)) return { done: 0, total: 0 };
  const arr = checks as Check[];
  const done = arr.filter((c) => Boolean(c.checked ?? c.ok ?? c.done)).length;
  return { done, total: arr.length };
}

function RunRow({ run }: { run: HaccpChecklistRun }) {
  const { done, total } = checkStats(run.checks);
  const complete = total > 0 && done === total;
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border p-3">
      <div className="min-w-0">
        <p className="font-medium">{run.template_title ?? "Checklist"}</p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {fmtDate(run.run_at)} {fmtTime(run.run_at)}
          {run.recorded_by_label ? ` · ${run.recorded_by_label}` : ""}
        </p>
        {run.note && <p className="text-muted-foreground mt-1 text-xs">{run.note}</p>}
      </div>
      {total > 0 && (
        <Badge variant={complete ? "default" : "secondary"}>
          {done}/{total}
        </Badge>
      )}
    </div>
  );
}

export default function ChecklistsPage() {
  const params = useParams();
  const establishmentId = params.id as string;

  const { data: runs = [], isLoading } = useHaccpChecklistRuns(establishmentId);
  const { data: templates = [] } = useHaccpChecklists(establishmentId);

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 p-12">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>Chargement…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Checklists réalisées</h1>
          <p className="text-muted-foreground text-sm">
            {runs.length} passage{runs.length > 1 ? "s" : ""} enregistré{runs.length > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
          <Smartphone className="h-3.5 w-3.5" />
          Passages saisis via l&apos;app mobile
        </div>
      </div>

      {templates.length > 0 && <ChecklistCadence templates={templates} runs={runs} />}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Historique des passages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {runs.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">Aucun passage enregistré.</p>
          ) : (
            runs.map((run) => <RunRow key={run.id} run={run} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}
