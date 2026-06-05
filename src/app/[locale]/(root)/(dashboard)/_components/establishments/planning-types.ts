import { addDays, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Employee = {
  id: string;
  name: string;
  role: string;
  color: string;
};

export type Shift = {
  id: string;
  dbId?: string; // employee_shifts.id — absent pour les shifts mock
  employeeId: string;
  date: string; // YYYY-MM-DD (occurrence réelle)
  startHour: number;
  endHour: number;
  label: string;
  isRecurring?: boolean;
};

// Payload émis par ShiftCreateModal vers planning-schedule
export type CreateShiftPayload = {
  employeeId: string;
  label: string;
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
  label: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  overnight: boolean;
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
  label: string;
  is_recurring: boolean;
  recurrence_days: number[] | null;
  overnight: boolean;
};

export function expandShiftsForWeek(dbShifts: DbShiftRow[], weekDays: Date[]): Shift[] {
  const result: Shift[] = [];

  for (const row of dbShifts) {
    const startHour = row.start_hour + row.start_minute / 60;
    const endHour = row.end_hour + row.end_minute / 60;

    if (row.is_recurring && row.recurrence_days && row.recurrence_days.length > 0) {
      for (const day of weekDays) {
        const dayIndex = (day.getDay() + 6) % 7; // Lun=0 … Dim=6
        if (!row.recurrence_days.includes(dayIndex)) continue;
        const dateStr = format(day, "yyyy-MM-dd");
        if (dateStr < row.date_start) continue;
        if (row.date_end && dateStr > row.date_end) continue;
        result.push({
          id: `${row.id}-${dateStr}`,
          dbId: row.id,
          employeeId: row.employee_id,
          date: dateStr,
          startHour,
          endHour,
          label: row.label,
          isRecurring: true,
        });
      }
    } else {
      const weekStrs = weekDays.map((d) => format(d, "yyyy-MM-dd"));
      if (weekStrs.includes(row.date_start)) {
        result.push({
          id: row.id,
          dbId: row.id,
          employeeId: row.employee_id,
          date: row.date_start,
          startHour,
          endHour,
          label: row.label,
          isRecurring: false,
        });
      }
    }
  }

  return result;
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
