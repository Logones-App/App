"use client";

import { useCallback, useMemo, useState } from "react";

import { addWeeks, format, getISOWeek, startOfWeek, subWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import { AlignJustify, CalendarDays, ChevronLeft, ChevronRight, Filter, LayoutGrid, LayoutList } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import { BackToEstablishmentButton } from "./back-to-establishment-button";
import { WeekCoverageGrid } from "./planning-coverage";
import { WeekGrid, WeekStats } from "./planning-grid";
import { ShiftCreateModal } from "./planning-shift-modal";
import {
  CELL_HEIGHT_COMFORTABLE,
  CELL_HEIGHT_COMPACT,
  CELL_HEIGHT_COVERAGE,
  MOCK_EMPLOYEES,
  type Shift,
  generateShifts,
  getWeekDays,
} from "./planning-types";

// ─── MobileDayView ────────────────────────────────────────────────────────────

function MobileDayView({
  employees,
  shifts,
  day,
  onPrev,
  onNext,
}: {
  employees: typeof MOCK_EMPLOYEES;
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
                      <p className="text-sm font-medium">{s.label}</p>
                      <p className="text-muted-foreground text-xs tabular-nums">
                        {String(s.startHour).padStart(2, "0")}h → {String(s.endHour).padStart(2, "0")}h ·{" "}
                        {s.endHour - s.startHour}h
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

// ─── PlanningSchedule ─────────────────────────────────────────────────────────

export function PlanningSchedule({
  establishmentId,
  organizationId,
}: {
  establishmentId: string;
  organizationId: string;
}) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [compact, setCompact] = useState(false);
  const [visibleIds, setVisibleIds] = useState<Set<string>>(() => new Set(MOCK_EMPLOYEES.map((e) => e.id)));
  const [dayIndex, setDayIndex] = useState(() => {
    const d = new Date().getDay();
    return d === 0 ? 6 : d - 1;
  });
  const [shifts, setShifts] = useState<Shift[]>(() => generateShifts(startOfWeek(new Date(), { weekStartsOn: 1 })));
  const [addModalEmployeeId, setAddModalEmployeeId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"employees" | "coverage">("employees");

  const cellHeight = compact ? CELL_HEIGHT_COMPACT : CELL_HEIGHT_COMFORTABLE;
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const weekEnd = weekDays[6];

  const visibleEmployees = useMemo(() => MOCK_EMPLOYEES.filter((e) => visibleIds.has(e.id)), [visibleIds]);
  const visibleShifts = useMemo(() => shifts.filter((s) => visibleIds.has(s.employeeId)), [shifts, visibleIds]);
  const totalHours = visibleShifts.reduce((a, s) => a + (s.endHour - s.startHour), 0);

  const changeWeek = (newStart: Date) => {
    setWeekStart(newStart);
    setShifts(generateShifts(newStart));
  };

  const toggleEmployee = (id: string) =>
    setVisibleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

  const prevDay = () => {
    if (dayIndex === 0) {
      changeWeek(subWeeks(weekStart, 1));
      setDayIndex(6);
    } else setDayIndex((i) => i - 1);
  };
  const nextDay = () => {
    if (dayIndex === 6) {
      changeWeek(addWeeks(weekStart, 1));
      setDayIndex(0);
    } else setDayIndex((i) => i + 1);
  };

  const moveShift = useCallback((shiftId: string, toEmployeeId: string, toDate: string) => {
    setShifts((prev) => prev.map((s) => (s.id === shiftId ? { ...s, employeeId: toEmployeeId, date: toDate } : s)));
  }, []);

  const addShifts = useCallback((newShifts: Shift[]) => {
    setShifts((prev) => [...prev, ...newShifts]);
  }, []);

  const modalEmployee = MOCK_EMPLOYEES.find((e) => e.id === addModalEmployeeId) ?? null;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <BackToEstablishmentButton establishmentId={establishmentId} organizationId={organizationId} />
        <h1 className="text-2xl font-bold">Planning</h1>
        <p className="text-muted-foreground text-sm">Gérez les créneaux de travail de votre équipe.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" onClick={() => changeWeek(subWeeks(weekStart, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[240px] text-center text-sm font-medium">
            S{getISOWeek(weekStart)} · {format(weekStart, "d MMMM", { locale: fr })} –{" "}
            {format(weekEnd, "d MMMM yyyy", { locale: fr })}
          </span>
          <Button size="icon" variant="outline" onClick={() => changeWeek(addWeeks(weekStart, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => changeWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
            <CalendarDays className="mr-2 h-4 w-4" />
            Aujourd&apos;hui
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5">
                <Filter className="h-3.5 w-3.5" />
                Employés
                {visibleIds.size < MOCK_EMPLOYEES.length && (
                  <Badge className="ml-1 h-4 px-1 text-[10px]">{visibleIds.size}</Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-2" align="end">
              <div className="space-y-1">
                {MOCK_EMPLOYEES.map((emp) => (
                  <label
                    key={emp.id}
                    className="hover:bg-muted/50 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5"
                  >
                    <Checkbox checked={visibleIds.has(emp.id)} onCheckedChange={() => toggleEmployee(emp.id)} />
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: emp.color }} />
                    <span className="truncate text-sm">{emp.name}</span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <Button size="sm" variant="outline" onClick={() => setCompact((c) => !c)}>
            {compact ? <AlignJustify className="h-3.5 w-3.5" /> : <LayoutList className="h-3.5 w-3.5" />}
          </Button>
          <Button
            size="sm"
            variant={viewMode === "coverage" ? "default" : "outline"}
            onClick={() => setViewMode((v) => (v === "employees" ? "coverage" : "employees"))}
            title={viewMode === "coverage" ? "Vue par employé" : "Vue couverture"}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </Button>
          <Badge variant="outline">{totalHours}h planifiées</Badge>
        </div>
      </div>

      <div className="hidden overflow-hidden rounded-xl border shadow-sm lg:block">
        {viewMode === "employees" ? (
          <WeekGrid
            employees={visibleEmployees}
            shifts={visibleShifts}
            weekDays={weekDays}
            cellHeight={cellHeight}
            onMoveShift={moveShift}
            onAddShift={setAddModalEmployeeId}
          />
        ) : (
          <WeekCoverageGrid
            employees={visibleEmployees}
            shifts={visibleShifts}
            weekDays={weekDays}
            cellHeight={compact ? CELL_HEIGHT_COVERAGE / 2 : CELL_HEIGHT_COVERAGE}
          />
        )}
      </div>

      <ShiftCreateModal
        open={addModalEmployeeId !== null}
        onOpenChange={(o) => {
          if (!o) setAddModalEmployeeId(null);
        }}
        employee={modalEmployee}
        weekDays={weekDays}
        existingShifts={shifts}
        onSave={addShifts}
      />

      <div className="lg:hidden">
        <MobileDayView
          employees={visibleEmployees}
          shifts={visibleShifts}
          day={weekDays[dayIndex]}
          onPrev={prevDay}
          onNext={nextDay}
        />
      </div>

      <WeekStats employees={visibleEmployees} shifts={visibleShifts} />
    </div>
  );
}
