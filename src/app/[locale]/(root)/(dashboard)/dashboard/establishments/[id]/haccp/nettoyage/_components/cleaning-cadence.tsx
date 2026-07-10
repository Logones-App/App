"use client";

import { Fragment, useState } from "react";

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
import type { HaccpSurface, HaccpZone } from "@/lib/queries/haccp-config-queries";
import type { HaccpCleaningValidation } from "@/lib/queries/haccp-registers-queries";

// ─── État d'une case ───────────────────────────────────────────────────────────
type CellState = "done" | "missed" | "todo" | "empty";

const cellClass = (s: CellState): string =>
  s === "done"
    ? "bg-emerald-500"
    : s === "missed"
      ? "bg-red-500"
      : s === "todo"
        ? "bg-muted-foreground/25"
        : "border border-dashed border-muted-foreground/30";

const WEEK_OPTS = { weekStartsOn: 1 as const };

/** Statut d'une tâche sur une période [start, end]. */
function rangeState(dates: Date[], start: Date, end: Date, today: Date): { state: CellState; doneAt: Date | null } {
  const inRange = dates.filter((d) => isWithinInterval(d, { start, end }));
  if (inRange.length > 0) return { state: "done", doneAt: inRange[inRange.length - 1] };
  if (isAfter(start, today)) return { state: "empty", doneAt: null };
  if (isWithinInterval(today, { start, end })) return { state: "todo", doneAt: null };
  return { state: "missed", doneAt: null };
}

type ZoneGroup = { zone: string; surfaces: HaccpSurface[] };

function groupByZone(surfaces: HaccpSurface[], zoneName: (id: string | null) => string): ZoneGroup[] {
  const map = new Map<string, HaccpSurface[]>();
  for (const s of surfaces) {
    const z = zoneName(s.zone_id);
    const list = map.get(z) ?? [];
    list.push(s);
    map.set(z, list);
  }
  return [...map.entries()].map(([zone, list]) => ({ zone, surfaces: list }));
}

type Column = { key: string; label: string; start: Date; end: Date };

// ─── Tableau générique (jours ou semaines en colonnes) ─────────────────────────
function CadenceTable({
  groups,
  columns,
  datesBySurface,
  today,
  dense,
}: {
  groups: ZoneGroup[];
  columns: Column[];
  datesBySurface: Map<string, Date[]>;
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
            <th className="text-muted-foreground min-w-[140px] text-left text-xs font-medium">Tâche</th>
            {columns.map((c) => (
              <th key={c.key} className="text-muted-foreground text-center text-[11px] font-medium whitespace-pre-line">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <Fragment key={g.zone}>
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="text-muted-foreground pt-2 text-xs font-semibold tracking-wide uppercase"
                >
                  {g.zone}
                </td>
              </tr>
              {g.surfaces.map((s) => {
                const dates = datesBySurface.get(s.id) ?? [];
                return (
                  <tr key={s.id}>
                    <td className="pr-2 text-sm">{s.label}</td>
                    {columns.map((c) => {
                      const { state, doneAt } = rangeState(dates, c.start, c.end, today);
                      const title = doneAt
                        ? `Fait le ${format(doneAt, "d MMM", { locale: fr })}`
                        : c.label.replace("\n", " ");
                      return (
                        <td key={c.key} className="text-center">
                          <div
                            title={title}
                            className={`mx-auto rounded ${dense ? "h-4 w-4" : "h-6 w-full min-w-8"} ${cellClass(state)}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Bloc mensuel : une case pleine largeur par tâche ──────────────────────────
function MonthlyBlock({
  groups,
  datesBySurface,
  monthStart,
  today,
}: {
  groups: ZoneGroup[];
  datesBySurface: Map<string, Date[]>;
  monthStart: Date;
  today: Date;
}) {
  const start = startOfMonth(monthStart);
  const end = endOfMonth(monthStart);
  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <div key={g.zone} className="space-y-1.5">
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{g.zone}</p>
          {g.surfaces.map((s) => {
            const { state, doneAt } = rangeState(datesBySurface.get(s.id) ?? [], start, end, today);
            const label =
              state === "done"
                ? `Fait — ${format(doneAt as Date, "d MMM", { locale: fr })}`
                : state === "missed"
                  ? "Non fait ce mois"
                  : state === "todo"
                    ? "À faire ce mois"
                    : "—";
            return (
              <div key={s.id} className="flex items-center gap-3 text-sm">
                <span className="min-w-[140px]">{s.label}</span>
                <div
                  className={`flex h-6 flex-1 items-center rounded px-2 text-xs font-medium ${cellClass(state)} ${state === "done" || state === "missed" ? "text-white" : ""}`}
                >
                  {label}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Composant principal ───────────────────────────────────────────────────────
export function CleaningCadence({
  surfaces,
  validations,
  zones,
}: {
  surfaces: HaccpSurface[];
  validations: HaccpCleaningValidation[];
  zones: HaccpZone[];
}) {
  const [view, setView] = useState<"week" | "month">("week");
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const today = startOfDay(new Date());

  const zoneName = (id: string | null) => (id ? (zones.find((z) => z.id === id)?.name ?? "—") : "Sans zone");
  const datesBySurface = new Map<string, Date[]>();
  for (const v of [...validations].reverse()) {
    const d = new Date(v.validated_at);
    const list = datesBySurface.get(v.surface_id) ?? [];
    list.push(d);
    datesBySurface.set(v.surface_id, list);
  }

  const daily = groupByZone(
    surfaces.filter((s) => s.frequency === "quotidien"),
    zoneName,
  );
  const weekly = groupByZone(
    surfaces.filter((s) => s.frequency === "hebdomadaire"),
    zoneName,
  );
  const monthly = groupByZone(
    surfaces.filter((s) => s.frequency === "mensuel"),
    zoneName,
  );

  const weekStart = startOfWeek(anchor, WEEK_OPTS);
  const monthStart = startOfMonth(anchor);

  const dayColumns = (start: Date, end: Date, denseLabel: boolean): Column[] =>
    eachDayOfInterval({ start, end }).map((d) => ({
      key: d.toISOString(),
      label: denseLabel ? format(d, "d") : `${format(d, "EEE", { locale: fr })}\n${format(d, "d")}`,
      start: startOfDay(d),
      end: endOfDay(d),
    }));

  const weekColumns = eachWeekOfInterval({ start: startOfMonth(anchor), end: endOfMonth(anchor) }, WEEK_OPTS).map(
    (w, i) => ({
      key: w.toISOString(),
      label: `S${i + 1}`,
      start: startOfWeek(w, WEEK_OPTS),
      end: endOfWeek(w, WEEK_OPTS),
    }),
  );

  const isWeek = view === "week";
  const periodLabel = isWeek
    ? `${format(weekStart, "d", { locale: fr })}–${format(endOfWeek(weekStart, WEEK_OPTS), "d MMM", { locale: fr })}`
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
        {/* Quotidien */}
        <section className="space-y-2">
          <p className="text-sm font-semibold">Quotidien</p>
          {daily.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucune tâche quotidienne.</p>
          ) : isWeek ? (
            <CadenceTable
              groups={daily}
              columns={dayColumns(weekStart, endOfWeek(weekStart, WEEK_OPTS), false)}
              datesBySurface={datesBySurface}
              today={today}
            />
          ) : (
            <CadenceTable
              groups={daily}
              columns={dayColumns(startOfMonth(anchor), endOfMonth(anchor), true)}
              datesBySurface={datesBySurface}
              today={today}
              dense
            />
          )}
        </section>

        {/* Hebdomadaire */}
        <section className="space-y-2">
          <p className="text-sm font-semibold">Hebdomadaire</p>
          {weekly.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucune tâche hebdomadaire.</p>
          ) : (
            <CadenceTable
              groups={weekly}
              columns={
                isWeek
                  ? [
                      {
                        key: "w",
                        label: "Semaine",
                        start: weekStart,
                        end: endOfWeek(weekStart, WEEK_OPTS),
                      },
                    ]
                  : weekColumns
              }
              datesBySurface={datesBySurface}
              today={today}
            />
          )}
        </section>

        {/* Mensuel */}
        <section className="space-y-2">
          <p className="text-sm font-semibold">Mensuel</p>
          {monthly.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucune tâche mensuelle.</p>
          ) : (
            <MonthlyBlock groups={monthly} datesBySurface={datesBySurface} monthStart={monthStart} today={today} />
          )}
        </section>

        <div className="text-muted-foreground flex flex-wrap gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-emerald-500" /> fait
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-red-500" /> passé non fait
          </span>
          <span className="flex items-center gap-1">
            <span className="bg-muted-foreground/25 h-3 w-3 rounded" /> en cours, à faire
          </span>
          <span className="flex items-center gap-1">
            <span className="border-muted-foreground/30 h-3 w-3 rounded border border-dashed" /> à venir
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
