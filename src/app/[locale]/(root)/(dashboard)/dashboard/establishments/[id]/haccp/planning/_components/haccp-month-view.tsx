"use client";

import { format, isSameMonth, isToday } from "date-fns";

import { CAT_DOT, type HaccpTask, getMonthCalendarDays, getTasksForDate } from "./haccp-planning-types";

const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MAX_VISIBLE = 3;

interface Props {
  monthStart: Date;
  tasks: HaccpTask[];
  onDayClick?: (date: Date) => void;
}

export function MonthView({ monthStart, tasks, onDayClick }: Props) {
  const days = getMonthCalendarDays(monthStart);

  return (
    <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
      {/* Day name headers */}
      <div className="bg-muted/30 grid grid-cols-7 border-b">
        {DAY_NAMES.map((d) => (
          <div
            key={d}
            className="text-muted-foreground border-l py-2.5 text-center text-xs font-semibold tracking-wider uppercase first:border-l-0"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const today = isToday(day);
          const inMonth = isSameMonth(day, monthStart);
          const dayTasks = getTasksForDate(tasks, day);
          const visible = dayTasks.slice(0, MAX_VISIBLE);
          const overflow = dayTasks.length - MAX_VISIBLE;

          return (
            <button
              key={i}
              type="button"
              onClick={() => onDayClick?.(day)}
              className={`hover:bg-muted/40 min-h-[110px] border-t border-l p-2 text-left transition-colors first:border-l-0 ${
                !inMonth ? "bg-muted/30" : ""
              }`}
            >
              <div className="mb-1.5 flex items-center justify-between">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    today ? "bg-blue-600 text-white" : inMonth ? "text-foreground" : "text-muted-foreground/50"
                  }`}
                >
                  {format(day, "d")}
                </span>
                {dayTasks.length > 0 && <span className="text-muted-foreground text-xs">{dayTasks.length}</span>}
              </div>

              <div className="space-y-0.5">
                {visible.map((task) => (
                  <div
                    key={task.id}
                    className="bg-muted flex items-center gap-1 overflow-hidden rounded-sm px-1 py-0.5"
                  >
                    <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${CAT_DOT[task.category]}`} />
                    <span className="text-foreground/80 truncate text-xs">{task.title}</span>
                  </div>
                ))}
                {overflow > 0 && (
                  <p className="text-muted-foreground pl-0.5 text-xs">
                    +{overflow} autre{overflow > 1 ? "s" : ""}
                  </p>
                )}
              </div>

              {today && dayTasks.length === 0 && (
                <div className="mt-1 h-0.5 w-full rounded-full bg-blue-200 dark:bg-blue-700/50" />
              )}
            </button>
          );
        })}
      </div>

      <div className="bg-muted/20 text-muted-foreground border-t px-4 py-2 text-xs">
        Cliquer sur un jour pour voir le détail en vue journée
      </div>
    </div>
  );
}
