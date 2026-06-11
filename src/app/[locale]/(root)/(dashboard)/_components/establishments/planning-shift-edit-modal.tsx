"use client";

import { useEffect, useState } from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import {
  fmtHour,
  hasShiftOverlap,
  type Employee,
  type RecurrenceEditMode,
  type Shift,
  type UpdateShiftPayload,
} from "./planning-types";

const MINUTES = [0, 15, 30, 45];
const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const pad2 = (n: number) => String(n).padStart(2, "0");

function TimeSelector({
  hour,
  minute,
  onChange,
}: {
  hour: number;
  minute: number;
  onChange: (h: number, m: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Select value={String(hour % 24)} onValueChange={(v) => onChange(Number(v), minute)}>
        <SelectTrigger className="w-[80px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-48">
          {Array.from({ length: 24 }, (_, i) => (
            <SelectItem key={i} value={String(i)}>
              {pad2(i)}h
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={String(minute)} onValueChange={(v) => onChange(hour, Number(v))}>
        <SelectTrigger className="w-[70px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MINUTES.map((m) => (
            <SelectItem key={m} value={String(m)}>
              :{pad2(m)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface ShiftEditModalProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  shift: Shift | null;
  employee: Employee | null;
  employees: Employee[];
  existingShifts: Shift[];
  onSave: (payload: UpdateShiftPayload) => void;
  onDelete: (shiftId: string, mode: RecurrenceEditMode, occurrenceDate: string) => void;
}

export function ShiftEditModal({
  open,
  onOpenChange,
  shift,
  employee,
  employees,
  existingShifts,
  onSave,
  onDelete,
}: ShiftEditModalProps) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(employee?.id ?? "");
  const [recurrenceMode, setRecurrenceMode] = useState<RecurrenceEditMode>("single");
  const [label, setLabel] = useState("");
  const [startHour, setStartHour] = useState(9);
  const [startMinute, setStartMinute] = useState(0);
  const [endHour, setEndHour] = useState(17);
  const [endMinute, setEndMinute] = useState(0);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");

  useEffect(() => {
    if (!shift) return;
    setSelectedEmployeeId(shift.employeeId);
    setRecurrenceMode("single");
    setLabel(shift.label);
    setStartHour(Math.floor(shift.startHour));
    setStartMinute(Math.round((shift.startHour % 1) * 60));
    setEndHour(Math.floor(shift.endHour) % 24);
    setEndMinute(Math.round((shift.endHour % 1) * 60));
    setIsRecurring(shift.isRecurring ?? false);
    setRecurrenceDays(shift.recurrenceDays ?? []);
    setDateStart(shift.dateStart ?? shift.date);
    setDateEnd(shift.dateEnd ?? "");
  }, [shift]);

  if (!shift || !employee) return null;

  const combinedStart = startHour + startMinute / 60;
  const combinedEnd = endHour + endMinute / 60;
  const isOvernight = endHour < startHour && !(endHour === 0 && endMinute === 0);

  const toggleDay = (d: number) =>
    setRecurrenceDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const handleSave = () => {
    if (!isOvernight && combinedEnd <= combinedStart) {
      toast.error("L'heure de fin doit être après le début.");
      return;
    }
    if (isRecurring && recurrenceDays.length === 0) {
      toast.error("Sélectionnez au moins un jour.");
      return;
    }
    const conflictDate = hasShiftOverlap(
      {
        employeeId: selectedEmployeeId,
        startHour: combinedStart,
        endHour: combinedEnd,
        isRecurring,
        recurrenceDays,
        dateStart: dateStart || shift.date,
        dateEnd: dateEnd || null,
      },
      existingShifts,
      shift.dbId ?? shift.id,
    );
    if (conflictDate) {
      toast.error(`Chevauchement avec un créneau existant (à partir du ${conflictDate}).`);
      return;
    }

    const isMidnight = endHour === 0 && endMinute === 0 && startHour > 0;
    const overnight = !isMidnight && endHour < startHour;

    const mode = shift.isRecurring && !shift.isOverride ? recurrenceMode : "all";
    onSave({
      dbId: shift.dbId ?? shift.id,
      isOverride: shift.isOverride,
      employeeId: selectedEmployeeId !== shift.employeeId ? selectedEmployeeId : undefined,
      label: label.trim(),
      startHour,
      startMinute,
      endHour,
      endMinute,
      overnight,
      isRecurring,
      recurrenceDays: isRecurring ? recurrenceDays : null,
      dateStart: dateStart || shift.date,
      dateEnd: dateEnd || null,
      recurrenceMode: mode,
      occurrenceDate: shift.date,
    });
    onOpenChange(false);
  };

  const handleDelete = () => {
    const mode = shift.isRecurring && !shift.isOverride ? recurrenceMode : "all";
    onDelete(shift.id, mode, shift.date);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{
                backgroundColor: (employees.find((e) => e.id === selectedEmployeeId) ?? employee)?.color ?? "#6b7280",
              }}
            />
            Modifier le créneau
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="text-muted-foreground text-sm">
            {shift.date} · {fmtHour(shift.startHour)} → {fmtHour(shift.endHour)}
            {shift.isOverride && <span className="ml-2 text-xs text-amber-600">(exception)</span>}
          </div>

          {/* Sélecteur de portée — uniquement pour les récurrents */}
          {shift.isRecurring && !shift.isOverride && (
            <div className="bg-muted/50 space-y-1.5 rounded-lg p-3">
              <p className="text-muted-foreground text-xs font-medium">Modifier :</p>
              <div className="grid grid-cols-3 gap-1">
                {(["single", "following", "all"] as RecurrenceEditMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setRecurrenceMode(m)}
                    className={cn(
                      "rounded-md border px-2 py-1.5 text-xs transition-colors",
                      recurrenceMode === m ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted/70",
                    )}
                  >
                    {m === "single" ? "Ce créneau" : m === "following" ? "Et suivants" : "Tous"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Employé */}
          <div className="space-y-1.5">
            <Label>Employé</Label>
            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: e.color }} />
                      {e.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Label</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex : Service midi (facultatif)"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Début</Label>
              <TimeSelector
                hour={startHour}
                minute={startMinute}
                onChange={(h, m) => {
                  setStartHour(h);
                  setStartMinute(m);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fin{isOvernight && <span className="ml-1 text-xs text-amber-600">(lendemain)</span>}</Label>
              <TimeSelector
                hour={endHour}
                minute={endMinute}
                onChange={(h, m) => {
                  setEndHour(h);
                  setEndMinute(m);
                }}
              />
            </div>
          </div>

          {/* Récurrence */}
          <div className="space-y-2">
            <Label>Type</Label>
            <RadioGroup
              value={isRecurring ? "recurring" : "once"}
              onValueChange={(v) => setIsRecurring(v === "recurring")}
              className="flex gap-4"
            >
              <label className="flex cursor-pointer items-center gap-2">
                <RadioGroupItem value="once" />
                <span className="text-sm">Ponctuel</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <RadioGroupItem value="recurring" />
                <span className="text-sm">Récurrent</span>
              </label>
            </RadioGroup>
          </div>

          {isRecurring && (
            <div className="space-y-1.5">
              <Label>Jours de la semaine</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS_FR.map((day, idx) => (
                  <label
                    key={idx}
                    className={cn(
                      "flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors",
                      recurrenceDays.includes(idx)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "hover:bg-muted/50",
                    )}
                  >
                    <Checkbox
                      checked={recurrenceDays.includes(idx)}
                      onCheckedChange={() => toggleDay(idx)}
                      className="sr-only"
                    />
                    {day}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date de début</Label>
              <Input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>
                Date de fin <span className="text-muted-foreground text-xs">(optionnelle)</span>
              </Label>
              <Input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
            </div>
          </div>

          {isRecurring && (
            <p className="text-muted-foreground text-xs">Modifie toutes les occurrences de ce créneau récurrent.</p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            Supprimer
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave}>Modifier</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
