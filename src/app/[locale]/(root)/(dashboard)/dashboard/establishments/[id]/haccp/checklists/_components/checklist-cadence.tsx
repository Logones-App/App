"use client";

import { useState } from "react";

import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  eachWeekOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isSameDay,
  isWithinInterval,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type HaccpChecklistTemplate } from "@/lib/queries/haccp-config-queries";
import { type HaccpChecklistRun } from "@/lib/queries/haccp-registers-queries";

// ok = fait complet · ko = fait incomplet · missed = passé non fait · todo = à faire · empty = à venir
type SlotState = "ok" | "ko" | "missed" | "todo" | "empty";

const slotClass = (s: SlotState): string =>
  s === "ok"
    ? "bg-emerald-500"
    : s === "ko"
      ? "bg-amber-500"
      : s === "missed"
        ? "bg-red-500"
        : s === "todo"
          ? "bg-muted-foreground/25"
          : "border border-dashed border-muted-foreground/30";

const WEEK_OPTS = { weekStartsOn: 1 as const };
const expectedPerDay = (f: string): number => (f === "biquotidien" ? 2 : 1);

type Check = { checked?: boolean; ok?: boolean; done?: boolean };
type Run = { date: Date; complete: boolean; label: string };
type Slot = { state: SlotState; label: string | null; date: Date | null };
type Column = { key: string; label: string; start: Date; end: Date; kind: "day" | "period" };

function checkStats(checks: HaccpChecklistRun["checks"]): { done: number; total: number } {
  if (!Array.isArray(checks)) return { done: 0, total: 0 };
  const arr = checks as Check[];
  const done = arr.filter((c) => Boolean(c.checked ?? c.ok ?? c.done)).length;
  return { done, total: arr.length };
}

function dayMissing(day: Date, today: Date): SlotState {
  if (isAfter(day, today)) return "empty";
  if (isSameDay(day, today)) return "todo";
  return "missed";
}

function periodMissing(start: Date, end: Date, today: Date): SlotState {
  if (isAfter(start, today)) return "empty";
  if (isWithinInterval(today, { start, end })) return "todo";
  return "missed";
}

function cellSlots(tpl: HaccpChecklistTemplate, col: Column, runs: Run[], today: Date): Slot[] {
  const inRange = runs.filter((r) => isWithinInterval(r.date, { start: col.start, end: col.end }));
  if (col.kind === "day") {
    const e = expectedPerDay(tpl.frequency);
    return Array.from({ length: e }, (_, i) => {
      const r = inRange.at(i);
      if (r) return { state: r.complete ? "ok" : "ko", label: r.label, date: r.date };
      return { state: dayMissing(col.start, today), label: null, date: null };
    });
  }
  const last = inRange.at(-1);
  if (last) return [{ state: inRange.every((r) => r.complete) ? "ok" : "ko", label: last.label, date: last.date }];
  return [{ state: periodMissing(col.start, col.end, today), label: null, date: null }];
}

function ChecklistTable({
  templates,
  columns,
  runsByTemplate,
  today,
  dense,
}: {
  templates: HaccpChecklistTemplate[];
  columns: Column[];
  runsByTemplate: Map<string, Run[]>;
  today: Date;
  dense?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table
        className={`border-separate ${dense ? "border-spacing-1" : "border-spacing-x-2.5 border-spacing-y-1"} text-sm`}
      >
        <thead>
          <tr>
            <th className="text-muted-foreground min-w-[160px] text-left text-xs font-medium">Checklist</th>
            {columns.map((c) => (
              <th key={c.key} className="text-muted-foreground text-center text-[11px] font-medium whitespace-pre-line">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {templates.map((tpl) => {
            const runs = runsByTemplate.get(tpl.id) ?? [];
            return (
              <tr key={tpl.id}>
                <td className="pr-2 align-top text-sm">
                  <div>{tpl.title}</div>
                  {tpl.frequency_label && (
                    <div className="text-muted-foreground text-[10px]">{tpl.frequency_label}</div>
                  )}
                </td>
                {columns.map((c) => {
                  const slots = cellSlots(tpl, c, runs, today);
                  return (
                    <td key={c.key} className="text-center align-top">
                      <div className="mx-auto flex justify-center gap-0.5">
                        {slots.map((slot, i) => (
                          <div
                            key={i}
                            title={
                              slot.date
                                ? `${slot.label ? `${slot.label} — ` : ""}${format(slot.date, "d MMM HH:mm", { locale: fr })}`
                                : undefined
                            }
                            className={`flex items-center justify-center rounded ${slotClass(slot.state)} ${dense ? "h-4 w-4" : slots.length > 1 ? "h-7 min-w-9 px-0.5" : "h-7 w-full min-w-11 px-1"}`}
                          >
                            {!dense && slot.label && (
                              <span className="text-[10px] leading-none font-semibold text-white">{slot.label}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ponctuelState(recs: Run[]): { state: SlotState; label: string } {
  const last = recs.at(-1);
  if (!last) return { state: "todo", label: "À faire" };
  return {
    state: last.complete ? "ok" : "ko",
    label: `Fait — ${format(last.date, "d MMM yyyy", { locale: fr })} · ${last.label}`,
  };
}

function PonctuelBlock({
  templates,
  runsByTemplate,
}: {
  templates: HaccpChecklistTemplate[];
  runsByTemplate: Map<string, Run[]>;
}) {
  if (templates.length === 0) return null;
  return (
    <section className="space-y-2">
      <p className="text-sm font-semibold">Ponctuel</p>
      <div className="space-y-1.5">
        {templates.map((t) => {
          const { state, label } = ponctuelState(runsByTemplate.get(t.id) ?? []);
          return (
            <div key={t.id} className="flex items-center gap-3 text-sm">
              <span className="min-w-[160px]">{t.title}</span>
              <div
                className={`flex h-6 flex-1 items-center rounded px-2 text-xs font-medium ${slotClass(state)} ${state === "ok" || state === "ko" ? "text-white" : ""}`}
              >
                {label}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function ChecklistCadence({
  templates,
  runs,
}: {
  templates: HaccpChecklistTemplate[];
  runs: HaccpChecklistRun[];
}) {
  const [view, setView] = useState<"week" | "month">("week");
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const today = startOfDay(new Date());

  const runsByTemplate = new Map<string, Run[]>();
  for (const r of [...runs].reverse()) {
    if (!r.template_id) continue;
    const { done, total } = checkStats(r.checks);
    const list = runsByTemplate.get(r.template_id) ?? [];
    list.push({
      date: new Date(r.run_at),
      complete: total > 0 && done === total,
      label: total > 0 ? `${done}/${total}` : "✓",
    });
    runsByTemplate.set(r.template_id, list);
  }

  const daily = templates.filter((t) => t.frequency === "biquotidien" || t.frequency === "quotidien");
  const weekly = templates.filter((t) => t.frequency === "hebdomadaire");
  const monthly = templates.filter((t) => t.frequency === "mensuel");

  const isWeek = view === "week";
  const weekStart = startOfWeek(anchor, WEEK_OPTS);
  const weekEnd = endOfWeek(weekStart, WEEK_OPTS);
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);

  const dayColumns = (start: Date, end: Date, denseLabel: boolean): Column[] =>
    eachDayOfInterval({ start, end }).map((d) => ({
      key: d.toISOString(),
      label: denseLabel ? format(d, "d") : `${format(d, "EEE", { locale: fr })}\n${format(d, "d")}`,
      start: startOfDay(d),
      end: endOfDay(d),
      kind: "day" as const,
    }));

  const weekColumns: Column[] = eachWeekOfInterval({ start: monthStart, end: monthEnd }, WEEK_OPTS).map((w, i) => ({
    key: w.toISOString(),
    label: `S${i + 1}`,
    start: startOfWeek(w, WEEK_OPTS),
    end: endOfWeek(w, WEEK_OPTS),
    kind: "period" as const,
  }));
  const monthColumn: Column[] = [{ key: "m", label: "Mois", start: monthStart, end: monthEnd, kind: "period" }];
  const currentWeekColumn: Column[] = [{ key: "w", label: "Semaine", start: weekStart, end: weekEnd, kind: "period" }];

  const periodLabel = isWeek
    ? `${format(weekStart, "d", { locale: fr })}–${format(weekEnd, "d MMM", { locale: fr })}`
    : format(monthStart, "MMMM yyyy", { locale: fr });
  const go = (dir: -1 | 1) =>
    setAnchor((a) =>
      isWeek ? (dir === 1 ? addWeeks(a, 1) : subWeeks(a, 1)) : dir === 1 ? addMonths(a, 1) : subMonths(a, 1),
    );

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1">
          <Button size="icon" variant="outline" onClick={() => go(-1)} aria-label="Précédent">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="min-w-[140px] text-center text-sm font-medium capitalize">{periodLabel}</CardTitle>
          <Button size="icon" variant="outline" onClick={() => go(1)} aria-label="Suivant">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setAnchor(today)}>
            {isWeek ? "Cette semaine" : "Ce mois"}
          </Button>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant={isWeek ? "default" : "outline"} onClick={() => setView("week")}>
            Semaine
          </Button>
          <Button size="sm" variant={!isWeek ? "default" : "outline"} onClick={() => setView("month")}>
            Mois
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-2">
          <p className="text-sm font-semibold">Quotidien &amp; biquotidien</p>
          {daily.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucune checklist quotidienne.</p>
          ) : (
            <ChecklistTable
              templates={daily}
              columns={isWeek ? dayColumns(weekStart, weekEnd, false) : dayColumns(monthStart, monthEnd, true)}
              runsByTemplate={runsByTemplate}
              today={today}
              dense={!isWeek}
            />
          )}
        </section>

        <section className="space-y-2">
          <p className="text-sm font-semibold">Hebdomadaire</p>
          {weekly.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucune checklist hebdomadaire.</p>
          ) : (
            <ChecklistTable
              templates={weekly}
              columns={isWeek ? currentWeekColumn : weekColumns}
              runsByTemplate={runsByTemplate}
              today={today}
            />
          )}
        </section>

        <section className="space-y-2">
          <p className="text-sm font-semibold">Mensuel</p>
          {monthly.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucune checklist mensuelle.</p>
          ) : (
            <ChecklistTable templates={monthly} columns={monthColumn} runsByTemplate={runsByTemplate} today={today} />
          )}
        </section>

        <PonctuelBlock
          templates={templates.filter((t) => t.frequency === "ponctuel")}
          runsByTemplate={runsByTemplate}
        />

        <div className="text-muted-foreground flex flex-wrap gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-emerald-500" /> fait (complet)
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-amber-500" /> fait mais incomplet
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-red-500" /> passé non fait
          </span>
          <span className="flex items-center gap-1">
            <span className="bg-muted-foreground/25 h-3 w-3 rounded" /> à faire
          </span>
          <span className="flex items-center gap-1">
            <span className="border-muted-foreground/30 h-3 w-3 rounded border border-dashed" /> à venir
          </span>
          <span>· valeur = points cochés / total</span>
        </div>
      </CardContent>
    </Card>
  );
}
