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
import { type HaccpProbe, type HaccpZone } from "@/lib/queries/haccp-config-queries";
import {
  type HaccpTemperatureReading,
  formatTemperatureTarget,
  temperatureStatus,
} from "@/lib/queries/haccp-registers-queries";

// ok = fait + conforme · ko = fait + hors seuil · missed = passé non fait · todo = à faire · empty = à venir
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

type Reading = { date: Date; conform: boolean; value: number };
type Slot = { state: SlotState; value: number | null; date: Date | null };
type Column = { key: string; label: string; start: Date; end: Date; kind: "day" | "period" };
type ZoneGroup = { zone: string; probes: HaccpProbe[] };

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

function cellSlots(probe: HaccpProbe, col: Column, dates: Reading[], today: Date): Slot[] {
  const inRange = dates.filter((r) => isWithinInterval(r.date, { start: col.start, end: col.end }));
  if (col.kind === "day") {
    const e = expectedPerDay(probe.frequency);
    return Array.from({ length: e }, (_, i) => {
      const r = inRange.at(i);
      if (r) return { state: r.conform ? "ok" : "ko", value: r.value, date: r.date };
      return { state: dayMissing(col.start, today), value: null, date: null };
    });
  }
  const last = inRange.at(-1);
  if (last) return [{ state: inRange.every((r) => r.conform) ? "ok" : "ko", value: last.value, date: last.date }];
  return [{ state: periodMissing(col.start, col.end, today), value: null, date: null }];
}

function groupByZone(probes: HaccpProbe[], zoneName: (id: string | null) => string): ZoneGroup[] {
  const map = new Map<string, HaccpProbe[]>();
  for (const p of probes) {
    const z = zoneName(p.zone_id);
    const list = map.get(z) ?? [];
    list.push(p);
    map.set(z, list);
  }
  return [...map.entries()].map(([zone, list]) => ({ zone, probes: list }));
}

function TempTable({
  groups,
  columns,
  readingsByProbe,
  today,
  dense,
}: {
  groups: ZoneGroup[];
  columns: Column[];
  readingsByProbe: Map<string, Reading[]>;
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
            <th className="text-muted-foreground min-w-[140px] text-left text-xs font-medium">Équipement</th>
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
              {g.probes.map((p) => {
                const dates = readingsByProbe.get(p.id) ?? [];
                return (
                  <tr key={p.id}>
                    <td className="pr-2 align-top text-sm">
                      <div>{p.label}</div>
                      <div className="text-muted-foreground text-[10px]">
                        {formatTemperatureTarget(p.min_c, p.max_c)}
                      </div>
                    </td>
                    {columns.map((c) => {
                      const slots = cellSlots(p, c, dates, today);
                      return (
                        <td key={c.key} className="text-center align-top">
                          <div className="mx-auto flex justify-center gap-0.5">
                            {slots.map((slot, i) => (
                              <div
                                key={i}
                                title={
                                  slot.value != null && slot.date
                                    ? `${slot.value.toLocaleString("fr-FR")} °C — ${format(slot.date, "d MMM HH:mm", { locale: fr })}`
                                    : undefined
                                }
                                className={`flex items-center justify-center rounded ${slotClass(slot.state)} ${dense ? "h-4 w-4" : slots.length > 1 ? "h-7 min-w-9 px-0.5" : "h-7 w-full min-w-11 px-1"}`}
                              >
                                {!dense && slot.value != null && (
                                  <span className="text-[10px] leading-none font-semibold text-white">
                                    {slot.value.toLocaleString("fr-FR")}
                                  </span>
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
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ponctuelState(recs: Reading[]): { state: SlotState; label: string } {
  const last = recs.at(-1);
  if (!last) return { state: "todo", label: "À faire" };
  return {
    state: last.conform ? "ok" : "ko",
    label: `Fait — ${format(last.date, "d MMM yyyy", { locale: fr })} · ${last.value.toLocaleString("fr-FR")} °C`,
  };
}

function PonctuelBlock({ probes, readingsByProbe }: { probes: HaccpProbe[]; readingsByProbe: Map<string, Reading[]> }) {
  if (probes.length === 0) return null;
  return (
    <section className="space-y-2">
      <p className="text-sm font-semibold">Ponctuel</p>
      <div className="space-y-1.5">
        {probes.map((p) => {
          const { state, label } = ponctuelState(readingsByProbe.get(p.id) ?? []);
          return (
            <div key={p.id} className="flex items-center gap-3 text-sm">
              <span className="min-w-[140px]">{p.label}</span>
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

export function TemperatureCadence({
  probes,
  readings,
  zones,
}: {
  probes: HaccpProbe[];
  readings: HaccpTemperatureReading[];
  zones: HaccpZone[];
}) {
  const [view, setView] = useState<"week" | "month">("week");
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const today = startOfDay(new Date());

  const zoneName = (id: string | null) => (id ? (zones.find((z) => z.id === id)?.name ?? "—") : "Sans zone");
  const probeById = new Map(probes.map((p) => [p.id, p]));
  const readingsByProbe = new Map<string, Reading[]>();
  for (const r of [...readings].reverse()) {
    const p = probeById.get(r.probe_id);
    if (!p) continue;
    const conform = temperatureStatus(r.value_c, p.min_c, p.max_c) === "ok";
    const list = readingsByProbe.get(r.probe_id) ?? [];
    list.push({ date: new Date(r.recorded_at), conform, value: r.value_c });
    readingsByProbe.set(r.probe_id, list);
  }

  const daily = groupByZone(
    probes.filter((p) => p.frequency === "biquotidien" || p.frequency === "quotidien"),
    zoneName,
  );
  const weekly = groupByZone(
    probes.filter((p) => p.frequency === "hebdomadaire"),
    zoneName,
  );
  const monthly = groupByZone(
    probes.filter((p) => p.frequency === "mensuel"),
    zoneName,
  );

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
            <p className="text-muted-foreground text-sm">Aucun équipement quotidien/biquotidien.</p>
          ) : (
            <TempTable
              groups={daily}
              columns={isWeek ? dayColumns(weekStart, weekEnd, false) : dayColumns(monthStart, monthEnd, true)}
              readingsByProbe={readingsByProbe}
              today={today}
              dense={!isWeek}
            />
          )}
        </section>

        <section className="space-y-2">
          <p className="text-sm font-semibold">Hebdomadaire</p>
          {weekly.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucun équipement hebdomadaire.</p>
          ) : (
            <TempTable
              groups={weekly}
              columns={isWeek ? currentWeekColumn : weekColumns}
              readingsByProbe={readingsByProbe}
              today={today}
            />
          )}
        </section>

        <section className="space-y-2">
          <p className="text-sm font-semibold">Mensuel</p>
          {monthly.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucun équipement mensuel.</p>
          ) : (
            <TempTable groups={monthly} columns={monthColumn} readingsByProbe={readingsByProbe} today={today} />
          )}
        </section>

        <PonctuelBlock probes={probes.filter((p) => p.frequency === "ponctuel")} readingsByProbe={readingsByProbe} />

        <div className="text-muted-foreground flex flex-wrap gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-emerald-500" /> fait &amp; conforme
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-amber-500" /> fait mais hors seuil
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
          <span>· biquotidien = 2 cases (matin / soir)</span>
        </div>
      </CardContent>
    </Card>
  );
}
