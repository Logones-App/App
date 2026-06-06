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

import { fmtHour, hasShiftOverlap, type Employee, type Shift, type UpdateShiftPayload } from "./planning-types";

const MINUTES = [0, 15, 30, 45];
const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const pad2 = (n: number) => String(n).padStart(2, "0");

function TimeSelector({
  hour,
  minute,
  maxHour,
  onChange,
}: {
  hour: number;
  minute: number;
  maxHour?: number;
  onChange: (h: number, m: number) => void;
}) {
  const max = maxHour ?? 26;
  return (
    <div className="flex items-center gap-2">
      <Select value={String(hour)} onValueChange={(v) => onChange(Number(v), minute)}>
        <SelectTrigger className="w-[80px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-48">
          {Array.from({ length: max }, (_, i) => (
            <SelectItem key={i} value={String(i)}>
              {pad2(i % 24)}h{i >= 24 ? <span className="text-muted-foreground ml-1 text-[10px]">+1</span> : null}
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
  existingShifts: Shift[];
  onSave: (payload: UpdateShiftPayload) => void;
  onDelete: (shiftId: string) => void;
}

export function ShiftEditModal({
  open,
  onOpenChange,
  shift,
  employee,
  existingShifts,
  onSave,
  onDelete,
}: ShiftEditModalProps) {
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
    setLabel(shift.label);
    setStartHour(Math.floor(shift.startHour));
    setStartMinute(Math.round((shift.startHour % 1) * 60));
    setEndHour(Math.floor(shift.endHour));
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
    if (!label.trim()) {
      toast.error("Le label est requis.");
      return;
    }
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
        employeeId: shift.employeeId,
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

    onSave({
      dbId: shift.dbId ?? shift.id,
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
    });
    onOpenChange(false);
  };

  const handleDelete = () => {
    onDelete(shift.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: employee.color }} />
            Modifier le créneau — {employee.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="text-muted-foreground text-sm">
            {shift.date} · {fmtHour(shift.startHour)} → {fmtHour(shift.endHour)}
          </div>

          <div className="space-y-1.5">
            <Label>
              Label <span className="text-destructive">*</span>
            </Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Début</Label>
              <TimeSelector
                hour={startHour}
                minute={startMinute}
                maxHour={24}
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
                maxHour={27}
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
