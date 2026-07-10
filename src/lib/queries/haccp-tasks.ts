import { useMemo } from "react";

import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  isBefore,
  isWithinInterval,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";

import {
  type HaccpChecklistTemplate,
  type HaccpOilBath,
  type HaccpProbe,
  type HaccpSurface,
  type HaccpZone,
  useHaccpChecklists,
  useHaccpOilBaths,
  useHaccpProbes,
  useHaccpSurfaces,
  useHaccpZones,
} from "./haccp-config-queries";
import {
  type HaccpChecklistRun,
  type HaccpCleaningValidation,
  type HaccpOilTest,
  type HaccpTemperatureReading,
  formatTemperatureTarget,
  temperatureStatus,
  useHaccpChecklistRuns,
  useHaccpCleaningValidations,
  useHaccpOilTests,
  useHaccpTemperatureReadings,
} from "./haccp-registers-queries";

// ─── Modèle unifié des tâches HACCP dérivées des cadences ────────────────────────
export type Family = "nettoyage" | "temperature" | "huile" | "checklist";
export type Freq = "biquotidien" | "quotidien" | "hebdomadaire" | "mensuel" | "ponctuel";
export type TaskStatus = "ok" | "ko" | "partial" | "missed" | "todo";

export const FREQ_ORDER: Freq[] = ["biquotidien", "quotidien", "hebdomadaire", "mensuel", "ponctuel"];
export const WEEK_OPTS = { weekStartsOn: 1 as const };

export type HaccpTask = {
  id: string;
  family: Family;
  label: string;
  sub: string | null;
  frequency: Freq;
  expected: number;
  done: number;
  conform: boolean;
  lastAt: Date | null;
  lastDetail: string | null;
};

type Rec = { date: Date; conform: boolean; detail: string | null };
type Item = { id: string; label: string; sub: string | null; frequency: string };

export function periodFor(freq: Freq, ref: Date): { start: Date; end: Date; expected: number } {
  if (freq === "biquotidien") return { start: startOfDay(ref), end: endOfDay(ref), expected: 2 };
  if (freq === "quotidien") return { start: startOfDay(ref), end: endOfDay(ref), expected: 1 };
  if (freq === "hebdomadaire")
    return { start: startOfWeek(ref, WEEK_OPTS), end: endOfWeek(ref, WEEK_OPTS), expected: 1 };
  if (freq === "mensuel") return { start: startOfMonth(ref), end: endOfMonth(ref), expected: 1 };
  return { start: new Date(0), end: endOfDay(ref), expected: 1 }; // ponctuel
}

export function taskStatus(t: HaccpTask, ref: Date, now: Date): TaskStatus {
  if (t.done >= t.expected) return t.conform ? "ok" : "ko";
  if (t.done > 0) return "partial";
  const { end } = periodFor(t.frequency, ref);
  return isBefore(end, now) ? "missed" : "todo";
}

export const statusRank = (s: TaskStatus): number =>
  s === "missed" ? 0 : s === "ko" ? 1 : s === "todo" ? 2 : s === "partial" ? 3 : 4;

export function summarize(
  tasks: HaccpTask[],
  ref: Date,
  now: Date,
): { remaining: number; nonConform: number; done: number } {
  let remaining = 0;
  let nonConform = 0;
  let done = 0;
  for (const t of tasks) {
    const s = taskStatus(t, ref, now);
    if (s === "ok") done += 1;
    else if (s === "ko") nonConform += 1;
    else remaining += 1;
  }
  return { remaining, nonConform, done };
}

// ─── Construction des tâches à partir de la config + relevés ─────────────────────
function buildTasks(items: Item[], recs: Map<string, Rec[]>, family: Family, ref: Date): HaccpTask[] {
  const out: HaccpTask[] = [];
  for (const it of items) {
    const f = it.frequency as Freq;
    if (!FREQ_ORDER.includes(f)) continue;
    const { start, end, expected } = periodFor(f, ref);
    const inRange = (recs.get(it.id) ?? []).filter((r) => isWithinInterval(r.date, { start, end }));
    const last = inRange.at(-1) ?? null;
    out.push({
      id: `${family}:${it.id}`,
      family,
      label: it.label,
      sub: it.sub,
      frequency: f,
      expected,
      done: inRange.length,
      conform: inRange.every((r) => r.conform),
      lastAt: last?.date ?? null,
      lastDetail: last?.detail ?? null,
    });
  }
  return out;
}

function byKey<T>(rows: T[], key: (r: T) => string | null, rec: (r: T) => Rec): Map<string, Rec[]> {
  const map = new Map<string, Rec[]>();
  for (const r of [...rows].reverse()) {
    const k = key(r);
    if (!k) continue;
    const list = map.get(k) ?? [];
    list.push(rec(r));
    map.set(k, list);
  }
  return map;
}

export type HaccpTasksInput = {
  surfaces: HaccpSurface[];
  probes: HaccpProbe[];
  baths: HaccpOilBath[];
  templates: HaccpChecklistTemplate[];
  zones: HaccpZone[];
  validations: HaccpCleaningValidation[];
  readings: HaccpTemperatureReading[];
  oilTests: HaccpOilTest[];
  runs: HaccpChecklistRun[];
};

export function buildHaccpTasks(input: HaccpTasksInput, ref: Date): HaccpTask[] {
  const { surfaces, probes, baths, templates, zones, validations, readings, oilTests, runs } = input;
  const zoneName = (id: string | null) => (id ? (zones.find((z) => z.id === id)?.name ?? null) : null);

  const cleaningRecs = byKey(
    validations,
    (v) => v.surface_id,
    (v) => ({ date: new Date(v.validated_at), conform: true, detail: null }),
  );
  const probeById = new Map(probes.map((p) => [p.id, p]));
  const tempRecs = byKey(
    readings,
    (r) => r.probe_id,
    (r) => {
      const p = probeById.get(r.probe_id);
      const conform = p ? temperatureStatus(r.value_c, p.min_c, p.max_c) === "ok" : true;
      return { date: new Date(r.recorded_at), conform, detail: `${r.value_c} °C` };
    },
  );
  const oilRecs = byKey(
    oilTests,
    (t) => t.bath_id,
    (t) => ({
      date: new Date(t.tested_at),
      conform: t.conform,
      detail: t.polarity_pct != null ? `${t.polarity_pct} %` : null,
    }),
  );
  const runRecs = byKey(
    runs,
    (r) => r.template_id,
    (r) => {
      const checks = Array.isArray(r.checks) ? (r.checks as { checked?: boolean; ok?: boolean; done?: boolean }[]) : [];
      const total = checks.length;
      const ok = checks.filter((c) => Boolean(c.checked ?? c.ok ?? c.done)).length;
      return { date: new Date(r.run_at), conform: total > 0 && ok === total, detail: `${ok}/${total}` };
    },
  );

  const cleaningItems: Item[] = surfaces.map((s) => ({
    id: s.id,
    label: s.label,
    sub: zoneName(s.zone_id),
    frequency: s.frequency,
  }));
  const probeItems: Item[] = probes.map((p) => ({
    id: p.id,
    label: p.label,
    sub: formatTemperatureTarget(p.min_c, p.max_c),
    frequency: p.frequency,
  }));
  const bathItems: Item[] = baths.map((b) => ({
    id: b.id,
    label: b.label,
    sub: [b.oil_type, b.capacity_l != null ? `${b.capacity_l} L` : null].filter(Boolean).join(" · ") || null,
    frequency: b.frequency,
  }));
  const templateItems: Item[] = templates.map((t) => ({ id: t.id, label: t.title, sub: null, frequency: t.frequency }));

  return [
    ...buildTasks(cleaningItems, cleaningRecs, "nettoyage", ref),
    ...buildTasks(probeItems, tempRecs, "temperature", ref),
    ...buildTasks(bathItems, oilRecs, "huile", ref),
    ...buildTasks(templateItems, runRecs, "checklist", ref),
  ];
}

// ─── Hook : récupère config + relevés et calcule les tâches pour `ref` ───────────
export function useHaccpTasks(establishmentId: string, ref: Date): { tasks: HaccpTask[]; isLoading: boolean } {
  const { data: surfaces = [], isLoading: l1 } = useHaccpSurfaces(establishmentId);
  const { data: probes = [], isLoading: l2 } = useHaccpProbes(establishmentId);
  const { data: baths = [], isLoading: l3 } = useHaccpOilBaths(establishmentId);
  const { data: templates = [], isLoading: l4 } = useHaccpChecklists(establishmentId);
  const { data: zones = [] } = useHaccpZones(establishmentId);
  const { data: validations = [], isLoading: l5 } = useHaccpCleaningValidations(establishmentId);
  const { data: readings = [], isLoading: l6 } = useHaccpTemperatureReadings(establishmentId);
  const { data: oilTests = [], isLoading: l7 } = useHaccpOilTests(establishmentId);
  const { data: runs = [], isLoading: l8 } = useHaccpChecklistRuns(establishmentId);

  const refTime = ref.getTime();
  const tasks = useMemo(
    () =>
      buildHaccpTasks(
        { surfaces, probes, baths, templates, zones, validations, readings, oilTests, runs },
        new Date(refTime),
      ),
    [refTime, surfaces, probes, baths, templates, zones, validations, readings, oilTests, runs],
  );

  return { tasks, isLoading: l1 || l2 || l3 || l4 || l5 || l6 || l7 || l8 };
}
