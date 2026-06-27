// Calculs « main d'œuvre » pour le reporting RH. Couche app car réutilise l'expansion
// des shifts récurrents de planning-types (logique de récurrence partagée avec le planning).
//
// LIMITES DONNÉES (à connaître) :
// - Pas de pointage : on ne dispose que des heures PLANIFIÉES (shifts), pas du réalisé.
// - Pas de taux horaire stocké : le coût est ESTIMÉ depuis le salaire brut mensuel
//   (gross_salary / MONTHLY_HOURS), hors charges patronales.

import { addDays, format } from "date-fns";

import { expandShiftsForWeek } from "@/app/[locale]/(root)/(dashboard)/_components/establishments/planning-types";
import type { Absence } from "@/lib/queries/absences-queries";
import type { Employee } from "@/lib/queries/employees-queries";
import type { DbShift, DbShiftOverride } from "@/lib/queries/planning-queries";

// Base légale FR : 35 h/sem × 52 / 12 ≈ 151,67 h/mois.
export const MONTHLY_HOURS = 151.67;

const round2 = (n: number) => Math.round(n * 100) / 100;

// Liste des jours (Date) couvrant la période [fromISO, toISO] inclus.
function dayList(fromISO: string, toISO: string): Date[] {
  const start = new Date(fromISO);
  start.setHours(0, 0, 0, 0);
  const end = new Date(toISO);
  end.setHours(0, 0, 0, 0);
  const days: Date[] = [];
  let cur = start;
  while (cur <= end) {
    days.push(cur);
    cur = addDays(cur, 1);
  }
  return days;
}

export type LaborEmployeeRow = {
  employeeId: string;
  name: string;
  plannedHours: number;
  hourlyRate: number | null;
  laborCost: number | null;
  costKnown: boolean;
};

// Heures planifiées par employé sur la période + coût estimé (si salaire connu).
export function computeLaborByEmployee(
  shifts: DbShift[],
  overrides: DbShiftOverride[],
  employees: Employee[],
  fromISO: string,
  toISO: string,
): LaborEmployeeRow[] {
  const days = dayList(fromISO, toISO);
  if (days.length === 0) return [];
  const fromStr = format(days[0], "yyyy-MM-dd");
  const toStr = format(days[days.length - 1], "yyyy-MM-dd");

  const occurrences = expandShiftsForWeek(shifts, days, overrides);

  const hoursByEmployee = new Map<string, number>();
  for (const occ of occurrences) {
    if (occ.date < fromStr || occ.date > toStr) continue;
    const h = occ.endHour - occ.startHour;
    if (h <= 0) continue;
    hoursByEmployee.set(occ.employeeId, (hoursByEmployee.get(occ.employeeId) ?? 0) + h);
  }

  const empMap = new Map(employees.map((e) => [e.id, e]));

  return [...hoursByEmployee.entries()]
    .map(([employeeId, hours]) => {
      const emp = empMap.get(employeeId);
      const name = emp ? `${emp.lastname} ${emp.firstname}` : "—";
      const gross = emp?.gross_salary ?? null;
      const hourlyRate = gross != null ? round2(gross / MONTHLY_HOURS) : null;
      const plannedHours = round2(hours);
      const laborCost = hourlyRate != null ? round2(plannedHours * hourlyRate) : null;
      return {
        employeeId,
        name,
        plannedHours,
        hourlyRate,
        laborCost,
        costKnown: hourlyRate != null,
      };
    })
    .sort((a, b) => b.plannedHours - a.plannedHours);
}

export type AbsenceSummaryRow = { type: string; count: number; days: number };

// Jours d'absence chevauchant la période, par type, pour l'établissement.
export function computeAbsencesByType(
  absences: (Absence & { employee?: unknown })[],
  establishmentId: string,
  fromISO: string,
  toISO: string,
): AbsenceSummaryRow[] {
  const fromStr = fromISO.slice(0, 10);
  const toStr = toISO.slice(0, 10);
  const byType = new Map<string, { count: number; days: number }>();

  for (const a of absences) {
    if (a.establishment_id !== establishmentId) continue;
    const start = a.start_date > fromStr ? a.start_date : fromStr;
    const end = a.end_date < toStr ? a.end_date : toStr;
    if (start > end) continue; // pas de chevauchement
    const days = Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000) + 1;
    const type = a.type || "Autre";
    const entry = byType.get(type) ?? { count: 0, days: 0 };
    entry.count += 1;
    entry.days += days;
    byType.set(type, entry);
  }

  return [...byType.entries()]
    .map(([type, v]) => ({ type, count: v.count, days: v.days }))
    .sort((a, b) => b.days - a.days);
}
