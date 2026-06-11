"use client";

import { useMemo, useState } from "react";

import { format, isToday } from "date-fns";
import { fr } from "date-fns/locale";

import { cn } from "@/lib/utils";

import { fmtHour, type Employee, type Shift } from "./planning-types";

const SVG_W = 1000;
const CHART_H = 120; // hauteur fixe en px logiques (viewBox)
const BOTTOM_PAD = 4;
const HOUR_TICKS = [0, 6, 12, 18, 24];
export const COVERS_DEFAULT = 30;

export type BookingPoint = { hour: number; covers: number };

// Données test — à remplacer par les données DB en phase 2
const MOCK_BOOKINGS: BookingPoint[] = [
  { hour: 12, covers: 10 },
  { hour: 13, covers: 30 },
  { hour: 14, covers: 20 },
  { hour: 19, covers: 10 },
  { hour: 20, covers: 40 },
  { hour: 21, covers: 35 },
  { hour: 22, covers: 20 },
];

function xc(h: number): number {
  return (h / 24) * SVG_W;
}

function buildAreaPath(yVals: number[], bottom: number): string {
  if (yVals.length === 0) return "";
  let d = `M 0 ${bottom} V ${yVals[0]}`;
  for (let i = 1; i < yVals.length; i++) {
    d += ` H ${xc(i)} V ${yVals[i]}`;
  }
  return d + ` H ${SVG_W} V ${bottom} Z`;
}

function buildLinePath(yVals: number[]): string {
  if (yVals.length === 0) return "";
  let d = `M 0 ${yVals[0]}`;
  for (let i = 1; i < yVals.length; i++) {
    d += ` H ${xc(i)} V ${yVals[i]}`;
  }
  return d + ` H ${SVG_W}`;
}

interface CapacityPoint {
  hour: number;
  count: number;
  capacity: number;
  active: Employee[];
}

// ─── DayTooltip ───────────────────────────────────────────────────────────────

function DayTooltip({
  hour,
  hovered,
  bookingsByHour,
}: {
  hour: number;
  hovered: CapacityPoint;
  bookingsByHour: number[];
}) {
  const demand = bookingsByHour.at(hour) ?? 0;
  const over = demand > hovered.capacity;
  const leftPct = Math.min((hour / 24) * 100, 72);

  return (
    <div
      className="bg-popover pointer-events-none absolute top-1 z-50 min-w-[150px] rounded-md border px-2.5 py-2 text-xs shadow-md"
      style={{ left: `calc(${leftPct}% + 6px)` }}
    >
      <p className="font-semibold">
        {fmtHour(hour)} – {fmtHour(hour + 1)}
      </p>
      <div className="mt-1.5 space-y-1">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-sm bg-gray-400/60" />
          <span className="text-muted-foreground">
            Capacité : <strong className="text-foreground">{hovered.capacity}</strong> cvts
            {hovered.count > 0 && <span> ({hovered.count} serv.)</span>}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-full bg-[#f97316]" />
          <span className="text-muted-foreground">
            Réservations : <strong className={over ? "text-destructive" : "text-foreground"}>{demand}</strong> cvts
          </span>
        </div>
        {over && <p className="text-destructive mt-1 font-medium">⚠ Demande &gt; capacité</p>}
      </div>
      {hovered.active.length > 0 && (
        <div className="mt-2 border-t pt-1.5">
          {hovered.active.map((emp) => (
            <div key={emp.id} className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: emp.color }} />
              <span className="text-muted-foreground truncate">{emp.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── DayRow ───────────────────────────────────────────────────────────────────

interface DayRowProps {
  day: Date;
  employees: Employee[];
  dayShifts: Shift[];
  coversPerServer: number;
  bookings: BookingPoint[];
}

function DayRow({ day, employees, dayShifts, coversPerServer, bookings }: DayRowProps) {
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);
  const today = isToday(day);

  // Données capacité pour le tooltip
  const capacityData = useMemo<CapacityPoint[]>(
    () =>
      Array.from({ length: 24 }, (_, h) => {
        const active = employees.filter((emp) =>
          dayShifts.some((s) => s.employeeId === emp.id && s.startHour <= h && s.endHour > h),
        );
        return { hour: h, count: active.length, capacity: active.length * coversPerServer, active };
      }),
    [employees, dayShifts, coversPerServer],
  );

  // Barres empilées par heure — chaque employé actif ajoute une tranche
  const hourBars = useMemo(
    () =>
      Array.from({ length: 24 }, (_, hour) => {
        const bars: { emp: Employee; stackIdx: number }[] = [];
        let stackIdx = 0;
        for (const emp of employees) {
          if (dayShifts.some((s) => s.employeeId === emp.id && s.startHour <= hour && s.endHour > hour)) {
            bars.push({ emp, stackIdx });
            stackIdx++;
          }
        }
        return { hour, bars };
      }),
    [employees, dayShifts],
  );

  const bookingsByHour = useMemo(
    () => Array.from({ length: 24 }, (_, h) => bookings.find((b) => b.hour === h)?.covers ?? 0),
    [bookings],
  );

  // Échelle partagée : 1 couvert = pxPerCover logiques
  const maxCapacity = employees.length * coversPerServer;
  const maxDemand = Math.max(...bookingsByHour, 1);
  const maxScale = Math.max(maxCapacity, maxDemand, 1);
  const pxPerCover = CHART_H / maxScale;
  // Hauteur d'une tranche = couverts d'un serveur × échelle
  const sliceH = coversPerServer * pxPerCover;
  const totalH = CHART_H + BOTTOM_PAD;

  // Courbe réservations sur la même échelle
  const { bookArea, bookLine } = useMemo(() => {
    const yVals = bookingsByHour.map((covers) => CHART_H - covers * pxPerCover);
    return { bookArea: buildAreaPath(yVals, CHART_H), bookLine: buildLinePath(yVals) };
  }, [bookingsByHour, pxPerCover]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const h = Math.min(23, Math.max(0, Math.floor(((e.clientX - rect.left) / rect.width) * 24)));
    setHoveredHour(h);
  };

  const hovered: CapacityPoint | null = hoveredHour !== null ? (capacityData.at(hoveredHour) ?? null) : null;

  return (
    <div className={cn("flex items-stretch border-b last:border-b-0", today && "bg-primary/5")}>
      {/* Day label */}
      <div
        className={cn(
          "flex w-20 shrink-0 flex-col items-center justify-center border-r px-2 py-1",
          today && "bg-primary/10",
        )}
      >
        <span className={cn("text-xs font-medium capitalize", today ? "text-primary" : "text-muted-foreground")}>
          {format(day, "EEE", { locale: fr })}
        </span>
        <span className={cn("text-lg leading-tight font-bold tabular-nums", today && "text-primary")}>
          {format(day, "d")}
        </span>
        <span className="text-muted-foreground text-[10px]">{format(day, "MMM", { locale: fr })}</span>
      </div>

      {/* SVG timeline */}
      <div className="relative flex-1">
        <svg
          viewBox={`0 0 ${SVG_W} ${totalH}`}
          width="100%"
          height={totalH}
          preserveAspectRatio="none"
          className="block cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredHour(null)}
        >
          {/* Hour grid lines */}
          {HOUR_TICKS.map((h) => (
            <line key={h} x1={xc(h)} y1={0} x2={xc(h)} y2={totalH} stroke="rgba(128,128,128,0.12)" strokeWidth={1} />
          ))}

          {/* Heure actuelle */}
          {today &&
            (() => {
              const now = new Date();
              const nowH = now.getHours() + now.getMinutes() / 60;
              return (
                <line
                  x1={xc(nowH)}
                  y1={0}
                  x2={xc(nowH)}
                  y2={totalH}
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth={2}
                  strokeDasharray="5 3"
                />
              );
            })()}

          {/* Barres empilées par employé — = courbe de capacité */}
          {hourBars.map(({ hour, bars }) =>
            bars.map(({ emp, stackIdx }) => (
              <rect
                key={`${hour}-${emp.id}`}
                x={xc(hour) + 1}
                y={CHART_H - (stackIdx + 1) * sliceH}
                width={Math.max(1, xc(hour + 1) - xc(hour) - 2)}
                height={sliceH}
                fill={emp.color}
                opacity={0.72}
              />
            )),
          )}

          {/* Courbe réservations (orange) — même échelle que les barres */}
          {bookArea && (
            <>
              <path d={bookArea} fill="#f97316" opacity={0.18} />
              <path d={bookLine} fill="none" stroke="#f97316" strokeWidth={2.5} strokeLinejoin="round" />
            </>
          )}

          {/* Hover line */}
          {hoveredHour !== null && (
            <line
              x1={xc(hoveredHour)}
              y1={0}
              x2={xc(hoveredHour)}
              y2={totalH}
              stroke="hsl(var(--foreground))"
              strokeWidth={1}
              opacity={0.2}
            />
          )}
        </svg>

        {hovered !== null && <DayTooltip hour={hoveredHour!} hovered={hovered} bookingsByHour={bookingsByHour} />}
      </div>
    </div>
  );
}

// ─── PlanningCapacityView ─────────────────────────────────────────────────────

export function PlanningCapacityView({
  employees,
  shifts,
  weekDays,
  coversPerServer = COVERS_DEFAULT,
  bookings: dbBookings,
  demoMode = true,
}: {
  employees: Employee[];
  shifts: Shift[];
  weekDays: Date[];
  coversPerServer?: number;
  bookings?: BookingPoint[];
  demoMode?: boolean;
}) {
  const activeBookings = demoMode ? MOCK_BOOKINGS : (dbBookings ?? []);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[500px]">
        {/* Hour axis header */}
        <div className="bg-muted/40 flex border-b">
          <div className="w-20 shrink-0 border-r px-2 py-1.5">
            <span className="text-muted-foreground text-xs font-medium">Jour</span>
          </div>
          <div className="relative flex-1 py-1.5 pr-1">
            {HOUR_TICKS.filter((h) => h < 24).map((h) => (
              <span
                key={h}
                className="text-muted-foreground absolute -translate-x-1/2 text-[10px]"
                style={{ left: `${(h / 24) * 100}%` }}
              >
                {String(h).padStart(2, "0")}h
              </span>
            ))}
          </div>
        </div>

        {/* One row per day */}
        {weekDays.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const dayShifts = shifts.filter((s) => s.date === dateStr);
          return (
            <DayRow
              key={dateStr}
              day={day}
              employees={employees}
              dayShifts={dayShifts}
              coversPerServer={coversPerServer}
              bookings={activeBookings}
            />
          );
        })}

        {/* Legend */}
        <div className="bg-muted/20 flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-3 py-2">
          <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <svg width="16" height="8" className="shrink-0">
              <line x1="0" y1="4" x2="16" y2="4" stroke="#f97316" strokeWidth={2} />
            </svg>
            Réservations{demoMode ? <span className="ml-1 text-[#f97316]">(démo)</span> : null}
          </span>
          <span className="text-muted-foreground text-xs">
            Capacité = barres empilées ({coversPerServer} cvts/serveur)
          </span>
          {employees.slice(0, 4).map((emp) => (
            <span key={emp.id} className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: emp.color }} />
              {emp.name}
            </span>
          ))}
          {employees.length > 4 && (
            <span className="text-muted-foreground text-xs">+{employees.length - 4} autres</span>
          )}
        </div>
      </div>
    </div>
  );
}
