"use client";

import type { Dispatch, SetStateAction } from "react";

import { addMonths, addWeeks, format, getISOWeek, startOfMonth, startOfWeek, subMonths, subWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlignJustify,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Filter,
  LayoutGrid,
  LayoutList,
  Plus,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { PlanningCapacityView } from "./planning-capacity-view";
import { WeekCoverageGrid } from "./planning-coverage";
import { PlanningDayView } from "./planning-day-view";
import { WeekGrid } from "./planning-grid";
import { CELL_HEIGHT_COVERAGE, type Employee, type Shift, type ViewMode } from "./planning-types";

interface PlanningNavProps {
  viewMode: ViewMode;
  monthStart: Date;
  setMonthStart: Dispatch<SetStateAction<Date>>;
  weekStart: Date;
  weekEnd: Date;
  weekDays: Date[];
  dayIndex: number;
  setDayIndex: Dispatch<SetStateAction<number>>;
  changeWeek: (d: Date) => void;
  prevDay: () => void;
  nextDay: () => void;
}

export function PlanningNav({
  viewMode,
  monthStart,
  setMonthStart,
  weekStart,
  weekEnd,
  weekDays,
  dayIndex,
  setDayIndex,
  changeWeek,
  prevDay,
  nextDay,
}: PlanningNavProps) {
  if (viewMode === "month")
    return (
      <div className="flex items-center gap-2">
        <Button size="icon" variant="outline" onClick={() => setMonthStart((m) => subMonths(m, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[180px] text-center text-sm font-medium capitalize">
          {format(monthStart, "MMMM yyyy", { locale: fr })}
        </span>
        <Button size="icon" variant="outline" onClick={() => setMonthStart((m) => addMonths(m, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setMonthStart(startOfMonth(new Date()))}>
          <CalendarDays className="mr-2 h-4 w-4" />
          Ce mois
        </Button>
      </div>
    );
  if (viewMode === "day")
    return (
      <div className="flex items-center gap-2">
        <Button size="icon" variant="outline" onClick={prevDay}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[200px] text-center text-sm font-medium capitalize">
          {format(weekDays[dayIndex], "EEEE d MMMM yyyy", { locale: fr })}
        </span>
        <Button size="icon" variant="outline" onClick={nextDay}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            changeWeek(startOfWeek(new Date(), { weekStartsOn: 1 }));
            setDayIndex(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
          }}
        >
          <CalendarDays className="mr-2 h-4 w-4" />
          Aujourd&apos;hui
        </Button>
      </div>
    );
  return (
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
  );
}

interface PlanningToolbarProps {
  visibleIds: Set<string> | null;
  allEmployees: Employee[];
  toggleEmployee: (id: string) => void;
  setAddModalEmployeeId: (id: string | null) => void;
  viewMode: ViewMode;
  setViewMode: Dispatch<SetStateAction<ViewMode>>;
  compact: boolean;
  setCompact: Dispatch<SetStateAction<boolean>>;
  demoMode: boolean;
  setDemoMode: Dispatch<SetStateAction<boolean>>;
  totalHours: number;
}

export function PlanningToolbar({
  visibleIds,
  allEmployees,
  toggleEmployee,
  setAddModalEmployeeId,
  viewMode,
  setViewMode,
  compact,
  setCompact,
  demoMode,
  setDemoMode,
  totalHours,
}: PlanningToolbarProps) {
  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline" className="gap-1.5">
            <Filter className="h-3.5 w-3.5" />
            Employés
            {visibleIds !== null && visibleIds.size < allEmployees.length && (
              <Badge className="ml-1 h-4 px-1 text-[10px]">{visibleIds.size}</Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-52 p-2" align="end">
          <div className="space-y-1">
            {allEmployees.map((emp) => (
              <label
                key={emp.id}
                className="hover:bg-muted/50 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5"
              >
                <Checkbox
                  checked={visibleIds === null || visibleIds.has(emp.id)}
                  onCheckedChange={() => toggleEmployee(emp.id)}
                />
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: emp.color }} />
                <span className="truncate text-sm">{emp.name}</span>
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      <Button size="sm" variant="outline" title="Nouveau créneau" onClick={() => setAddModalEmployeeId("")}>
        <Plus className="h-3.5 w-3.5" />
      </Button>
      {(viewMode === "employees" || viewMode === "day") && (
        <Button size="sm" variant="outline" title="Densité" onClick={() => setCompact((c) => !c)}>
          {compact ? <AlignJustify className="h-3.5 w-3.5" /> : <LayoutList className="h-3.5 w-3.5" />}
        </Button>
      )}
      <Button
        size="sm"
        variant={viewMode === "day" ? "default" : "outline"}
        onClick={() => setViewMode((v) => (v === "day" ? "employees" : "day"))}
        title="Vue jour"
      >
        <CalendarCheck className="h-3.5 w-3.5" />
      </Button>
      <Button
        size="sm"
        variant={viewMode === "coverage" ? "default" : "outline"}
        onClick={() => setViewMode((v) => (v === "coverage" ? "employees" : "coverage"))}
        title="Vue couverture"
      >
        <LayoutGrid className="h-3.5 w-3.5" />
      </Button>
      <Button
        size="sm"
        variant={viewMode === "capacity" ? "default" : "outline"}
        onClick={() => setViewMode((v) => (v === "capacity" ? "employees" : "capacity"))}
        title="Vue capacité serveurs"
      >
        <TrendingUp className="h-3.5 w-3.5" />
      </Button>
      {viewMode === "capacity" && (
        <Button
          size="sm"
          variant={demoMode ? "outline" : "ghost"}
          onClick={() => setDemoMode((v) => !v)}
          title="Source des réservations"
          className={demoMode ? "border-[#f97316]/50 text-[#f97316]" : ""}
        >
          {demoMode ? "Réel" : "Démo"}
        </Button>
      )}
      <Button
        size="sm"
        variant={viewMode === "month" ? "default" : "outline"}
        onClick={() => setViewMode((v) => (v === "month" ? "employees" : "month"))}
        title="Vue mois"
      >
        <CalendarRange className="h-3.5 w-3.5" />
      </Button>
      <Badge variant="outline">{totalHours}h planifiées</Badge>
    </div>
  );
}

interface PlanningWeekContentProps {
  viewMode: ViewMode;
  employees: Employee[];
  shifts: Shift[];
  weekDays: Date[];
  dayIndex: number;
  cellHeight: number;
  compact: boolean;
  demoMode: boolean;
  onMoveShift: (shiftId: string, toEmployeeId: string, toDate: string) => void;
  onAddShift: (employeeId: string) => void;
  onAddShiftDay: (employeeId: string, date: Date) => void;
  onEditShift: (shift: Shift) => void;
  onTimeChange: (shiftId: string, newStartHour: number, newEndHour: number) => void;
}

export function PlanningWeekContent({
  viewMode,
  employees,
  shifts,
  weekDays,
  dayIndex,
  cellHeight,
  compact,
  demoMode,
  onMoveShift,
  onAddShift,
  onAddShiftDay,
  onEditShift,
  onTimeChange,
}: PlanningWeekContentProps) {
  if (viewMode === "employees")
    return (
      <WeekGrid
        employees={employees}
        shifts={shifts}
        weekDays={weekDays}
        cellHeight={cellHeight}
        onMoveShift={onMoveShift}
        onAddShift={onAddShift}
        onEditShift={onEditShift}
      />
    );
  if (viewMode === "day")
    return (
      <PlanningDayView
        day={weekDays[dayIndex]}
        employees={employees}
        shifts={shifts}
        onAddShift={(empId) => onAddShiftDay(empId, weekDays[dayIndex])}
        onEditShift={onEditShift}
        onTimeChange={onTimeChange}
      />
    );
  if (viewMode === "capacity")
    return <PlanningCapacityView employees={employees} shifts={shifts} weekDays={weekDays} demoMode={demoMode} />;
  return (
    <WeekCoverageGrid
      employees={employees}
      shifts={shifts}
      weekDays={weekDays}
      cellHeight={compact ? CELL_HEIGHT_COVERAGE / 2 : CELL_HEIGHT_COVERAGE}
    />
  );
}
