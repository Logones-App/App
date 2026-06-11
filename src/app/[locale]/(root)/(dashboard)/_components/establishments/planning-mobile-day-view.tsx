"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { fmtHour, shiftLabel, type Employee, type Shift } from "./planning-types";

export function MobileDayView({
  employees,
  shifts,
  day,
  onPrev,
  onNext,
}: {
  employees: Employee[];
  shifts: Shift[];
  day: Date;
  onPrev: () => void;
  onNext: () => void;
}) {
  const dayStr = format(day, "yyyy-MM-dd");
  const isToday = dayStr === format(new Date(), "yyyy-MM-dd");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Button size="icon" variant="outline" onClick={onPrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className={cn("text-sm font-semibold capitalize", isToday && "text-primary")}>
          {format(day, "EEEE d MMMM", { locale: fr })}
        </span>
        <Button size="icon" variant="outline" onClick={onNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-2">
        {employees.map((emp) => {
          const dayShifts = shifts.filter((s) => s.employeeId === emp.id && s.date === dayStr);
          return (
            <div key={emp.id} className="overflow-hidden rounded-lg border">
              <div className="bg-muted/30 flex items-center gap-2 px-3 py-2">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: emp.color }} />
                <span className="text-sm font-medium">{emp.name}</span>
                <span className="text-muted-foreground ml-auto text-xs">{emp.role}</span>
              </div>
              {dayShifts.length === 0 ? (
                <p className="text-muted-foreground px-3 py-2 text-xs italic">Repos</p>
              ) : (
                dayShifts.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center border-t px-3 py-2.5"
                    style={{ borderLeftWidth: 3, borderLeftColor: emp.color }}
                  >
                    <div>
                      <p className="text-sm font-medium">{shiftLabel(s.label, s.startHour, s.endHour)}</p>
                      <p className="text-muted-foreground text-xs tabular-nums">
                        {fmtHour(s.startHour)} → {fmtHour(s.endHour)} · {s.endHour - s.startHour}h
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
