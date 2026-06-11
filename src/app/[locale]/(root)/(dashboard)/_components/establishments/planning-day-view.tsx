"use client";

import { useCallback, useEffect, useRef } from "react";

import {
  DndContext,
  PointerSensor,
  type DragEndEvent,
  type Modifier,
  useDraggable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { format, isToday } from "date-fns";
import { fr } from "date-fns/locale";

import { cn } from "@/lib/utils";

import { CurrentTimeLine } from "./planning-grid";
import { fmtHour, shiftHeight, shiftLabel, shiftTop, type Employee, type Shift } from "./planning-types";

const PX_PER_HOUR = 80;
const TOTAL_H = PX_PER_HOUR * 24;
const SNAP_PX = PX_PER_HOUR / 4; // 15 min = 20px
const HOUR_LABEL_W = 56;
const EMP_COL_MIN_W = 130;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HALF_HOURS = Array.from({ length: 48 }, (_, i) => i * 0.5);

// Snap vertical à 15 minutes
const snapToQuarterHour: Modifier = ({ transform }) => ({
  ...transform,
  y: Math.round(transform.y / SNAP_PX) * SNAP_PX,
});

// ─── DraggableShiftBlock ──────────────────────────────────────────────────────

function DraggableShiftBlock({ shift, color, onEdit }: { shift: Shift; color: string; onEdit: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: shift.id });

  const top = shiftTop(shift.startHour, TOTAL_H) + (transform?.y ?? 0);
  const height = Math.max(shiftHeight(shift.startHour, Math.min(shift.endHour, 24), TOTAL_H), SNAP_PX);

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "absolute inset-x-1 rounded-sm px-1.5 pt-0.5 transition-shadow select-none",
        isDragging ? "z-50 cursor-grabbing opacity-75 shadow-xl" : "cursor-grab hover:brightness-110",
      )}
      style={{ backgroundColor: color, top, height, opacity: isDragging ? 0.75 : 0.88 }}
      onClick={(e) => {
        if (!isDragging) {
          e.stopPropagation();
          onEdit();
        }
      }}
    >
      <p className="truncate text-[10px] leading-tight font-semibold text-white">
        {shiftLabel(shift.label, shift.startHour, shift.endHour)}
      </p>
      {height >= 32 && shift.label !== "" && (
        <p className="truncate text-[9px] text-white/80">
          {fmtHour(shift.startHour)}–{fmtHour(Math.min(shift.endHour, 24))}
        </p>
      )}
    </div>
  );
}

// ─── PlanningDayView ──────────────────────────────────────────────────────────

interface DayViewProps {
  day: Date;
  employees: Employee[];
  shifts: Shift[];
  onAddShift: (employeeId: string) => void;
  onEditShift: (shift: Shift) => void;
  onTimeChange: (shiftId: string, newStartHour: number, newEndHour: number) => void;
}

export function PlanningDayView({ day, employees, shifts, onAddShift, onEditShift, onTimeChange }: DayViewProps) {
  const today = isToday(day);
  const dateStr = format(day, "yyyy-MM-dd");
  const dayShifts = shifts.filter((s) => s.date === dateStr);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cols = `${HOUR_LABEL_W}px repeat(${employees.length}, 1fr)`;
  const minW = HOUR_LABEL_W + employees.length * EMP_COL_MIN_W;

  // Scroll vers l'heure actuelle au chargement
  useEffect(() => {
    const now = new Date();
    const targetTop = today ? Math.max(0, (now.getHours() - 1) * PX_PER_HOUR) : 7 * PX_PER_HOUR; // 7h par défaut
    scrollRef.current?.scrollTo({ top: targetTop, behavior: "smooth" });
  }, [today, dateStr]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, delta } = event;
      if (Math.abs(delta.y) < 1) return;
      const shiftId = String(active.id);
      const shift = dayShifts.find((s) => s.id === shiftId);
      if (!shift) return;
      const rawDeltaH = delta.y / PX_PER_HOUR;
      const snappedDeltaH = Math.round(rawDeltaH * 4) / 4;
      if (snappedDeltaH === 0) return;
      const duration = shift.endHour - shift.startHour;
      const newStart = Math.max(0, Math.min(23.75, shift.startHour + snappedDeltaH));
      onTimeChange(shiftId, newStart, newStart + duration);
    },
    [dayShifts, onTimeChange],
  );

  return (
    <DndContext sensors={sensors} modifiers={[restrictToVerticalAxis, snapToQuarterHour]} onDragEnd={handleDragEnd}>
      <div className="overflow-x-auto">
        <div style={{ minWidth: minW }}>
          {/* En-tête employés — fixe */}
          <div className="grid border-b" style={{ gridTemplateColumns: cols }}>
            <div
              className={cn(
                "bg-muted/40 px-2 py-2 text-xs font-medium",
                today ? "text-primary" : "text-muted-foreground",
              )}
            >
              {format(day, "d MMM", { locale: fr })}
            </div>
            {employees.map((emp) => (
              <div key={emp.id} className="bg-muted/40 border-l px-2 py-2 text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: emp.color }} />
                  <span className="truncate text-xs font-medium">{emp.name}</span>
                </div>
                <span className="text-muted-foreground text-[10px]">{emp.role}</span>
              </div>
            ))}
          </div>

          {/* Corps scrollable */}
          <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 280px)" }}>
            <div className="relative grid" style={{ gridTemplateColumns: cols, height: TOTAL_H }}>
              {/* Colonne heures — sticky gauche */}
              <div className="bg-background sticky left-0 z-10 border-r" style={{ height: TOTAL_H }}>
                {HOURS.map((h) => (
                  <div key={h} className="absolute right-0 w-full border-t" style={{ top: h * PX_PER_HOUR }}>
                    <span className="text-muted-foreground/70 absolute right-1.5 -translate-y-1/2 text-[10px] tabular-nums">
                      {String(h).padStart(2, "0")}h
                    </span>
                  </div>
                ))}
                {/* demi-heures */}
                {HALF_HOURS.filter((h) => h % 1 !== 0).map((h) => (
                  <div
                    key={h}
                    className="absolute right-0 w-full border-t border-dashed border-gray-200/50 dark:border-gray-700/40"
                    style={{ top: h * PX_PER_HOUR }}
                  />
                ))}
              </div>

              {/* Colonnes employés */}
              {employees.map((emp) => {
                const empShifts = dayShifts.filter((s) => s.employeeId === emp.id);
                return (
                  <div
                    key={emp.id}
                    className={cn("relative overflow-hidden border-l", today && "bg-primary/[0.03]")}
                    style={{ height: TOTAL_H }}
                    onClick={() => onAddShift(emp.id)}
                  >
                    {/* Lignes heures */}
                    {HOURS.map((h) => (
                      <div
                        key={h}
                        className="absolute inset-x-0 border-t border-gray-100 dark:border-gray-800"
                        style={{ top: h * PX_PER_HOUR }}
                      />
                    ))}
                    {/* Lignes demi-heures */}
                    {HALF_HOURS.filter((h) => h % 1 !== 0).map((h) => (
                      <div
                        key={h}
                        className="absolute inset-x-0 border-t border-dashed border-gray-100/60 dark:border-gray-800/60"
                        style={{ top: h * PX_PER_HOUR }}
                      />
                    ))}
                    {today && <CurrentTimeLine cellHeight={TOTAL_H} />}
                    {empShifts.map((shift) => (
                      <DraggableShiftBlock
                        key={shift.id}
                        shift={shift}
                        color={emp.color}
                        onEdit={() => onEditShift(shift)}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer totaux */}
          <div className="bg-muted/20 grid border-t" style={{ gridTemplateColumns: cols }}>
            <div className="px-2 py-1.5" />
            {employees.map((emp) => {
              const h = dayShifts
                .filter((s) => s.employeeId === emp.id)
                .reduce((acc, s) => acc + Math.min(s.endHour, 24) - s.startHour, 0);
              return (
                <div key={emp.id} className="border-l px-2 py-1.5 text-center">
                  <span className="text-muted-foreground text-xs">{h > 0 ? `${h}h` : "—"}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DndContext>
  );
}
