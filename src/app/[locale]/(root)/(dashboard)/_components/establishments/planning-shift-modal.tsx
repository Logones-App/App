"use client";

import { useEffect, useState } from "react";

import { addDays, format, parseISO } from "date-fns";
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
import { cn } from "@/lib/utils";

import { HOUR_END, generateShiftId, type Employee, type Shift } from "./planning-types";

// ─── Helpers (extraits pour garder handleSave complexity ≤ 20) ───────────────

function buildDates(
  isRecurring: boolean,
  weekDays: Date[],
  recurrenceDays: number[],
  refStr: string,
  endStr: string | null,
): string[] {
  if (!isRecurring) return [refStr];
  const result: string[] = [];
  weekDays.forEach((day, idx) => {
    if (!recurrenceDays.includes(idx)) return;
    const ds = format(day, "yyyy-MM-dd");
    if (ds < refStr || (endStr !== null && ds > endStr)) return;
    result.push(ds);
  });
  return result;
}

function createShiftEntries(
  empId: string,
  date: string,
  combinedStart: number,
  resolvedEnd: number,
  isOvernight: boolean,
  combinedEnd: number,
  lbl: string,
): Shift[] {
  if (!isOvernight) {
    return [
      { id: generateShiftId(), employeeId: empId, date, startHour: combinedStart, endHour: resolvedEnd, label: lbl },
    ];
  }
  const nextDate = format(addDays(parseISO(date), 1), "yyyy-MM-dd");
  return [
    { id: generateShiftId(), employeeId: empId, date, startHour: combinedStart, endHour: HOUR_END, label: lbl },
    { id: generateShiftId(), employeeId: empId, date: nextDate, startHour: 0, endHour: combinedEnd, label: lbl },
  ];
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const SHIFT_TEMPLATES = [
  { id: "t1", label: "Service midi", sh: 9, sm: 0, eh: 17, em: 0 },
  { id: "t2", label: "Service soir", sh: 18, sm: 0, eh: 22, em: 0 },
  { id: "t3", label: "Ouverture", sh: 8, sm: 0, eh: 14, em: 0 },
  { id: "t4", label: "Fermeture", sh: 16, sm: 0, eh: 23, em: 0 },
  { id: "t5", label: "Nuit", sh: 22, sm: 0, eh: 26, em: 0 },
];

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
  const [text, setText] = useState(`${pad2(hour % 24)}:${pad2(minute)}`);

  useEffect(() => {
    if (!precise) setText(`${pad2(hour % 24)}:${pad2(minute)}`);
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
  weekDays,
  existingShifts,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  employee: Employee | null;
  weekDays: Date[];
  existingShifts: Shift[];
  onSave: (shifts: Shift[]) => void;
}) {
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
    setLabel("");
    setTemplateId("custom");
    setStartHour(9);
    setStartMinute(0);
    setEndHour(17);
    setEndMinute(0);
    setIsRecurring(false);
    setRecurrenceDays([]);
    setStartNow(true);
    setDateStart(null);
    setDateEnd(null);
  }, [open]);

  const applyTemplate = (tid: string) => {
    setTemplateId(tid);
    const tpl = SHIFT_TEMPLATES.find((t) => t.id === tid);
    if (!tpl) return;
    setLabel(tpl.label);
    setStartHour(tpl.sh);
    setStartMinute(tpl.sm);
    setEndHour(tpl.eh);
    setEndMinute(tpl.em);
  };

  const toggleDay = (d: number) =>
    setRecurrenceDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const handleSave = () => {
    if (!employee) return;
    if (!label.trim()) {
      toast.error("Le label est requis.");
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
    const dates = buildDates(isRecurring, weekDays, recurrenceDays, refStr, endStr);

    const lbl = label.trim();
    const newShifts: Shift[] = [];
    for (const date of dates) {
      const overlap = existingShifts.some(
        (s) =>
          s.employeeId === employee.id && s.date === date && combinedStart < s.endHour && resolvedEnd > s.startHour,
      );
      if (overlap) {
        toast.error(`Chevauchement détecté le ${date}.`);
        return;
      }
      newShifts.push(
        ...createShiftEntries(employee.id, date, combinedStart, resolvedEnd, isOvernight, combinedEnd, lbl),
      );
    }

    if (newShifts.length === 0) {
      toast.error("Aucun créneau généré pour cette période.");
      return;
    }
    onSave(newShifts);
    onOpenChange(false);
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: employee.color }} />
            Nouveau créneau — {employee.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Template */}
          <div className="space-y-1.5">
            <Label>Modèle de créneau</Label>
            <Select value={templateId} onValueChange={applyTemplate}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">— Personnalisé —</SelectItem>
                {SHIFT_TEMPLATES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Label */}
          <div className="space-y-1.5">
            <Label>
              Label <span className="text-destructive">*</span>
            </Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex : Service midi" />
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
