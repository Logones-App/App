"use client";

import { useMemo, useState } from "react";

import { addDays, addMonths, addWeeks, format, startOfMonth, startOfWeek, subMonths, subWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { MonthView } from "./haccp-month-view";
import { INITIAL_TASKS, type HaccpTask, type ViewMode, getWeekDays } from "./haccp-planning-types";
import { HaccpTaskModal } from "./haccp-task-modal";
import { TimeGrid } from "./haccp-time-grid";

const VIEW_MODES: { value: ViewMode; label: string }[] = [
  { value: "day", label: "Jour" },
  { value: "week", label: "Semaine" },
  { value: "month", label: "Mois" },
];

export function HaccpPlanning() {
  const [tasks, setTasks] = useState<HaccpTask[]>(INITIAL_TASKS);
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [monthStart, setMonthStart] = useState(() => startOfMonth(new Date()));
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<HaccpTask | null>(null);

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);

  function goToToday() {
    const now = new Date();
    setCurrentDate(now);
    setWeekStart(startOfWeek(now, { weekStartsOn: 1 }));
    setMonthStart(startOfMonth(now));
  }

  function goPrev() {
    if (viewMode === "day") setCurrentDate((d) => addDays(d, -1));
    else if (viewMode === "week") setWeekStart((w) => subWeeks(w, 1));
    else setMonthStart((m) => subMonths(m, 1));
  }

  function goNext() {
    if (viewMode === "day") setCurrentDate((d) => addDays(d, 1));
    else if (viewMode === "week") setWeekStart((w) => addWeeks(w, 1));
    else setMonthStart((m) => addMonths(m, 1));
  }

  function getNavLabel(): string {
    if (viewMode === "day") return format(currentDate, "EEEE d MMMM yyyy", { locale: fr });
    if (viewMode === "week") {
      const end = addDays(weekStart, 6);
      return `${format(weekStart, "d MMM", { locale: fr })} — ${format(end, "d MMM yyyy", { locale: fr })}`;
    }
    return format(monthStart, "MMMM yyyy", { locale: fr });
  }

  function handleSaveTask(taskData: Omit<HaccpTask, "id">) {
    if (editingTask) {
      setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? { ...taskData, id: editingTask.id } : t)));
    } else {
      const id = `task-${Date.now()}`;
      setTasks((prev) => [...prev, { ...taskData, id }]);
    }
  }

  function openEdit(task: HaccpTask) {
    setEditingTask(task);
    setModalOpen(true);
  }

  function openNew() {
    setEditingTask(null);
    setModalOpen(true);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={goPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={goToToday}>
            Aujourd&apos;hui
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={goNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-foreground ml-1 text-sm font-semibold capitalize">{getNavLabel()}</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border shadow-sm">
            {VIEW_MODES.map((vm) => (
              <button
                key={vm.value}
                type="button"
                onClick={() => setViewMode(vm.value)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  viewMode === vm.value
                    ? "bg-foreground text-background"
                    : "bg-background text-muted-foreground hover:bg-muted/50"
                }`}
              >
                {vm.label}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={openNew} className="h-8 gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Nouvelle tâche
          </Button>
        </div>
      </div>

      {/* Views */}
      {viewMode === "day" && <TimeGrid days={[currentDate]} tasks={tasks} onTaskClick={openEdit} />}
      {viewMode === "week" && <TimeGrid days={weekDays} tasks={tasks} onTaskClick={openEdit} />}
      {viewMode === "month" && (
        <MonthView
          monthStart={monthStart}
          tasks={tasks}
          onDayClick={(date) => {
            setCurrentDate(date);
            setViewMode("day");
          }}
        />
      )}

      {/* Legend */}
      <div className="bg-muted/40 flex flex-wrap gap-x-4 gap-y-1.5 rounded-lg border px-4 py-2.5 text-xs">
        {(
          [
            { label: "Fait", cls: "bg-gray-400 opacity-50" },
            { label: "À faire", cls: "bg-gray-400" },
            { label: "En retard", cls: "bg-red-400 ring-1 ring-red-400" },
            { label: "Planifié", cls: "bg-gray-400 opacity-75" },
          ] as const
        ).map(({ label, cls }) => (
          <span key={label} className="text-muted-foreground flex items-center gap-1.5">
            <span className={`inline-block h-3 w-3 rounded-sm ${cls}`} />
            {label}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-gray-600">
          <span className="inline-block h-0.5 w-4 rounded bg-red-500" />
          Heure actuelle
        </span>
      </div>

      <HaccpTaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveTask}
        initialTask={editingTask}
      />
    </div>
  );
}
