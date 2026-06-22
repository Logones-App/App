import { addDays, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";

export type ViewMode = "day" | "week" | "month";
export type HaccpFrequency = "daily" | "weekly" | "monthly" | "once";
export type HaccpCategory =
  | "Températures"
  | "Températures produit"
  | "Checklists"
  | "Huiles"
  | "Nettoyage"
  | "Réceptions"
  | "Contrôle"
  | "Formations";

export type TaskStatus = "fait" | "à faire" | "en retard" | "planifié";

export type HaccpTask = {
  id: string;
  title: string;
  category: HaccpCategory;
  responsible: string;
  startHour: number;
  endHour: number;
  frequency: HaccpFrequency;
  weekDays?: number[];
  monthDay?: number;
  specificDate?: string;
  note?: string;
};

export const CATEGORIES: HaccpCategory[] = [
  "Températures",
  "Températures produit",
  "Checklists",
  "Huiles",
  "Nettoyage",
  "Réceptions",
  "Contrôle",
  "Formations",
];

export const CAT_STYLE: Record<HaccpCategory, string> = {
  Températures: "bg-blue-100 dark:bg-blue-900/30 border-l-[3px] border-l-blue-500 text-blue-900 dark:text-blue-200",
  "Températures produit":
    "bg-cyan-100 dark:bg-cyan-900/30 border-l-[3px] border-l-cyan-500 text-cyan-900 dark:text-cyan-200",
  Checklists:
    "bg-purple-100 dark:bg-purple-900/30 border-l-[3px] border-l-purple-500 text-purple-900 dark:text-purple-200",
  Huiles: "bg-amber-100 dark:bg-amber-900/30 border-l-[3px] border-l-amber-500 text-amber-900 dark:text-amber-200",
  Nettoyage: "bg-green-100 dark:bg-green-900/30 border-l-[3px] border-l-green-500 text-green-900 dark:text-green-200",
  Réceptions:
    "bg-orange-100 dark:bg-orange-900/30 border-l-[3px] border-l-orange-500 text-orange-900 dark:text-orange-200",
  Contrôle: "bg-slate-100 dark:bg-slate-800/50 border-l-[3px] border-l-slate-500 text-slate-900 dark:text-slate-200",
  Formations: "bg-pink-100 dark:bg-pink-900/30 border-l-[3px] border-l-pink-500 text-pink-900 dark:text-pink-200",
};

export const CAT_DOT: Record<HaccpCategory, string> = {
  Températures: "bg-blue-500",
  "Températures produit": "bg-cyan-500",
  Checklists: "bg-purple-500",
  Huiles: "bg-amber-500",
  Nettoyage: "bg-green-500",
  Réceptions: "bg-orange-500",
  Contrôle: "bg-slate-500",
  Formations: "bg-pink-500",
};

export function fmtHour(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.round((h % 1) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

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

export function dateToWeekDay(date: Date): number {
  const d = date.getDay();
  return d === 0 ? 6 : d - 1;
}

export function getTasksForDate(tasks: HaccpTask[], date: Date): HaccpTask[] {
  const dayOfWeek = dateToWeekDay(date);
  const dateStr = format(date, "yyyy-MM-dd");
  const dayOfMonth = date.getDate();

  return tasks.filter((t) => {
    if (t.frequency === "daily") return true;
    if (t.frequency === "weekly") return t.weekDays?.includes(dayOfWeek) ?? false;
    if (t.frequency === "monthly") return t.monthDay === dayOfMonth;
    return t.specificDate === dateStr;
  });
}

const LATE_IDS = new Set(["4", "12"]);

export function getTaskStatus(task: HaccpTask, date: Date): TaskStatus {
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const dateStr = format(date, "yyyy-MM-dd");

  if (dateStr < todayStr) return "fait";
  if (dateStr > todayStr) return "planifié";

  const currentH = today.getHours() + today.getMinutes() / 60;
  if (task.endHour < currentH) {
    return LATE_IDS.has(task.id) ? "en retard" : "fait";
  }
  return "à faire";
}

export const INITIAL_TASKS: HaccpTask[] = [
  {
    id: "1",
    title: "Relevé T° matin",
    category: "Températures",
    responsible: "Jean D.",
    startHour: 7,
    endHour: 7.25,
    frequency: "daily",
  },
  {
    id: "2",
    title: "Checklist ouverture",
    category: "Checklists",
    responsible: "Jean D.",
    startHour: 7.5,
    endHour: 7.75,
    frequency: "daily",
  },
  {
    id: "3",
    title: "Contrôle réception",
    category: "Réceptions",
    responsible: "Jean D.",
    startHour: 8,
    endHour: 9,
    frequency: "weekly",
    weekDays: [0, 1, 2, 3, 4],
  },
  {
    id: "4",
    title: "Test acidité huiles",
    category: "Huiles",
    responsible: "Jean D.",
    startHour: 11,
    endHour: 11.25,
    frequency: "daily",
  },
  {
    id: "5",
    title: "T° produits déjeuner",
    category: "Températures produit",
    responsible: "Marie T.",
    startHour: 12,
    endHour: 12.5,
    frequency: "daily",
  },
  {
    id: "6",
    title: "Relevé T° midi",
    category: "Températures",
    responsible: "Marie T.",
    startHour: 13,
    endHour: 13.25,
    frequency: "daily",
  },
  {
    id: "7",
    title: "Nettoyage plans travail",
    category: "Nettoyage",
    responsible: "Marie D.",
    startHour: 14.5,
    endHour: 15,
    frequency: "daily",
  },
  {
    id: "8",
    title: "Relevé T° soir",
    category: "Températures",
    responsible: "Sophie L.",
    startHour: 19,
    endHour: 19.25,
    frequency: "daily",
  },
  {
    id: "9",
    title: "Checklist fermeture",
    category: "Checklists",
    responsible: "Sophie L.",
    startHour: 22,
    endHour: 22.5,
    frequency: "daily",
  },
  {
    id: "10",
    title: "Nettoyage chambre froide",
    category: "Nettoyage",
    responsible: "Marie D.",
    startHour: 9,
    endHour: 10.5,
    frequency: "weekly",
    weekDays: [0],
  },
  {
    id: "11",
    title: "Vérification pièges",
    category: "Contrôle",
    responsible: "Jean D.",
    startHour: 9,
    endHour: 9.5,
    frequency: "weekly",
    weekDays: [0],
  },
  {
    id: "12",
    title: "Vidange friteuse 2",
    category: "Huiles",
    responsible: "Jean D.",
    startHour: 14,
    endHour: 15.5,
    frequency: "weekly",
    weekDays: [2],
  },
  {
    id: "13",
    title: "Dégraissage four + hottes",
    category: "Nettoyage",
    responsible: "Chef de partie",
    startHour: 22,
    endHour: 23,
    frequency: "weekly",
    weekDays: [4],
  },
  {
    id: "14",
    title: "Calibrage sondes T°",
    category: "Températures",
    responsible: "Jean D.",
    startHour: 9,
    endHour: 10,
    frequency: "monthly",
    monthDay: 1,
  },
  {
    id: "15",
    title: "Formation HACCP — Sophie L.",
    category: "Formations",
    responsible: "Direction",
    startHour: 9,
    endHour: 17,
    frequency: "once",
    specificDate: "2026-07-15",
  },
];
