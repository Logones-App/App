"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { CATEGORIES, type HaccpCategory, type HaccpFrequency, type HaccpTask, fmtHour } from "./haccp-planning-types";

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const HOUR_OPTS = Array.from({ length: 35 }, (_, i) => 6 + i * 0.5);
const DUR_OPTS: [number, string][] = [
  [0.25, "15 min"],
  [0.5, "30 min"],
  [1, "1 h"],
  [1.5, "1 h 30"],
  [2, "2 h"],
  [3, "3 h"],
  [8, "Journée"],
];
const FREQ_OPTS: [HaccpFrequency, string][] = [
  ["daily", "Quotidien"],
  ["weekly", "Hebdomadaire"],
  ["monthly", "Mensuel"],
  ["once", "Ponctuel"],
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (task: Omit<HaccpTask, "id">) => void;
  initialTask?: HaccpTask | null;
}

export function HaccpTaskModal({ open, onClose, onSave, initialTask }: Props) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<HaccpCategory>("Températures");
  const [responsible, setResponsible] = useState("");
  const [startHour, setStartHour] = useState(7);
  const [duration, setDuration] = useState(0.5);
  const [frequency, setFrequency] = useState<HaccpFrequency>("daily");
  const [weekDays, setWeekDays] = useState<number[]>([]);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle(initialTask?.title ?? "");
    setCategory(initialTask?.category ?? "Températures");
    setResponsible(initialTask?.responsible ?? "");
    setStartHour(initialTask?.startHour ?? 7);
    setDuration(initialTask ? initialTask.endHour - initialTask.startHour : 0.5);
    setFrequency(initialTask?.frequency ?? "daily");
    setWeekDays(initialTask?.weekDays ?? []);
    setNote(initialTask?.note ?? "");
  }, [open, initialTask]);

  function toggleDay(i: number) {
    setWeekDays((prev) => (prev.includes(i) ? prev.filter((d) => d !== i) : [...prev, i]));
  }

  function handleSave() {
    onSave({
      title,
      category,
      responsible,
      startHour,
      endHour: startHour + duration,
      frequency,
      weekDays: frequency === "weekly" ? weekDays : undefined,
      note: note || undefined,
    });
    onClose();
  }

  const isValid = title.trim() !== "" && responsible.trim() !== "";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initialTask ? "Modifier la tâche" : "Nouvelle tâche HACCP"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Titre *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex : Relevé température matin"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Catégorie</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as HaccpCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Responsable *</Label>
              <Input value={responsible} onChange={(e) => setResponsible(e.target.value)} placeholder="Jean D." />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Heure de début</Label>
              <Select value={String(startHour)} onValueChange={(v) => setStartHour(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOUR_OPTS.map((h) => (
                    <SelectItem key={h} value={String(h)}>
                      {fmtHour(h)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Durée</Label>
              <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DUR_OPTS.map(([d, l]) => (
                    <SelectItem key={d} value={String(d)}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Fréquence</Label>
            <Select value={frequency} onValueChange={(v) => setFrequency(v as HaccpFrequency)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQ_OPTS.map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {frequency === "weekly" && (
            <div className="space-y-1.5">
              <Label>Jours de la semaine</Label>
              <div className="flex flex-wrap gap-1.5">
                {JOURS.map((j, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                      weekDays.includes(i)
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-background text-muted-foreground hover:border-foreground/40"
                    }`}
                  >
                    {j}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Note (optionnel)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Précisions..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
