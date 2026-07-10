"use client";

import { useState } from "react";

import { addDays, endOfDay, format, isWithinInterval, startOfDay, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Loader2, Smartphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FREQ_ORDER,
  type Family,
  type Freq,
  type HaccpTask,
  type TaskStatus,
  statusRank,
  summarize,
  taskStatus,
  useHaccpTasks,
} from "@/lib/queries/haccp-tasks";

const FAMILY_LABEL: Record<Family, string> = {
  nettoyage: "Nettoyage",
  temperature: "Température",
  huile: "Huile",
  checklist: "Checklist",
};

const familyBadgeClass = (f: Family): string =>
  f === "nettoyage"
    ? "border-sky-300 text-sky-700 dark:border-sky-800 dark:text-sky-300"
    : f === "temperature"
      ? "border-indigo-300 text-indigo-700 dark:border-indigo-800 dark:text-indigo-300"
      : f === "huile"
        ? "border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300"
        : "border-violet-300 text-violet-700 dark:border-violet-800 dark:text-violet-300";

const freqBucketLabel = (f: Freq): string =>
  f === "biquotidien"
    ? "2× / jour — aujourd'hui"
    : f === "quotidien"
      ? "Quotidien — aujourd'hui"
      : f === "hebdomadaire"
        ? "Hebdomadaire — cette semaine"
        : f === "mensuel"
          ? "Mensuel — ce mois"
          : "Ponctuel";

// ─── Chip de statut ─────────────────────────────────────────────────────────────
function StatusChip({ status, task }: { status: TaskStatus; task: HaccpTask }) {
  const doneInfo =
    task.lastAt != null
      ? `${format(task.lastAt, "d MMM HH:mm", { locale: fr })}${task.lastDetail ? ` · ${task.lastDetail}` : ""}`
      : "";
  const s =
    status === "ok"
      ? { text: `Fait · ${doneInfo}`, cls: "bg-emerald-500 text-white" }
      : status === "ko"
        ? { text: `Non conforme · ${doneInfo}`, cls: "bg-red-500 text-white" }
        : status === "partial"
          ? { text: `${task.done}/${task.expected}`, cls: "bg-amber-500 text-white" }
          : status === "missed"
            ? { text: "Non fait", cls: "bg-red-500 text-white" }
            : { text: "À faire", cls: "bg-muted-foreground/20 text-foreground" };
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${s.cls}`}>{s.text}</span>;
}

function TaskRow({ task, status }: { task: HaccpTask; status: TaskStatus }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b py-2 text-sm last:border-b-0">
      <div className="flex min-w-0 items-center gap-2.5">
        <Badge variant="outline" className={`shrink-0 text-[10px] ${familyBadgeClass(task.family)}`}>
          {FAMILY_LABEL[task.family]}
        </Badge>
        <div className="min-w-0">
          <p className="truncate font-medium">{task.label}</p>
          {task.sub && <p className="text-muted-foreground truncate text-xs">{task.sub}</p>}
        </div>
      </div>
      <StatusChip status={status} task={task} />
    </div>
  );
}

function Bucket({ freq, tasks, ref, now }: { freq: Freq; tasks: HaccpTask[]; ref: Date; now: Date }) {
  if (tasks.length === 0) return null;
  const rows = tasks
    .map((t) => ({ t, s: taskStatus(t, ref, now) }))
    .sort((a, b) => statusRank(a.s) - statusRank(b.s) || a.t.label.localeCompare(b.t.label));
  const remaining = rows.filter((r) => r.s === "todo" || r.s === "missed" || r.s === "partial").length;
  return (
    <section className="space-y-1.5">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold">{freqBucketLabel(freq)}</p>
        {remaining > 0 && (
          <Badge variant="secondary" className="text-[10px]">
            {remaining} à faire
          </Badge>
        )}
      </div>
      <div className="rounded-lg border px-3">
        {rows.map(({ t, s }) => (
          <TaskRow key={t.id} task={t} status={s} />
        ))}
      </div>
    </section>
  );
}

// ─── Tuiles de synthèse ─────────────────────────────────────────────────────────
function SummaryTiles({ tasks, ref, now }: { tasks: HaccpTask[]; ref: Date; now: Date }) {
  const { remaining, nonConform, done } = summarize(tasks, ref, now);
  const tiles = [
    { label: "À faire / en retard", value: remaining, cls: "text-amber-600" },
    { label: "Non conformes", value: nonConform, cls: "text-red-600" },
    { label: "Faites & conformes", value: done, cls: "text-emerald-600" },
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {tiles.map((t) => (
        <Card key={t.label}>
          <CardContent className="p-4">
            <p className={`text-2xl font-bold ${t.cls}`}>{t.value}</p>
            <p className="text-muted-foreground text-xs">{t.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Composant principal ───────────────────────────────────────────────────────
export function TasksToday({ establishmentId }: { establishmentId: string }) {
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const now = new Date();
  const ref = anchor;
  const isToday = isWithinInterval(now, { start: startOfDay(ref), end: endOfDay(ref) });
  const { tasks, isLoading } = useHaccpTasks(establishmentId, ref);

  const go = (dir: -1 | 1) => setAnchor((a) => (dir === 1 ? addDays(a, 1) : subDays(a, 1)));

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tâches HACCP</h1>
          <p className="text-muted-foreground text-sm capitalize">
            {format(ref, "EEEE d MMMM yyyy", { locale: fr })}
            {isToday ? " · aujourd'hui" : ""}
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
          <Smartphone className="h-3.5 w-3.5" />
          Saisie via l&apos;app mobile
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button size="icon" variant="outline" onClick={() => go(-1)} aria-label="Jour précédent">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="outline" onClick={() => go(1)} aria-label="Jour suivant">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setAnchor(startOfDay(new Date()))}>
          Aujourd&apos;hui
        </Button>
      </div>

      {tasks.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Aucune tâche configurée</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Configurez des surfaces, sondes, bains ou checklists pour voir apparaître les tâches ici.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <SummaryTiles tasks={tasks} ref={ref} now={now} />
          <div className="space-y-5">
            {FREQ_ORDER.map((f) => (
              <Bucket key={f} freq={f} tasks={tasks.filter((t) => t.frequency === f)} ref={ref} now={now} />
            ))}
          </div>
          <div className="text-muted-foreground flex flex-wrap gap-3 text-xs">
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded bg-emerald-500" /> fait &amp; conforme
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded bg-red-500" /> non conforme / non fait
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded bg-amber-500" /> partiel
            </span>
            <span className="flex items-center gap-1">
              <span className="bg-muted-foreground/20 h-3 w-3 rounded" /> à faire
            </span>
          </div>
        </>
      )}
    </div>
  );
}
