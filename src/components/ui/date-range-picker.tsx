"use client";

import { useState } from "react";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Plage par défaut : N derniers jours (30 par défaut).
export function defaultDateRange(days = 30): DateRange {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return { from, to };
}

// Bornes ISO de la plage pour les requêtes (couvre toute la journée de début/fin).
export function rangeToIso(range: DateRange | undefined) {
  const fromDate = range?.from ? format(range.from, "yyyy-MM-dd") : "";
  const toDate = range?.to ? format(range.to, "yyyy-MM-dd") : fromDate;
  return {
    fromDate,
    toDate,
    fromIso: fromDate ? `${fromDate}T00:00:00.000Z` : "",
    toIso: toDate ? `${toDate}T23:59:59.999Z` : "",
  };
}

// Sélecteur de plage de dates (un seul calendrier, début → fin ; fin < début impossible).
export function DateRangePicker({
  value,
  onChange,
}: {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
}) {
  const [open, setOpen] = useState(false);

  const label = value?.from
    ? value.to
      ? `${format(value.from, "d MMM yyyy", { locale: fr })} – ${format(value.to, "d MMM yyyy", { locale: fr })}`
      : format(value.from, "d MMM yyyy", { locale: fr })
    : "Choisir une période";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-start gap-2 font-normal">
          <CalendarIcon className="h-4 w-4" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="range"
          selected={value}
          onSelect={onChange}
          numberOfMonths={2}
          defaultMonth={value?.from}
          locale={fr}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
