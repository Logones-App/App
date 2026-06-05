import { addDays, format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Employee = {
  id: string;
  name: string;
  role: string;
  color: string;
};

export type Shift = {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  startHour: number;
  endHour: number;
  label: string;
};

type ShiftPattern = [dayOffset: number, startHour: number, endHour: number, label: string];

// ─── Constantes ───────────────────────────────────────────────────────────────

export const HOUR_START = 0;
export const HOUR_END = 24;
export const CELL_HEIGHT_COMFORTABLE = 160;
export const CELL_HEIGHT_COMPACT = 80;
export const CELL_HEIGHT_COVERAGE = 480; // 20px/heure sur 24h
export const TIME_MARKERS = [0, 4, 8, 12, 16, 20];

// ─── Mock data ────────────────────────────────────────────────────────────────

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

export function generateShifts(weekStart: Date): Shift[] {
  const shifts: Shift[] = [];
  MOCK_EMPLOYEES.forEach((emp, ei) => {
    (SHIFT_PATTERNS[ei] ?? []).forEach(([dayOffset, startHour, endHour, label], pi) => {
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

export function pxPerHour(cellHeight: number): number {
  return cellHeight / (HOUR_END - HOUR_START);
}

export function shiftTop(startHour: number, cellHeight: number): number {
  return (startHour - HOUR_START) * pxPerHour(cellHeight);
}

export function shiftHeight(startHour: number, endHour: number, cellHeight: number): number {
  return (endHour - startHour) * pxPerHour(cellHeight);
}
