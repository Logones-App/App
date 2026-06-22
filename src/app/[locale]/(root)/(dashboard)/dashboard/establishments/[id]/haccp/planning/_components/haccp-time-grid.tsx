"use client";

import { format, isToday } from "date-fns";
import { fr } from "date-fns/locale";

import {
  CAT_STYLE,
  type HaccpTask,
  type TaskStatus,
  fmtHour,
  getTaskStatus,
  getTasksForDate,
} from "./haccp-planning-types";

const HOUR_HEIGHT = 60;
const START_H = 6;
const END_H = 23;
const HOURS = Array.from({ length: END_H - START_H + 1 }, (_, i) => START_H + i);
const TOTAL_H = (END_H - START_H + 1) * HOUR_HEIGHT;

const STATUS_OVERLAY: Record<TaskStatus, string> = {
  fait: "opacity-50",
  "en retard": "ring-1 ring-red-400 border border-red-300",
  "à faire": "",
  planifié: "opacity-75",
};

interface Props {
  days: Date[];
  tasks: HaccpTask[];
  onTaskClick?: (task: HaccpTask) => void;
}

export function TimeGrid({ days, tasks, onTaskClick }: Props) {
  const colCount = days.length;
  const isSingle = colCount === 1;

  return (
    <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
      {/* Day headers */}
      <div
        className="bg-muted/30 border-b"
        style={{ display: "grid", gridTemplateColumns: `52px repeat(${colCount}, 1fr)` }}
      >
        <div className="border-r" />
        {days.map((day, i) => {
          const today = isToday(day);
          return (
            <div key={i} className={`border-l py-2 text-center ${today ? "bg-blue-50 dark:bg-blue-950/30" : ""}`}>
              {!isSingle && (
                <p
                  className={`text-xs font-semibold tracking-wider uppercase ${today ? "text-blue-500 dark:text-blue-400" : "text-muted-foreground"}`}
                >
                  {format(day, "EEE", { locale: fr })}
                </p>
              )}
              <p
                className={`font-bold ${today ? "text-blue-700 dark:text-blue-300" : "text-foreground"} ${isSingle ? "text-base" : "text-sm"}`}
              >
                {isSingle ? format(day, "EEEE d MMMM yyyy", { locale: fr }) : format(day, "d")}
              </p>
            </div>
          );
        })}
      </div>

      {/* Scrollable time grid */}
      <div className="overflow-y-auto" style={{ maxHeight: "580px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `52px repeat(${colCount}, 1fr)`,
            height: `${TOTAL_H}px`,
          }}
        >
          {/* Time labels */}
          <div className="bg-muted/20 relative border-r">
            {HOURS.map((h) => (
              <div
                key={h}
                className="text-muted-foreground/70 absolute right-1.5 text-right text-xs select-none"
                style={{ top: `${(h - START_H) * HOUR_HEIGHT - 8}px` }}
              >
                {h}h
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, dayIdx) => {
            const dayTasks = getTasksForDate(tasks, day);
            const today = isToday(day);
            return (
              <div key={dayIdx} className={`relative border-l ${today ? "bg-blue-50/30 dark:bg-blue-950/20" : ""}`}>
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="border-border/40 absolute inset-x-0 border-t"
                    style={{ top: `${(h - START_H) * HOUR_HEIGHT}px` }}
                  />
                ))}
                {today && <CurrentTimeLine />}
                {dayTasks.map((task) => (
                  <TaskBlock key={task.id} task={task} date={day} onClick={onTaskClick} />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TaskBlock({ task, date, onClick }: { task: HaccpTask; date: Date; onClick?: (task: HaccpTask) => void }) {
  const status = getTaskStatus(task, date);
  const top = (task.startHour - START_H) * HOUR_HEIGHT + 1;
  const height = Math.max((task.endHour - task.startHour) * HOUR_HEIGHT - 3, 18);

  const style = CAT_STYLE[task.category];
  const overlay = STATUS_OVERLAY[status];

  return (
    <button
      type="button"
      onClick={() => onClick?.(task)}
      className={`absolute inset-x-0.5 overflow-hidden rounded-sm px-1.5 py-0.5 text-left text-xs transition-all hover:z-10 hover:shadow-md ${style} ${overlay}`}
      style={{ top: `${top}px`, height: `${height}px` }}
      title={`${task.title} — ${task.responsible} (${status})`}
    >
      <p className="truncate leading-tight font-semibold">{task.title}</p>
      {height > 32 && (
        <p className="truncate leading-tight opacity-70">
          {fmtHour(task.startHour)} · {task.responsible}
        </p>
      )}
    </button>
  );
}

function CurrentTimeLine() {
  const now = new Date();
  const h = now.getHours() + now.getMinutes() / 60;
  if (h < START_H || h > END_H) return null;
  const top = (h - START_H) * HOUR_HEIGHT;
  return (
    <div className="pointer-events-none absolute inset-x-0 z-20 flex items-center" style={{ top: `${top}px` }}>
      <div className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
      <div className="h-px flex-1 bg-red-500 opacity-60" />
    </div>
  );
}
