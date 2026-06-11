import { addDays, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Employee = {
  id: string;
  name: string;
  role: string;
  color: string;
};

export type RecurrenceEditMode = "single" | "following" | "all";
export type ViewMode = "employees" | "coverage" | "capacity" | "day" | "month";

export type Shift = {
  id: string;
  dbId?: string;
  isOverride?: boolean; // occurrence issue de employee_shift_overrides
  parentShiftId?: string; // parent recurring shift pour les overrides
  employeeId: string;
  date: string; // YYYY-MM-DD (occurrence réelle)
  startHour: number;
  endHour: number;
  label: string;
  isRecurring?: boolean;
  recurrenceDays?: number[] | null;
  dateStart?: string;
  dateEnd?: string | null;
};

// Payload émis par ShiftCreateModal vers planning-schedule
export type CreateShiftPayload = {
  employeeId: string;
  label?: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  overnight: boolean;
  isRecurring: boolean;
  recurrenceDays: number[] | null;
  dateStart: string;
  dateEnd: string | null;
  templateId: string | null;
};

// Payload émis par ShiftEditModal vers planning-schedule
export type UpdateShiftPayload = {
  dbId: string;
  isOverride?: boolean;
  employeeId?: string;
  label?: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  overnight: boolean;
  isRecurring: boolean;
  recurrenceDays: number[] | null;
  dateStart: string;
  dateEnd: string | null;
  recurrenceMode?: RecurrenceEditMode; // "single" | "following" | "all"
  occurrenceDate?: string; // date spécifique de l'occurrence éditée
};

type ShiftPattern = [dayOffset: number, startHour: number, endHour: number, label: string];

// ─── Constantes ───────────────────────────────────────────────────────────────

export const HOUR_START = 0;
export const HOUR_END = 24;
export const CELL_HEIGHT_COMFORTABLE = 160;
export const CELL_HEIGHT_COMPACT = 80;
export const CELL_HEIGHT_COVERAGE = 480; // 20px/heure sur 24h
export const TIME_MARKERS = [0, 4, 8, 12, 16, 20];

// ─── Palette couleurs auto ────────────────────────────────────────────────────

const EMPLOYEE_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
  "#84cc16",
  "#06b6d4",
  "#d946ef",
  "#0ea5e9",
  "#22c55e",
  "#eab308",
];

export function getEmployeeColor(index: number): string {
  return EMPLOYEE_COLORS[index % EMPLOYEE_COLORS.length] ?? "#6b7280";
}

// ─── Mock data (fallback développement) ──────────────────────────────────────

export const MOCK_EMPLOYEES: Employee[] = [
  { id: "e1", name: "Alice Martin", role: "Serveuse", color: "#3b82f6" },
  { id: "e2", name: "Bob Dupont", role: "Cuisinier", color: "#10b981" },
  { id: "e3", name: "Charlie Morel", role: "Barman", color: "#f59e0b" },
  { id: "e4", name: "Diana Petit", role: "Manager", color: "#ef4444" },
  { id: "e5", name: "Eric Bernard", role: "Serveur", color: "#8b5cf6" },
  { id: "e6", name: "Sophie Laurent", role: "Serveuse", color: "#ec4899" },
  { id: "e7", name: "Marc Bonnet", role: "Cuisinier", color: "#14b8a6" },
  { id: "e8", name: "Julie Blanc", role: "Barman", color: "#f97316" },
  { id: "e9", name: "Thomas Noël", role: "Serveur", color: "#6366f1" },
  { id: "e10", name: "Emma Girard", role: "Serveuse", color: "#84cc16" },
];

// e1-e5 : patterns variés — e6-e10 : tous lundi 10h-17h pour tester la vue couverture à 10
const SHIFT_PATTERNS: ShiftPattern[][] = [
  [
    [0, 9, 13, "Service midi"],
    [0, 18, 22, "Service soir"],
    [2, 10, 18, "Journée"],
    [4, 9, 15, "Ouverture"],
    [5, 10, 18, "Service soir"],
  ],
  [
    [1, 8, 16, "Ouverture"],
    [2, 8, 13, "Midi"],
    [2, 14, 18, "Après-midi"],
    [3, 14, 22, "Fermeture"],
    [5, 9, 17, "Service midi"],
  ],
  [
    [0, 10, 18, "Service soir"],
    [1, 9, 17, "Service midi"],
    [3, 10, 18, "Service soir"],
    [4, 9, 17, "Service midi"],
  ],
  [
    [0, 8, 16, "Ouverture"],
    [1, 14, 22, "Fermeture"],
    [2, 9, 17, "Service midi"],
    [4, 10, 18, "Service soir"],
    [5, 9, 17, "Service midi"],
  ],
  [
    [2, 11, 19, "Journée"],
    [3, 9, 17, "Service midi"],
    [4, 14, 22, "Fermeture"],
    [5, 10, 18, "Service soir"],
    [6, 9, 17, "Service midi"],
  ],
  [
    [0, 10, 17, "Service midi"],
    [3, 14, 22, "Fermeture"],
    [5, 10, 17, "Service midi"],
  ],
  [
    [0, 10, 17, "Service midi"],
    [2, 9, 17, "Journée"],
    [4, 10, 18, "Service soir"],
  ],
  [
    [0, 10, 17, "Service midi"],
    [1, 8, 16, "Ouverture"],
    [5, 14, 22, "Fermeture"],
  ],
  [
    [0, 10, 17, "Service midi"],
    [2, 14, 22, "Service soir"],
    [6, 9, 17, "Service midi"],
  ],
  [
    [0, 10, 17, "Service midi"],
    [3, 9, 17, "Service midi"],
    [5, 10, 18, "Service soir"],
  ],
];

export function generateShifts(weekStart: Date, employees: Employee[] = MOCK_EMPLOYEES): Shift[] {
  const shifts: Shift[] = [];
  employees.forEach((emp, ei) => {
    (SHIFT_PATTERNS[ei % SHIFT_PATTERNS.length] ?? []).forEach(([dayOffset, startHour, endHour, label], pi) => {
      shifts.push({
        id: `${emp.id}-${pi}`,
        employeeId: emp.id,
        date: format(addDays(weekStart, dayOffset), "yyyy-MM-dd"),
        startHour,
        endHour,
        label,
      });
    });
  });
  return shifts;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function getMonthCalendarDays(monthStart: Date): Date[] {
  const gridStart = startOfWeek(startOfMonth(monthStart), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 });
  const days: Date[] = [];
  let cur = gridStart;
  while (cur <= gridEnd) {
    days.push(cur);
    cur = addDays(cur, 1);
  }
  return days;
}

export function fmtHour(h: number): string {
  const raw = Math.floor(h);
  const display = raw >= 24 ? raw - 24 : raw;
  const mins = Math.round((h - raw) * 60);
  return mins === 0
    ? `${String(display).padStart(2, "0")}h`
    : `${String(display).padStart(2, "0")}h${String(mins).padStart(2, "0")}`;
}

export function generateShiftId(): string {
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// ─── Conversion DB → shifts d'affichage ──────────────────────────────────────

type DbShiftRow = {
  id: string;
  employee_id: string;
  date_start: string;
  date_end: string | null;
  start_hour: number;
  start_minute: number;
  end_hour: number;
  end_minute: number;
  label: string | null;
  is_recurring: boolean;
  recurrence_days: number[] | null;
  overnight: boolean;
  excluded_dates: string[];
};

type DbShiftOverrideRow = {
  id: string;
  parent_shift_id: string;
  override_date: string;
  employee_id: string | null;
  start_hour: number | null;
  end_hour: number | null;
  label: string | null;
  deleted: boolean;
};

const EMPTY_SET = new Set<string>();

function isValidRecurring(row: DbShiftRow): boolean {
  return !!(row.is_recurring && row.recurrence_days?.length);
}

// Dates à ignorer par shift : excluded_dates + dates ayant un override
function buildSkippedDates(dbShifts: DbShiftRow[], dbOverrides: DbShiftOverrideRow[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const row of dbShifts) {
    if (row.excluded_dates.length > 0) map.set(row.id, new Set(row.excluded_dates));
  }
  for (const ov of dbOverrides) {
    const s = map.get(ov.parent_shift_id);
    if (s) s.add(ov.override_date);
    else map.set(ov.parent_shift_id, new Set([ov.override_date]));
  }
  return map;
}

// Génère les occurrences d'un shift récurrent pour les jours de la semaine
function expandRecurringShift(
  row: DbShiftRow,
  startHour: number,
  endHour: number,
  weekDays: Date[],
  prevDay: Date,
  skipSet: Set<string>,
): Shift[] {
  const isOvernightRow = endHour > 24;
  const daysToCheck = isOvernightRow ? [prevDay, ...weekDays] : weekDays;
  const prevDayStr = format(prevDay, "yyyy-MM-dd");
  const label = row.label ?? "";
  const result: Shift[] = [];
  for (const day of daysToCheck) {
    const dayIndex = (day.getDay() + 6) % 7;
    if (!row.recurrence_days!.includes(dayIndex)) continue;
    const dateStr = format(day, "yyyy-MM-dd");
    if (dateStr < row.date_start) continue;
    if (row.date_end && dateStr > row.date_end) continue;
    if (dateStr === prevDayStr && !isOvernightRow) continue;
    if (skipSet.has(dateStr)) continue;
    result.push({
      id: `${row.id}-${dateStr}`,
      dbId: row.id,
      employeeId: row.employee_id,
      date: dateStr,
      startHour,
      endHour,
      label,
      isRecurring: true,
      recurrenceDays: row.recurrence_days,
      dateStart: row.date_start,
      dateEnd: row.date_end,
    });
  }
  return result;
}

// Génère les occurrences issues des overrides (exceptions individuelles)
function expandOverrides(dbOverrides: DbShiftOverrideRow[], dbShifts: DbShiftRow[], weekStrs: Set<string>): Shift[] {
  const result: Shift[] = [];
  for (const ov of dbOverrides) {
    if (ov.deleted) continue;
    if (!weekStrs.has(ov.override_date)) continue;
    const parent = dbShifts.find((s) => s.id === ov.parent_shift_id);
    if (!parent) continue;
    const startH = ov.start_hour ?? parent.start_hour + parent.start_minute / 60;
    const rawEnd = ov.end_hour ?? parent.end_hour + parent.end_minute / 60;
    result.push({
      id: `override-${ov.id}`,
      dbId: ov.id,
      isOverride: true,
      parentShiftId: ov.parent_shift_id,
      employeeId: ov.employee_id ?? parent.employee_id,
      date: ov.override_date,
      startHour: startH,
      endHour: rawEnd < startH ? rawEnd + 24 : rawEnd,
      label: ov.label ?? parent.label ?? "",
      isRecurring: false,
      recurrenceDays: null,
      dateStart: ov.override_date,
      dateEnd: ov.override_date,
    });
  }
  return result;
}

export function expandShiftsForWeek(
  dbShifts: DbShiftRow[],
  weekDays: Date[],
  dbOverrides: DbShiftOverrideRow[] = [],
): Shift[] {
  const result: Shift[] = [];
  if (weekDays.length === 0) return result;

  const weekStrs = new Set(weekDays.map((d) => format(d, "yyyy-MM-dd")));
  const prevDay = addDays(weekDays[0], -1);
  const prevDayStr = format(prevDay, "yyyy-MM-dd");
  const skipped = buildSkippedDates(dbShifts, dbOverrides);

  for (const row of dbShifts) {
    const startHour = row.start_hour + row.start_minute / 60;
    const rawEnd = row.end_hour + row.end_minute / 60;
    const endHour = row.overnight && rawEnd < startHour ? rawEnd + 24 : rawEnd;
    const label = row.label ?? "";

    if (isValidRecurring(row)) {
      result.push(
        ...expandRecurringShift(row, startHour, endHour, weekDays, prevDay, skipped.get(row.id) ?? EMPTY_SET),
      );
    } else if (weekStrs.has(row.date_start)) {
      result.push({
        id: row.id,
        dbId: row.id,
        employeeId: row.employee_id,
        date: row.date_start,
        startHour,
        endHour,
        label,
        isRecurring: false,
        recurrenceDays: null,
        dateStart: row.date_start,
        dateEnd: row.date_end,
      });
    } else if (row.date_start === prevDayStr && endHour > 24) {
      result.push({
        id: row.id,
        dbId: row.id,
        employeeId: row.employee_id,
        date: row.date_start,
        startHour,
        endHour,
        label,
        isRecurring: false,
        recurrenceDays: null,
        dateStart: row.date_start,
        dateEnd: row.date_end,
      });
    }
  }

  result.push(...expandOverrides(dbOverrides, dbShifts, weekStrs));
  return result;
}

// ─── Overlap detection (règles complètes, pas seulement semaine visible) ────────

type OverlapCandidate = {
  employeeId: string;
  startHour: number;
  endHour: number;
  isRecurring: boolean;
  recurrenceDays: number[];
  dateStart: string;
  dateEnd: string | null;
};

function isoWeekday(dateStr: string): number {
  return (new Date(dateStr).getDay() + 6) % 7;
}

function daysOverlap(
  newDays: number[] | null,
  ruleDays: number[] | null,
  ruleStart: string,
  newDateStart: string,
): boolean {
  if (newDays && ruleDays) return newDays.some((d) => ruleDays.includes(d));
  if (newDays) return newDays.includes(isoWeekday(ruleStart));
  if (ruleDays) return ruleDays.includes(isoWeekday(newDateStart));
  return newDateStart === ruleStart;
}

export function hasShiftOverlap(
  newShift: OverlapCandidate,
  existingShifts: Shift[],
  excludeDbId?: string,
): string | null {
  const seen = new Set<string>();
  const rules: Shift[] = [];
  for (const s of existingShifts) {
    if (s.employeeId !== newShift.employeeId) continue;
    const key = s.dbId ?? s.id;
    if (excludeDbId && (key === excludeDbId || s.id === excludeDbId)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    rules.push(s);
  }

  for (const rule of rules) {
    if (newShift.startHour >= rule.endHour || newShift.endHour <= rule.startHour) continue;
    const newEnd = newShift.dateEnd ?? "9999-12-31";
    const ruleEnd = rule.dateEnd ?? "9999-12-31";
    const ruleStart = rule.dateStart ?? rule.date;
    if (newShift.dateStart > ruleEnd || ruleStart > newEnd) continue;
    const newDays = newShift.isRecurring ? newShift.recurrenceDays : null;
    const ruleDays = rule.isRecurring ? (rule.recurrenceDays ?? []) : null;
    if (!daysOverlap(newDays, ruleDays, ruleStart, newShift.dateStart)) continue;
    return ruleStart;
  }

  return null;
}

// Retourne le label à afficher — fallback sur les heures si label vide
export function shiftLabel(label: string, startHour: number, endHour: number): string {
  return label !== "" ? label : `${fmtHour(startHour)}–${fmtHour(endHour)}`;
}

export function pxPerHour(cellHeight: number): number {
  return cellHeight / (HOUR_END - HOUR_START);
}

export function shiftTop(startHour: number, cellHeight: number): number {
  return (startHour - HOUR_START) * pxPerHour(cellHeight);
}

export function shiftHeight(startHour: number, endHour: number, cellHeight: number): number {
  return (endHour - startHour) * pxPerHour(cellHeight);
}
