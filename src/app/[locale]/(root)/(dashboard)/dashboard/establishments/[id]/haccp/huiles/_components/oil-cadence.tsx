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
import { type HaccpOilBath, type HaccpZone } from "@/lib/queries/haccp-config-queries";
import { type HaccpOilTest } from "@/lib/queries/haccp-registers-queries";

// ok = fait + conforme · ko = fait mais non conforme · missed = passé non fait · todo = à faire · empty = à venir
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

type Test = { date: Date; conform: boolean; value: number | null };
type Slot = { state: SlotState; value: number | null; date: Date | null };
type Column = { key: string; label: string; start: Date; end: Date; kind: "day" | "period" };
type ZoneGroup = { zone: string; baths: HaccpOilBath[] };

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

function cellSlots(bath: HaccpOilBath, col: Column, tests: Test[], today: Date): Slot[] {
  const inRange = tests.filter((t) => isWithinInterval(t.date, { start: col.start, end: col.end }));
  if (col.kind === "day") {
    const e = expectedPerDay(bath.frequency);
    return Array.from({ length: e }, (_, i) => {
      const t = inRange.at(i);
      if (t) return { state: t.conform ? "ok" : "ko", value: t.value, date: t.date };
      return { state: dayMissing(col.start, today), value: null, date: null };
    });
  }
  const last = inRange.at(-1);
  if (last) return [{ state: inRange.every((t) => t.conform) ? "ok" : "ko", value: last.value, date: last.date }];
  return [{ state: periodMissing(col.start, col.end, today), value: null, date: null }];
}

function groupByZone(baths: HaccpOilBath[], zoneName: (id: string | null) => string): ZoneGroup[] {
  const map = new Map<string, HaccpOilBath[]>();
  for (const b of baths) {
    const z = zoneName(b.zone_id);
    const list = map.get(z) ?? [];
    list.push(b);
    map.set(z, list);
  }
  return [...map.entries()].map(([zone, list]) => ({ zone, baths: list }));
}

function bathSubLabel(b: HaccpOilBath): string {
  return [b.oil_type, b.capacity_l != null ? `${b.capacity_l} L` : null].filter(Boolean).join(" · ");
}

function OilTable({
  groups,
  columns,
  testsByBath,
  today,
  dense,
}: {
  groups: ZoneGroup[];
  columns: Column[];
  testsByBath: Map<string, Test[]>;
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
            <th className="text-muted-foreground min-w-[140px] text-left text-xs font-medium">Bain</th>
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
              {g.baths.map((b) => {
                const tests = testsByBath.get(b.id) ?? [];
                const sub = bathSubLabel(b);
                return (
                  <tr key={b.id}>
                    <td className="pr-2 align-top text-sm">
                      <div>{b.label}</div>
                      {sub && <div className="text-muted-foreground text-[10px]">{sub}</div>}
                    </td>
                    {columns.map((c) => {
                      const slots = cellSlots(b, c, tests, today);
                      return (
                        <td key={c.key} className="text-center align-top">
                          <div className="mx-auto flex justify-center gap-0.5">
                            {slots.map((slot, i) => (
                              <div
                                key={i}
                                title={
                                  slot.date
                                    ? `${slot.value != null ? `${slot.value.toLocaleString("fr-FR")} % — ` : ""}${format(slot.date, "d MMM HH:mm", { locale: fr })}`
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

function ponctuelState(recs: Test[]): { state: SlotState; label: string } {
  const last = recs.at(-1);
  if (!last) return { state: "todo", label: "À faire" };
  return {
    state: last.conform ? "ok" : "ko",
    label: `Fait — ${format(last.date, "d MMM yyyy", { locale: fr })}${last.value != null ? ` · ${last.value.toLocaleString("fr-FR")} %` : ""}`,
  };
}

function PonctuelBlock({ baths, testsByBath }: { baths: HaccpOilBath[]; testsByBath: Map<string, Test[]> }) {
  if (baths.length === 0) return null;
  return (
    <section className="space-y-2">
      <p className="text-sm font-semibold">Ponctuel</p>
      <div className="space-y-1.5">
        {baths.map((b) => {
          const { state, label } = ponctuelState(testsByBath.get(b.id) ?? []);
          return (
            <div key={b.id} className="flex items-center gap-3 text-sm">
              <span className="min-w-[140px]">{b.label}</span>
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

export function OilCadence({
  baths,
  tests,
  zones,
}: {
  baths: HaccpOilBath[];
  tests: HaccpOilTest[];
  zones: HaccpZone[];
}) {
  const [view, setView] = useState<"week" | "month">("week");
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const today = startOfDay(new Date());

  const zoneName = (id: string | null) => (id ? (zones.find((z) => z.id === id)?.name ?? "—") : "Sans zone");
  const testsByBath = new Map<string, Test[]>();
  for (const t of [...tests].reverse()) {
    if (!t.bath_id) continue;
    const list = testsByBath.get(t.bath_id) ?? [];
    list.push({ date: new Date(t.tested_at), conform: t.conform, value: t.polarity_pct });
    testsByBath.set(t.bath_id, list);
  }

  const daily = groupByZone(
    baths.filter((b) => b.frequency === "biquotidien" || b.frequency === "quotidien"),
    zoneName,
  );
  const weekly = groupByZone(
    baths.filter((b) => b.frequency === "hebdomadaire"),
    zoneName,
  );
  const monthly = groupByZone(
    baths.filter((b) => b.frequency === "mensuel"),
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
            <p className="text-muted-foreground text-sm">Aucun bain quotidien/biquotidien.</p>
          ) : (
            <OilTable
              groups={daily}
              columns={isWeek ? dayColumns(weekStart, weekEnd, false) : dayColumns(monthStart, monthEnd, true)}
              testsByBath={testsByBath}
              today={today}
              dense={!isWeek}
            />
          )}
        </section>

        <section className="space-y-2">
          <p className="text-sm font-semibold">Hebdomadaire</p>
          {weekly.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucun bain hebdomadaire.</p>
          ) : (
            <OilTable
              groups={weekly}
              columns={isWeek ? currentWeekColumn : weekColumns}
              testsByBath={testsByBath}
              today={today}
            />
          )}
        </section>

        <section className="space-y-2">
          <p className="text-sm font-semibold">Mensuel</p>
          {monthly.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucun bain mensuel.</p>
          ) : (
            <OilTable groups={monthly} columns={monthColumn} testsByBath={testsByBath} today={today} />
          )}
        </section>

        <PonctuelBlock baths={baths.filter((b) => b.frequency === "ponctuel")} testsByBath={testsByBath} />

        <div className="text-muted-foreground flex flex-wrap gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-emerald-500" /> fait &amp; conforme
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-amber-500" /> fait mais non conforme
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
          <span>· valeur = polarité %</span>
        </div>
      </CardContent>
    </Card>
  );
}
