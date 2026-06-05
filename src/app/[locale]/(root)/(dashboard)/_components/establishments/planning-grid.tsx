"use client";

import { type CSSProperties } from "react";

import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { format, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarDays, Clock, Plus, TrendingUp, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import {
  HOUR_END,
  TIME_MARKERS,
  type Employee,
  type Shift,
  fmtHour,
  pxPerHour,
  shiftHeight,
  shiftTop,
} from "./planning-types";

// ─── Constantes ───────────────────────────────────────────────────────────────

const GRID_LINES_STYLE: CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(to bottom, transparent, transparent 9px, rgba(128,128,128,0.08) 9px, rgba(128,128,128,0.08) 10px)",
};

const COLS = "grid-cols-[180px_36px_repeat(7,1fr)_64px]";

// ─── CurrentTimeLine ──────────────────────────────────────────────────────────

// exported so planning-coverage.tsx can reuse it
export function CurrentTimeLine({ cellHeight }: { cellHeight: number }) {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (minutes > HOUR_END * 60) return null;
  const top = (minutes / 60) * pxPerHour(cellHeight);
  return (
    <div className="pointer-events-none absolute inset-x-0 z-20 flex items-center" style={{ top }}>
      <div className="absolute left-0 h-2 w-2 rounded-full bg-red-500" />
      <div className="h-0.5 w-full bg-red-500/80" />
    </div>
  );
}

// ─── DroppableCell ────────────────────────────────────────────────────────────

function DroppableCell({
  empId,
  dateStr,
  cellHeight,
  today,
  children,
}: {
  empId: string;
  dateStr: string;
  cellHeight: number;
  today: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${empId}__${dateStr}`,
    data: { employeeId: empId, date: dateStr },
  });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative border-b border-l",
        today && "bg-primary/5",
        isOver && "bg-emerald-500/10 ring-2 ring-emerald-500/30 ring-inset",
      )}
      style={{ height: cellHeight, ...GRID_LINES_STYLE }}
    >
      {children}
    </div>
  );
}

// ─── ShiftBlock ───────────────────────────────────────────────────────────────

function ShiftBlock({
  shift,
  color,
  top,
  height,
  col,
  totalCols,
}: {
  shift: Shift;
  color: string;
  top: number;
  height: number;
  col: number;
  totalCols: number;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: shift.id,
    data: { shiftId: shift.id },
  });

  const w = 1 / totalCols;
  const style: CSSProperties = {
    backgroundColor: color,
    top,
    height,
    left: `calc(${col * w * 100}% + 2px)`,
    width: `calc(${w * 100}% - 4px)`,
    opacity: isDragging ? 0.4 : 1,
    transform: transform ? CSS.Transform.toString(transform) : undefined,
    zIndex: isDragging ? 50 : 1,
    cursor: isDragging ? "grabbing" : "grab",
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            ref={setNodeRef}
            className="absolute overflow-hidden rounded-md px-1.5 py-0.5 text-white shadow-sm select-none"
            style={style}
            {...listeners}
            {...attributes}
          >
            <p className="truncate text-[10px] leading-tight font-semibold">{shift.label}</p>
            {height >= 28 && (
              <p className="text-[9px] tabular-nums opacity-80">
                {fmtHour(shift.startHour)}–{fmtHour(shift.endHour)}
              </p>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          <p className="font-semibold">{shift.label}</p>
          <p className="text-muted-foreground">
            {fmtHour(shift.startHour)} → {fmtHour(shift.endHour)} · {shift.endHour - shift.startHour}h
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── EmployeeGridRow ──────────────────────────────────────────────────────────

function EmployeeGridRow({
  emp,
  idx,
  weekDays,
  shifts,
  cellHeight,
  onAddShift,
}: {
  emp: Employee;
  idx: number;
  weekDays: Date[];
  shifts: Shift[];
  cellHeight: number;
  onAddShift: (employeeId: string) => void;
}) {
  const empHours = shifts.filter((s) => s.employeeId === emp.id).reduce((a, s) => a + (s.endHour - s.startHour), 0);

  return (
    <div className={cn("grid", COLS, idx % 2 === 0 ? "bg-background" : "bg-muted/10")}>
      <div className="group flex items-start gap-2 border-b px-3 pt-3 pb-2">
        <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: emp.color }} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{emp.name}</p>
          <p className="text-muted-foreground truncate text-xs">{emp.role}</p>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-5 w-5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
          title="Ajouter un créneau"
          onClick={() => onAddShift(emp.id)}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      <div className="relative border-b border-l" style={{ height: cellHeight }}>
        {TIME_MARKERS.map((h) => (
          <span
            key={h}
            className="text-muted-foreground/50 absolute right-0.5 text-[8px] leading-none"
            style={{ top: shiftTop(h, cellHeight) - 4 }}
          >
            {h}
          </span>
        ))}
      </div>
      {weekDays.map((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const dayShifts = shifts.filter((s) => s.employeeId === emp.id && s.date === dateStr);
        return (
          <DroppableCell
            key={day.toISOString()}
            empId={emp.id}
            dateStr={dateStr}
            cellHeight={cellHeight}
            today={isToday(day)}
          >
            {isToday(day) && <CurrentTimeLine cellHeight={cellHeight} />}
            {dayShifts.map((s, si) => (
              <ShiftBlock
                key={s.id}
                shift={s}
                color={emp.color}
                top={shiftTop(s.startHour, cellHeight)}
                height={shiftHeight(s.startHour, s.endHour, cellHeight)}
                col={si}
                totalCols={dayShifts.length}
              />
            ))}
          </DroppableCell>
        );
      })}
      <div className="flex items-center justify-center border-b border-l" style={{ height: cellHeight }}>
        <span className="text-xs font-semibold tabular-nums">{empHours}h</span>
      </div>
    </div>
  );
}

// ─── WeekStats ────────────────────────────────────────────────────────────────

export function WeekStats({ employees, shifts }: { employees: Employee[]; shifts: Shift[] }) {
  const totalHours = shifts.reduce((a, s) => a + (s.endHour - s.startHour), 0);
  const avgPerEmp = employees.length ? Math.round(totalHours / employees.length) : 0;
  const avgShift = shifts.length ? (totalHours / shifts.length).toFixed(1) : "—";
  const hoursByDay = shifts.reduce<Record<string, number>>((acc, s) => {
    acc[s.date] = (acc[s.date] ?? 0) + (s.endHour - s.startHour);
    return acc;
  }, {});
  const busiestEntry = Object.entries(hoursByDay)
    .sort((a, b) => b[1] - a[1])
    .at(0);
  const busiestLabel = busiestEntry
    ? `${format(new Date(busiestEntry[0]), "EEE d", { locale: fr })} (${busiestEntry[1]}h)`
    : "—";

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[
        { icon: Clock, label: "Heures planifiées", value: `${totalHours}h` },
        { icon: Users, label: "Moy. par employé", value: `${avgPerEmp}h` },
        { icon: TrendingUp, label: "Durée moy. shift", value: `${avgShift}h` },
        { icon: CalendarDays, label: "Jour le + chargé", value: busiestLabel },
      ].map(({ icon: Icon, label, value }) => (
        <Card key={label}>
          <CardContent className="flex items-center gap-3 p-4">
            <Icon className="text-muted-foreground h-4 w-4 shrink-0" />
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">{label}</p>
              <p className="truncate text-sm font-semibold">{value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── WeekGrid ─────────────────────────────────────────────────────────────────

export function WeekGrid({
  employees,
  shifts,
  weekDays,
  cellHeight,
  onMoveShift,
  onAddShift,
}: {
  employees: Employee[];
  shifts: Shift[];
  weekDays: Date[];
  cellHeight: number;
  onMoveShift: (shiftId: string, toEmployeeId: string, toDate: string) => void;
  onAddShift: (employeeId: string) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const drag = active.data.current as { shiftId: string };
    const drop = over.data.current as { employeeId: string; date: string };
    onMoveShift(drag.shiftId, drop.employeeId, drop.date);
  };

  const dayTotalHours = (day: Date) =>
    shifts.filter((s) => s.date === format(day, "yyyy-MM-dd")).reduce((a, s) => a + (s.endHour - s.startHour), 0);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="overflow-x-auto">
        <div className="min-w-[820px]">
          <div className={cn("grid border-b", COLS)}>
            <div className="bg-muted/40 text-muted-foreground px-3 py-2.5 text-xs font-medium">Employé</div>
            <div className="bg-muted/40 border-l" />
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
            <div className="bg-muted/40 text-muted-foreground border-l px-2 py-2 text-center text-xs font-medium">
              Total
            </div>
          </div>

          {employees.map((emp, idx) => (
            <EmployeeGridRow
              key={emp.id}
              emp={emp}
              idx={idx}
              weekDays={weekDays}
              shifts={shifts}
              cellHeight={cellHeight}
              onAddShift={onAddShift}
            />
          ))}

          <div className={cn("bg-muted/30 grid", COLS)}>
            <div className="text-muted-foreground px-3 py-2 text-xs font-semibold">Total / jour</div>
            <div className="border-t border-l" />
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className={cn("border-t border-l px-2 py-2 text-center", isToday(day) && "bg-primary/5")}
              >
                <span className="text-muted-foreground text-xs font-semibold tabular-nums">{dayTotalHours(day)}h</span>
              </div>
            ))}
            <div className="border-t border-l px-2 py-2 text-center">
              <span className="text-xs font-bold tabular-nums">
                {shifts.reduce((a, s) => a + (s.endHour - s.startHour), 0)}h
              </span>
            </div>
          </div>
        </div>
      </div>
    </DndContext>
  );
}
