"use client";

import { useCallback, useMemo, useState } from "react";

import { addWeeks, format, startOfMonth, startOfWeek, subDays, subWeeks } from "date-fns";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useEstablishmentEmployees } from "@/lib/queries/employees-queries";
import {
  useCreateShift,
  useCreateShiftOverride,
  useDeleteShift,
  useDeleteShiftOverride,
  useEmployeeShiftTemplates,
  useEmployeeShifts,
  useShiftOverrides,
  useUpdateShift,
  useUpdateShiftOverride,
} from "@/lib/queries/planning-queries";

import { BackToEstablishmentButton } from "./back-to-establishment-button";
import { WeekStats } from "./planning-grid";
import { PlanningNav, PlanningToolbar, PlanningWeekContent } from "./planning-header";
import { MobileDayView } from "./planning-mobile-day-view";
import { MonthGrid } from "./planning-month";
import { ShiftEditModal } from "./planning-shift-edit-modal";
import { ShiftCreateModal } from "./planning-shift-modal";
import {
  CELL_HEIGHT_COMFORTABLE,
  CELL_HEIGHT_COMPACT,
  MOCK_EMPLOYEES,
  type Employee,
  type RecurrenceEditMode,
  type Shift,
  type CreateShiftPayload,
  type UpdateShiftPayload,
  type ViewMode,
  expandShiftsForWeek,
  getEmployeeColor,
  getMonthCalendarDays,
  getWeekDays,
  hasShiftOverlap,
} from "./planning-types";
import { usePlanningRealtime } from "./use-planning-realtime";

export function PlanningSchedule({
  establishmentId,
  organizationId,
}: {
  establishmentId: string;
  organizationId: string;
}) {
  const { data: dbEmployees = [] } = useEstablishmentEmployees(establishmentId, organizationId);
  const { data: dbShifts = [] } = useEmployeeShifts(establishmentId, organizationId);
  const { data: templates = [] } = useEmployeeShiftTemplates(establishmentId, organizationId);

  const createShift = useCreateShift(establishmentId, organizationId);
  const updateShift = useUpdateShift(establishmentId, organizationId);
  const deleteShift = useDeleteShift(establishmentId, organizationId);

  usePlanningRealtime(establishmentId, organizationId);

  const { data: dbOverrides = [] } = useShiftOverrides(establishmentId, organizationId);
  const createShiftOverride = useCreateShiftOverride(establishmentId, organizationId);
  const updateShiftOverride = useUpdateShiftOverride(establishmentId, organizationId);
  const deleteShiftOverride = useDeleteShiftOverride(establishmentId, organizationId);

  const allEmployees = useMemo<Employee[]>(
    () =>
      dbEmployees.length > 0
        ? dbEmployees.map((e, idx) => ({
            id: e.id,
            name: `${e.lastname} ${e.firstname}`,
            role: e.job_title ?? e.role ?? "",
            color: getEmployeeColor(idx),
          }))
        : MOCK_EMPLOYEES,
    [dbEmployees],
  );

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [compact, setCompact] = useState(false);
  const [visibleIds, setVisibleIds] = useState<Set<string> | null>(null);
  const [dayIndex, setDayIndex] = useState(() => {
    const d = new Date().getDay();
    return d === 0 ? 6 : d - 1;
  });
  const [monthStart, setMonthStart] = useState(() => startOfMonth(new Date()));
  const [addModalEmployeeId, setAddModalEmployeeId] = useState<string | null>(null);
  const [addModalDate, setAddModalDate] = useState<Date | undefined>(undefined);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("employees");
  const [demoMode, setDemoMode] = useState(true);
  const [pendingMove, setPendingMove] = useState<{
    shift: Shift;
    toEmployeeId: string;
    toDate: string;
  } | null>(null);

  const cellHeight = compact ? CELL_HEIGHT_COMPACT : CELL_HEIGHT_COMFORTABLE;
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const weekEnd = weekDays[6];

  const monthCalendarDays = useMemo(() => getMonthCalendarDays(monthStart), [monthStart]);

  // Shifts DB → occurrences (semaine ou mois selon le mode)
  const shifts = useMemo(
    () => expandShiftsForWeek(dbShifts, viewMode === "month" ? monthCalendarDays : weekDays, dbOverrides),
    [dbShifts, viewMode, weekDays, monthCalendarDays, dbOverrides],
  );

  const visibleEmployees = useMemo(
    () => (visibleIds === null ? allEmployees : allEmployees.filter((e) => visibleIds.has(e.id))),
    [visibleIds, allEmployees],
  );
  const visibleShifts = useMemo(
    () => (visibleIds === null ? shifts : shifts.filter((s) => visibleIds.has(s.employeeId))),
    [shifts, visibleIds],
  );
  const totalHours = visibleShifts.reduce((a, s) => a + (s.endHour - s.startHour), 0);

  const changeWeek = (newStart: Date) => setWeekStart(newStart);

  const toggleEmployee = (id: string) =>
    setVisibleIds((prev) => {
      const current = prev ?? new Set(allEmployees.map((e) => e.id));
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      // Si tous cochés → revenir à null (tous visibles par défaut)
      return next.size === allEmployees.length ? null : next;
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

  const doMove = useCallback(
    (s: Shift, toEmployeeId: string, toDate: string) => {
      const updates: Record<string, unknown> = { id: s.dbId, employee_id: toEmployeeId };
      if (!s.isRecurring && toDate !== s.date) updates.date_start = toDate;
      updateShift.mutate(updates as Parameters<typeof updateShift.mutate>[0], {
        onError: () => toast.error("Erreur lors du déplacement du créneau"),
      });
    },
    [updateShift],
  );

  const moveShift = useCallback(
    (shiftId: string, toEmployeeId: string, toDate: string) => {
      const s = shifts.find((x) => x.id === shiftId);
      if (!s?.dbId) return;

      // Vérification chevauchement sur la destination
      const conflict = hasShiftOverlap(
        {
          employeeId: toEmployeeId,
          startHour: s.startHour,
          endHour: s.endHour,
          isRecurring: s.isRecurring ?? false,
          recurrenceDays: s.recurrenceDays ?? [],
          dateStart: s.isRecurring ? (s.dateStart ?? s.date) : toDate,
          dateEnd: s.dateEnd ?? null,
        },
        shifts,
        s.dbId,
      );
      if (conflict) {
        toast.error(`Chevauchement détecté (à partir du ${conflict}).`, {
          action: { label: "Forcer quand même", onClick: () => doMove(s, toEmployeeId, toDate) },
        });
        return;
      }

      // Shift récurrent + changement d'employé → confirmation
      if (s.isRecurring && toEmployeeId !== s.employeeId) {
        setPendingMove({ shift: s, toEmployeeId, toDate });
        return;
      }

      doMove(s, toEmployeeId, toDate);
    },
    [shifts, doMove],
  );

  const handleCreateShift = useCallback(
    (payload: CreateShiftPayload) => {
      createShift.mutate(
        {
          employee_id: payload.employeeId,
          establishment_id: establishmentId,
          organization_id: organizationId,
          label: payload.label,
          start_hour: payload.startHour,
          start_minute: payload.startMinute,
          end_hour: payload.endHour,
          end_minute: payload.endMinute,
          overnight: payload.overnight,
          is_recurring: payload.isRecurring,
          recurrence_days: payload.recurrenceDays,
          date_start: payload.dateStart,
          date_end: payload.dateEnd,
          employee_shift_template_id: payload.templateId,
        },
        {
          onSuccess: () => toast.success("Créneau créé"),
          onError: () => toast.error("Erreur lors de la création du créneau"),
        },
      );
    },
    [createShift, establishmentId, organizationId],
  );

  const handleUpdateShift = useCallback(
    (payload: UpdateShiftPayload) => {
      const mode: RecurrenceEditMode = payload.recurrenceMode ?? "all";
      const occurrenceDate = payload.occurrenceDate ?? payload.dateStart;

      // Override existant → on le met à jour directement
      if (payload.isOverride) {
        updateShiftOverride.mutate(
          {
            id: payload.dbId,
            ...(payload.employeeId ? { employee_id: payload.employeeId } : {}),
            label: payload.label,
            start_hour: payload.startHour + payload.startMinute / 60,
            end_hour: payload.endHour + payload.endMinute / 60,
          },
          {
            onSuccess: () => toast.success("Créneau modifié"),
            onError: () => toast.error("Erreur lors de la modification"),
          },
        );
        return;
      }

      if (mode === "all") {
        updateShift.mutate(
          {
            id: payload.dbId,
            ...(payload.employeeId ? { employee_id: payload.employeeId } : {}),
            label: payload.label,
            start_hour: payload.startHour,
            start_minute: payload.startMinute,
            end_hour: payload.endHour,
            end_minute: payload.endMinute,
            overnight: payload.overnight,
            is_recurring: payload.isRecurring,
            recurrence_days: payload.recurrenceDays,
            date_start: payload.dateStart,
            date_end: payload.dateEnd,
          },
          {
            onSuccess: () => toast.success("Créneau modifié"),
            onError: () => toast.error("Erreur lors de la modification"),
          },
        );
        return;
      }

      if (mode === "single") {
        // Crée une exception pour cette occurrence uniquement
        createShiftOverride.mutate(
          {
            parent_shift_id: payload.dbId,
            establishment_id: establishmentId,
            organization_id: organizationId,
            override_date: occurrenceDate,
            ...(payload.employeeId ? { employee_id: payload.employeeId } : {}),
            label: payload.label,
            start_hour: payload.startHour + payload.startMinute / 60,
            end_hour: payload.endHour + payload.endMinute / 60,
          },
          {
            onSuccess: () => toast.success("Exception créée pour cette occurrence"),
            onError: () => toast.error("Erreur lors de la modification"),
          },
        );
        return;
      }

      // mode === "following" : tronque le parent + crée un nouveau shift
      const parentEndDate = format(subDays(new Date(occurrenceDate), 1), "yyyy-MM-dd");
      const originalEmployeeId = shifts.find((s) => s.dbId === payload.dbId)?.employeeId ?? "";
      updateShift.mutate(
        { id: payload.dbId, date_end: parentEndDate },
        { onError: () => toast.error("Erreur lors du découpage") },
      );
      createShift.mutate(
        {
          employee_id: payload.employeeId ?? originalEmployeeId,
          establishment_id: establishmentId,
          organization_id: organizationId,
          label: payload.label,
          start_hour: payload.startHour,
          start_minute: payload.startMinute,
          end_hour: payload.endHour,
          end_minute: payload.endMinute,
          overnight: payload.overnight,
          is_recurring: payload.isRecurring,
          recurrence_days: payload.recurrenceDays,
          date_start: occurrenceDate,
          date_end: payload.dateEnd,
        },
        {
          onSuccess: () => toast.success("Créneau modifié à partir de cette occurrence"),
          onError: () => toast.error("Erreur lors de la création"),
        },
      );
    },
    [updateShift, createShift, createShiftOverride, updateShiftOverride, shifts, establishmentId, organizationId],
  );

  const handleTimeChange = useCallback(
    (shiftId: string, newStartHour: number, newEndHour: number) => {
      const s = shifts.find((x) => x.id === shiftId);
      if (!s?.dbId) return;
      const toH = (h: number) => ({ h: Math.floor(h), m: Math.round((h % 1) * 60) });
      const { h: sh, m: sm } = toH(newStartHour);
      const rawEnd = newEndHour >= 24 ? newEndHour - 24 : newEndHour;
      const { h: eh, m: em } = toH(rawEnd);
      updateShift.mutate(
        { id: s.dbId, start_hour: sh, start_minute: sm, end_hour: eh, end_minute: em, overnight: newEndHour >= 24 },
        { onError: () => toast.error("Erreur lors du déplacement") },
      );
    },
    [shifts, updateShift],
  );

  const handleDeleteShift = useCallback(
    (shiftId: string, mode: RecurrenceEditMode = "all", occurrenceDate?: string) => {
      const s = shifts.find((x) => x.id === shiftId);
      const dbId = s?.dbId ?? shiftId;

      // Override existant → suppression directe de l'override
      if (s?.isOverride) {
        deleteShiftOverride.mutate(dbId, {
          onSuccess: () => toast.success("Créneau supprimé"),
          onError: () => toast.error("Erreur lors de la suppression"),
        });
        return;
      }

      if (mode === "all") {
        deleteShift.mutate(dbId, {
          onSuccess: () => toast.success("Créneau supprimé"),
          onError: () => toast.error("Erreur lors de la suppression"),
        });
        return;
      }

      const date = occurrenceDate ?? s?.date;
      if (!date) return;

      if (mode === "single") {
        const currentExcluded = dbShifts.find((r) => r.id === dbId)?.excluded_dates ?? [];
        updateShift.mutate(
          { id: dbId, excluded_dates: [...currentExcluded, date] },
          {
            onSuccess: () => toast.success("Occurrence supprimée"),
            onError: () => toast.error("Erreur lors de la suppression"),
          },
        );
        return;
      }

      // mode === "following" : tronque date_end à occurrenceDate - 1
      const newEnd = format(subDays(new Date(date), 1), "yyyy-MM-dd");
      updateShift.mutate(
        { id: dbId, date_end: newEnd },
        {
          onSuccess: () => toast.success("Occurrences suivantes supprimées"),
          onError: () => toast.error("Erreur lors de la suppression"),
        },
      );
    },
    [shifts, dbShifts, deleteShift, deleteShiftOverride, updateShift],
  );

  const modalEmployee = allEmployees.find((e) => e.id === addModalEmployeeId) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BackToEstablishmentButton establishmentId={establishmentId} organizationId={organizationId} label="" />
        <div>
          <h1 className="text-2xl font-bold">Planning</h1>
          <p className="text-muted-foreground text-sm">Gérez les créneaux de travail de votre équipe.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <PlanningNav
          viewMode={viewMode}
          monthStart={monthStart}
          setMonthStart={setMonthStart}
          weekStart={weekStart}
          weekEnd={weekEnd}
          weekDays={weekDays}
          dayIndex={dayIndex}
          setDayIndex={setDayIndex}
          changeWeek={changeWeek}
          prevDay={prevDay}
          nextDay={nextDay}
        />
        <PlanningToolbar
          visibleIds={visibleIds}
          allEmployees={allEmployees}
          toggleEmployee={toggleEmployee}
          setAddModalEmployeeId={(id) => setAddModalEmployeeId(id)}
          viewMode={viewMode}
          setViewMode={setViewMode}
          compact={compact}
          setCompact={setCompact}
          demoMode={demoMode}
          setDemoMode={setDemoMode}
          totalHours={totalHours}
        />
      </div>

      {viewMode === "month" ? (
        <MonthGrid
          employees={visibleEmployees}
          shifts={visibleShifts}
          calendarDays={monthCalendarDays}
          monthStart={monthStart}
          onEditShift={setEditingShift}
        />
      ) : (
        <div className="hidden overflow-hidden rounded-xl border shadow-sm lg:block">
          <PlanningWeekContent
            viewMode={viewMode}
            employees={visibleEmployees}
            shifts={visibleShifts}
            weekDays={weekDays}
            dayIndex={dayIndex}
            cellHeight={cellHeight}
            compact={compact}
            demoMode={demoMode}
            onMoveShift={moveShift}
            onAddShift={(id) => setAddModalEmployeeId(id)}
            onAddShiftDay={(id, date) => {
              setAddModalEmployeeId(id);
              setAddModalDate(date);
            }}
            onEditShift={setEditingShift}
            onTimeChange={handleTimeChange}
          />
        </div>
      )}

      <ShiftCreateModal
        open={addModalEmployeeId !== null}
        onOpenChange={(o) => {
          if (!o) {
            setAddModalEmployeeId(null);
            setAddModalDate(undefined);
          }
        }}
        employee={modalEmployee}
        employees={allEmployees}
        existingShifts={shifts}
        templates={templates}
        onSave={handleCreateShift}
        initialDate={addModalDate}
      />

      <ShiftEditModal
        open={editingShift !== null}
        onOpenChange={(o) => {
          if (!o) setEditingShift(null);
        }}
        shift={editingShift}
        employee={editingShift ? (allEmployees.find((e) => e.id === editingShift.employeeId) ?? null) : null}
        employees={allEmployees}
        existingShifts={shifts}
        onSave={handleUpdateShift}
        onDelete={handleDeleteShift}
      />

      <AlertDialog open={pendingMove !== null} onOpenChange={(o) => !o && setPendingMove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Modifier l&apos;employé du créneau récurrent ?</AlertDialogTitle>
            <AlertDialogDescription>
              Ce créneau est récurrent. Le changement d&apos;employé s&apos;appliquera à{" "}
              <strong>toutes les occurrences</strong> passées et futures.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingMove) doMove(pendingMove.shift, pendingMove.toEmployeeId, pendingMove.toDate);
                setPendingMove(null);
              }}
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {viewMode !== "month" && (
        <div className="lg:hidden">
          <MobileDayView
            employees={visibleEmployees}
            shifts={visibleShifts}
            day={weekDays[dayIndex]}
            onPrev={prevDay}
            onNext={nextDay}
          />
        </div>
      )}

      <WeekStats employees={visibleEmployees} shifts={visibleShifts} weekDays={weekDays} />
    </div>
  );
}
