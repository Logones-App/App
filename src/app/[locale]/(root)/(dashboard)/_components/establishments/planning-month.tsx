"use client";

import { format, isSameMonth, isToday } from "date-fns";

import { cn } from "@/lib/utils";

import { type Employee, type Shift } from "./planning-types";

const DAY_HEADERS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MAX_VISIBLE = 3;

function DayCell({
  day,
  shifts,
  employees,
  inMonth,
  onEditShift,
}: {
  day: Date;
  shifts: Shift[];
  employees: Employee[];
  inMonth: boolean;
  onEditShift: (shift: Shift) => void;
}) {
  const dayStr = format(day, "yyyy-MM-dd");
  const dayShifts = shifts.filter((s) => s.date === dayStr);
  const shown = dayShifts.slice(0, MAX_VISIBLE);
  const overflow = dayShifts.length - shown.length;
  const today = isToday(day);

  return (
    <div className={cn("min-h-[90px] border-r border-b p-1.5", !inMonth && "bg-muted/20")}>
      <span
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium",
          today && "bg-primary text-primary-foreground",
          !today && !inMonth && "text-muted-foreground/50",
          !today && inMonth && "text-foreground",
        )}
      >
        {format(day, "d")}
      </span>

      <div className="mt-1 space-y-0.5">
        {shown.map((s) => {
          const emp = employees.find((e) => e.id === s.employeeId);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onEditShift(s)}
              className="w-full truncate rounded px-1 py-0.5 text-left text-[10px] leading-tight text-white transition-opacity hover:opacity-80"
              style={{ backgroundColor: emp?.color ?? "#6b7280" }}
            >
              <span className="font-medium">{emp?.name.split(" ")[0]}</span>
              {" · "}
              {s.label}
            </button>
          );
        })}
        {overflow > 0 && (
          <p className="text-muted-foreground px-1 text-[10px]">
            +{overflow} autre{overflow > 1 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
  );
}

interface MonthGridProps {
  employees: Employee[];
  shifts: Shift[];
  calendarDays: Date[];
  monthStart: Date;
  onEditShift: (shift: Shift) => void;
}

export function MonthGrid({ employees, shifts, calendarDays, monthStart, onEditShift }: MonthGridProps) {
  const weeks: Date[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  return (
    <div className="overflow-hidden rounded-xl border shadow-sm">
      {/* En-têtes jours */}
      <div className="bg-muted/40 grid grid-cols-7 border-b">
        {DAY_HEADERS.map((d) => (
          <div key={d} className="text-muted-foreground border-r py-2 text-center text-xs font-medium last:border-r-0">
            {d}
          </div>
        ))}
      </div>

      {/* Grille semaines */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7">
          {week.map((day) => (
            <DayCell
              key={day.toISOString()}
              day={day}
              shifts={shifts}
              employees={employees}
              inMonth={isSameMonth(day, monthStart)}
              onEditShift={onEditShift}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
