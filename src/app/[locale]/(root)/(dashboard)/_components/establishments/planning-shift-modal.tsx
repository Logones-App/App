"use client";

import { useEffect, useState } from "react";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, Clock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DbShiftTemplate } from "@/lib/queries/planning-queries";
import { cn } from "@/lib/utils";

import { hasShiftOverlap, type CreateShiftPayload, type Employee, type Shift } from "./planning-types";

// ─── Helpers (extraits pour garder handleSave complexity ≤ 20) ───────────────

// ─── Constantes ───────────────────────────────────────────────────────────────

const MINUTES = [0, 15, 30, 45];
const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const pad2 = (n: number) => String(n).padStart(2, "0");

// ─── TimeSelector ─────────────────────────────────────────────────────────────

function TimeSelector({
  hour,
  minute,
  onChange,
}: {
  hour: number;
  minute: number;
  onChange: (h: number, m: number) => void;
}) {
  const [precise, setPrecise] = useState(false);
  const [text, setText] = useState(`${pad2(hour)}:${pad2(minute)}`);

  useEffect(() => {
    if (!precise) setText(`${pad2(hour)}:${pad2(minute)}`);
  }, [hour, minute, precise]);

  const applyText = () => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(text);
    if (!m) return;
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (h > 23 || min > 59) return;
    onChange(h, min);
  };

  if (precise) {
    return (
      <div className="flex items-center gap-2">
        <Input
          className="w-[80px]"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={applyText}
          placeholder="HH:MM"
        />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-muted-foreground h-8 px-2 text-xs"
          onClick={() => setPrecise(false)}
        >
          <Clock className="mr-1 h-3 w-3" />
          Rapide
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={String(hour)} onValueChange={(v) => onChange(Number(v), minute)}>
        <SelectTrigger className="w-[90px]">
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
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="text-muted-foreground h-8 px-2 text-xs"
        onClick={() => setPrecise(true)}
      >
        <Clock className="mr-1 h-3 w-3" />
        Précis
      </Button>
    </div>
  );
}

// ─── DateField ────────────────────────────────────────────────────────────────

function DateField({
  value,
  onChange,
  placeholder,
}: {
  value: Date | null;
  onChange: (d: Date | null) => void;
  placeholder: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-full justify-start text-left text-sm font-normal", !value && "text-muted-foreground")}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "d MMMM yyyy", { locale: fr }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value ?? undefined}
          onSelect={(d) => onChange(d ?? null)}
          locale={fr}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

// ─── ShiftCreateModal ─────────────────────────────────────────────────────────

export function ShiftCreateModal({
  open,
  onOpenChange,
  employee,
  employees,
  existingShifts,
  templates,
  onSave,
  initialDate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  employee: Employee | null;
  employees: Employee[];
  existingShifts: Shift[];
  templates: DbShiftTemplate[];
  onSave: (payload: CreateShiftPayload) => void;
  initialDate?: Date;
}) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(employee?.id ?? "");
  const [label, setLabel] = useState("");
  const [templateId, setTemplateId] = useState("custom");
  const [startHour, setStartHour] = useState(9);
  const [startMinute, setStartMinute] = useState(0);
  const [endHour, setEndHour] = useState(17);
  const [endMinute, setEndMinute] = useState(0);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
  const [startNow, setStartNow] = useState(true);
  const [dateStart, setDateStart] = useState<Date | null>(null);
  const [dateEnd, setDateEnd] = useState<Date | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelectedEmployeeId(employee?.id ?? "");
    setLabel("");
    setTemplateId("custom");
    setStartHour(9);
    setStartMinute(0);
    setEndHour(17);
    setEndMinute(0);
    setIsRecurring(false);
    setRecurrenceDays([]);
    if (initialDate) {
      setStartNow(false);
      setDateStart(initialDate);
    } else {
      setStartNow(true);
      setDateStart(null);
    }
    setDateEnd(null);
  }, [open, employee, initialDate]);

  const applyTemplate = (tid: string) => {
    setTemplateId(tid);
    const tpl = templates.find((t) => t.id === tid);
    if (!tpl) return;
    setLabel(tpl.label);
    setStartHour(tpl.start_hour);
    setStartMinute(tpl.start_minute);
    setEndHour(tpl.end_hour);
    setEndMinute(tpl.end_minute);
  };

  const toggleDay = (d: number) =>
    setRecurrenceDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const handleSave = () => {
    if (!selectedEmployeeId) {
      toast.error("Sélectionnez un employé.");
      return;
    }
    if (!startNow && !dateStart) {
      toast.error("La date de début est requise.");
      return;
    }
    if (isRecurring && recurrenceDays.length === 0) {
      toast.error("Sélectionnez au moins un jour.");
      return;
    }

    const combinedStart = startHour + startMinute / 60;
    const combinedEnd = endHour + endMinute / 60;
    // 0h00 = minuit = fin du jour courant (pas le lendemain)
    const isMidnight = endHour === 0 && endMinute === 0 && startHour > 0;
    const isOvernight = !isMidnight && endHour < startHour;
    const resolvedEnd = isMidnight ? 24 : combinedEnd;
    if (!isOvernight && !isMidnight && resolvedEnd <= combinedStart) {
      toast.error("L'heure de fin doit être après le début.");
      return;
    }

    const refStr = format(startNow ? new Date() : dateStart!, "yyyy-MM-dd");
    const endStr = dateEnd ? format(dateEnd, "yyyy-MM-dd") : null;

    // Vérification chevauchement sur toute la plage de dates (règles complètes)
    const conflictDate = hasShiftOverlap(
      {
        employeeId: selectedEmployeeId,
        startHour: combinedStart,
        endHour: resolvedEnd,
        isRecurring,
        recurrenceDays,
        dateStart: refStr,
        dateEnd: endStr,
      },
      existingShifts,
    );
    if (conflictDate) {
      toast.error(`Chevauchement détecté (à partir du ${conflictDate}).`);
      return;
    }

    onSave({
      employeeId: selectedEmployeeId,
      label: label.trim(),
      startHour,
      startMinute,
      endHour,
      endMinute,
      overnight: isOvernight,
      isRecurring,
      recurrenceDays: isRecurring ? recurrenceDays : null,
      dateStart: refStr,
      dateEnd: endStr,
      templateId: templateId === "custom" ? null : templateId,
    });
    onOpenChange(false);
  };

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId) ?? employee;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: selectedEmployee?.color ?? "#6b7280" }}
            />
            Nouveau créneau
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Employé */}
          <div className="space-y-1.5">
            <Label>
              Employé <span className="text-destructive">*</span>
            </Label>
            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un employé" />
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

          {/* Template */}
          <div className="space-y-1.5">
            <Label>Modèle de créneau</Label>
            <Select value={templateId} onValueChange={applyTemplate}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">— Personnalisé —</SelectItem>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Label */}
          <div className="space-y-1.5">
            <Label>Label</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex : Service midi (facultatif)"
            />
          </div>

          {/* Horaires */}
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
              <Label>
                Fin{" "}
                {endHour < startHour && !(endHour === 0 && endMinute === 0) && (
                  <span className="text-xs text-amber-600">(lendemain)</span>
                )}
              </Label>
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

          {/* Date début */}
          <div className="space-y-1.5">
            <Label>
              Date de début <span className="text-destructive">*</span>
            </Label>
            <RadioGroup
              value={startNow ? "now" : "date"}
              onValueChange={(v) => setStartNow(v === "now")}
              className="mb-2 flex gap-4"
            >
              <label className="flex cursor-pointer items-center gap-2">
                <RadioGroupItem value="now" />
                <span className="text-sm">Maintenant</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <RadioGroupItem value="date" />
                <span className="text-sm">Date précise</span>
              </label>
            </RadioGroup>
            {!startNow && <DateField value={dateStart} onChange={setDateStart} placeholder="Choisir une date" />}
          </div>

          {/* Date fin */}
          <div className="space-y-1.5">
            <Label>
              Date de fin <span className="text-muted-foreground text-xs">(optionnelle)</span>
            </Label>
            <DateField value={dateEnd} onChange={setDateEnd} placeholder="Pas de date de fin" />
            {dateEnd && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground h-7 px-2 text-xs"
                onClick={() => setDateEnd(null)}
              >
                Retirer la date de fin
              </Button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave}>Créer le créneau</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
