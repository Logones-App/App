"use client";

import { type CSSProperties, useState } from "react";

import { format, isToday } from "date-fns";
import { fr } from "date-fns/locale";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { CurrentTimeLine } from "./planning-grid";
import { TIME_MARKERS, type Employee, type Shift, fmtHour, shiftHeight, shiftTop } from "./planning-types";

const GRID_LINES_STYLE: CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(to bottom, transparent, transparent 9px, rgba(128,128,128,0.08) 9px, rgba(128,128,128,0.08) 10px)",
};

// ─── CoverageStrip ────────────────────────────────────────────────────────────

function CoverageStrip({
  dayShifts,
  employees,
  cellHeight,
}: {
  dayShifts: Shift[];
  employees: Employee[];
  cellHeight: number;
}) {
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);
  const hourPx = cellHeight / 24;
  const maxCount = employees.length;

  const workingAt = (h: number) =>
    employees.filter((emp) => dayShifts.some((s) => s.employeeId === emp.id && s.startHour <= h && s.endHour > h));

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const h = Math.min(23, Math.floor(((e.clientY - rect.top) / cellHeight) * 24));
    setHoveredHour(h);
  };

  const working = hoveredHour !== null ? workingAt(hoveredHour) : [];

  return (
    <div
      className="relative shrink-0 cursor-crosshair border-r"
      style={{ width: 28, height: cellHeight }}
      onMouseMove={onMove}
      onMouseLeave={() => setHoveredHour(null)}
    >
      {/* Mini histogramme permanent */}
      {Array.from({ length: 24 }, (_, h) => {
        const working = workingAt(h);
        if (working.length === 0) return null;
        const w = Math.max(4, Math.round((working.length / Math.max(maxCount, 1)) * 26));
        return (
          <div
            key={h}
            className="absolute left-0 flex overflow-hidden"
            style={{ top: h * hourPx, height: Math.max(hourPx - 1, 1), width: w }}
          >
            {working.map((emp) => (
              <div key={emp.id} className="h-full flex-1" style={{ backgroundColor: emp.color, opacity: 0.55 }} />
            ))}
          </div>
        );
      })}

      {/* Surlignage de l'heure survolée */}
      {hoveredHour !== null && (
        <div
          className="bg-primary/25 pointer-events-none absolute inset-x-0 z-10"
          style={{ top: hoveredHour * hourPx, height: Math.max(hourPx, 2) }}
        />
      )}

      {/* Tooltip custom positionné à droite */}
      {hoveredHour !== null && (
        <div
          className="bg-popover absolute left-8 z-50 min-w-[140px] rounded-md border px-2.5 py-2 shadow-md"
          style={{ top: Math.min(hoveredHour * hourPx, cellHeight - 90) }}
        >
          <p className="text-xs font-semibold">
            {String(hoveredHour).padStart(2, "0")}h – {String(hoveredHour + 1).padStart(2, "0")}h
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {working.length} employé{working.length !== 1 ? "s" : ""}
          </p>
          {working.map((emp) => (
            <div key={emp.id} className="mt-1 flex items-center gap-1.5">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: emp.color }} />
              <span className="text-xs">{emp.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── WeekCoverageGrid ─────────────────────────────────────────────────────────

export function WeekCoverageGrid({
  employees,
  shifts,
  weekDays,
  cellHeight,
}: {
  employees: Employee[];
  shifts: Shift[];
  weekDays: Date[];
  cellHeight: number;
}) {
  const n = employees.length;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        {/* En-tête */}
        <div className="grid border-b" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
          <div className="bg-muted/40 text-muted-foreground px-2 py-2 text-xs font-medium">Heure</div>
          {weekDays.map((day) => (
            <div
              key={day.toISOString()}
              className={cn("border-l px-2 py-2 text-center", isToday(day) ? "bg-primary/10" : "bg-muted/40")}
            >
              <p
                className={cn(
                  "text-xs capitalize",
                  isToday(day) ? "text-primary font-semibold" : "text-muted-foreground",
                )}
              >
                {format(day, "EEE", { locale: fr })}
              </p>
              <p className={cn("text-sm font-bold", isToday(day) ? "text-primary" : "")}>{format(day, "d")}</p>
            </div>
          ))}
        </div>

        {/* Corps */}
        <div className="grid" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
          {/* Réglette horaire */}
          <div className="relative border-r" style={{ height: cellHeight }}>
            {TIME_MARKERS.map((h) => (
              <span
                key={h}
                className="text-muted-foreground/60 absolute right-1 text-[9px] leading-none"
                style={{ top: shiftTop(h, cellHeight) - 5 }}
              >
                {String(h).padStart(2, "0")}h
              </span>
            ))}
          </div>

          {/* Colonnes jours */}
          {weekDays.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const dayShifts = shifts.filter((s) => s.date === dateStr);
            return (
              <div
                key={day.toISOString()}
                className={cn("flex border-l", isToday(day) && "bg-primary/5")}
                style={{ height: cellHeight }}
              >
                {/* Strip couverture */}
                <CoverageStrip dayShifts={dayShifts} employees={employees} cellHeight={cellHeight} />

                {/* Barres de shifts */}
                <div className="relative flex-1" style={GRID_LINES_STYLE}>
                  {isToday(day) && <CurrentTimeLine cellHeight={cellHeight} />}
                  {employees.map((emp, idx) => {
                    const empShifts = dayShifts.filter((s) => s.employeeId === emp.id);
                    return empShifts.map((shift) => (
                      <TooltipProvider key={shift.id} delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className="absolute cursor-default rounded-sm opacity-85 hover:z-10 hover:opacity-100"
                              style={{
                                backgroundColor: emp.color,
                                left: `${(idx / n) * 100}%`,
                                width: `${(1 / n) * 100}%`,
                                top: shiftTop(shift.startHour, cellHeight),
                                height: shiftHeight(shift.startHour, shift.endHour, cellHeight),
                              }}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="right" className="text-xs">
                            <p className="font-semibold">{emp.name}</p>
                            <p className="text-muted-foreground">
                              {shift.label} · {fmtHour(shift.startHour)}–{fmtHour(shift.endHour)}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ));
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Légende */}
        <div className="bg-muted/20 border-t px-3 py-2">
          <div className="flex flex-wrap gap-3">
            {employees.map((emp) => (
              <span key={emp.id} className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: emp.color }} />
                {emp.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
