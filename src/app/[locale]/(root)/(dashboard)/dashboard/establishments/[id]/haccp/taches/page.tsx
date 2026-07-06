"use client";

import { useState } from "react";

import { Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

import {
  CAT_DOT,
  CATEGORIES,
  fmtHour,
  type HaccpCategory,
  type HaccpFrequency,
  type HaccpTask,
  INITIAL_TASKS,
} from "../planning/_components/haccp-planning-types";

// ─── Helpers (mock — sera relié à la base HACCP une fois le schéma créé) ───────

const WD_SHORT = ["L", "M", "M", "J", "V", "S", "D"];

function timeToDecimal(t: string): number {
  const [h, m] = t.split(":").map((n) => parseInt(n, 10));
  return (Number.isFinite(h) ? h : 0) + (Number.isFinite(m) ? m : 0) / 60;
}

function freqLabel(t: HaccpTask): string {
  if (t.frequency === "daily") return "Quotidien";
  if (t.frequency === "weekly") {
    const days = (t.weekDays ?? []).map((d) => WD_SHORT.at(d) ?? "").join(" ");
    return days || "Hebdo (aucun jour)";
  }
  if (t.frequency === "monthly") return `Le ${t.monthDay ?? "?"} du mois`;
  if (t.specificDate) {
    const [y, mo, da] = t.specificDate.split("-");
    return `${da}/${mo}/${y}`;
  }
  return "Une fois";
}

// ─── Modale création / édition ────────────────────────────────────────────────

type Draft = {
  title: string;
  category: HaccpCategory;
  responsible: string;
  frequency: HaccpFrequency;
  weekDays: number[];
  monthDay: number;
  specificDate: string;
  startHour: number;
  endHour: number;
};

const toDraft = (t: HaccpTask | null): Draft => ({
  title: t?.title ?? "",
  category: t?.category ?? CATEGORIES[0],
  responsible: t?.responsible ?? "",
  frequency: t?.frequency ?? "daily",
  weekDays: t?.weekDays ?? [],
  monthDay: t?.monthDay ?? 1,
  specificDate: t?.specificDate ?? "",
  startHour: t?.startHour ?? 8,
  endHour: t?.endHour ?? 8.25,
});

function RecurrenceFields({ d, setD }: { d: Draft; setD: (d: Draft) => void }) {
  if (d.frequency === "weekly") {
    const toggle = (i: number) =>
      setD({
        ...d,
        weekDays: d.weekDays.includes(i) ? d.weekDays.filter((x) => x !== i) : [...d.weekDays, i],
      });
    return (
      <div className="space-y-1.5">
        <Label>Jours</Label>
        <div className="flex gap-1">
          {WD_SHORT.map((wd, i) => (
            <button
              key={i}
              type="button"
              onClick={() => toggle(i)}
              className={cn(
                "h-8 w-8 rounded-md border text-xs font-medium transition-colors",
                d.weekDays.includes(i)
                  ? "border-primary bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {wd}
            </button>
          ))}
        </div>
      </div>
    );
  }
  if (d.frequency === "monthly") {
    return (
      <div className="space-y-1.5">
        <Label>Jour du mois</Label>
        <Input
          type="number"
          min={1}
          max={31}
          value={d.monthDay}
          onChange={(e) => setD({ ...d, monthDay: Math.min(31, Math.max(1, Number(e.target.value) || 1)) })}
          className="w-24"
        />
      </div>
    );
  }
  if (d.frequency === "once") {
    return (
      <div className="space-y-1.5">
        <Label>Date</Label>
        <Input type="date" value={d.specificDate} onChange={(e) => setD({ ...d, specificDate: e.target.value })} />
      </div>
    );
  }
  return null;
}

function TaskModal({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: HaccpTask | null;
  onClose: () => void;
  onSave: (values: Omit<HaccpTask, "id">) => void;
}) {
  const [d, setD] = useState<Draft>(() => toDraft(initial));

  const handleOpen = (v: boolean) => {
    if (v) setD(toDraft(initial));
    else onClose();
  };

  const save = () => {
    if (!d.title.trim()) return;
    onSave({
      title: d.title.trim(),
      category: d.category,
      responsible: d.responsible.trim(),
      frequency: d.frequency,
      startHour: d.startHour,
      endHour: d.endHour,
      weekDays: d.frequency === "weekly" ? d.weekDays : undefined,
      monthDay: d.frequency === "monthly" ? d.monthDay : undefined,
      specificDate: d.frequency === "once" ? d.specificDate : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier la tâche" : "Nouvelle tâche"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label>
              Intitulé <span className="text-destructive">*</span>
            </Label>
            <Input
              value={d.title}
              onChange={(e) => setD({ ...d, title: e.target.value })}
              placeholder="Ex : Relevé T° matin"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Catégorie</Label>
              <Select value={d.category} onValueChange={(v) => setD({ ...d, category: v as HaccpCategory })}>
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
              <Label>Responsable</Label>
              <Input
                value={d.responsible}
                onChange={(e) => setD({ ...d, responsible: e.target.value })}
                placeholder="Ex : Jean D."
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Fréquence</Label>
            <Select value={d.frequency} onValueChange={(v) => setD({ ...d, frequency: v as HaccpFrequency })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Quotidien</SelectItem>
                <SelectItem value="weekly">Hebdomadaire</SelectItem>
                <SelectItem value="monthly">Mensuel</SelectItem>
                <SelectItem value="once">Une fois</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <RecurrenceFields d={d} setD={setD} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Heure début</Label>
              <Input
                type="time"
                value={fmtHour(d.startHour)}
                onChange={(e) => setD({ ...d, startHour: timeToDecimal(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Heure fin</Label>
              <Input
                type="time"
                value={fmtHour(d.endHour)}
                onChange={(e) => setD({ ...d, endHour: timeToDecimal(e.target.value) })}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={save} disabled={!d.title.trim()}>
            {initial ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HaccpTachesPage() {
  const [tasks, setTasks] = useState<HaccpTask[]>(INITIAL_TASKS);
  const [modal, setModal] = useState<{ open: boolean; editing: HaccpTask | null }>({ open: false, editing: null });

  const handleSave = (values: Omit<HaccpTask, "id">) => {
    setTasks((prev) =>
      modal.editing
        ? prev.map((t) => (t.id === modal.editing!.id ? { ...t, ...values } : t))
        : [...prev, { ...values, id: crypto.randomUUID() }],
    );
    setModal({ open: false, editing: null });
  };

  const handleDelete = (t: HaccpTask) => {
    if (!confirm(`Supprimer la tâche « ${t.title} » ?`)) return;
    setTasks((prev) => prev.filter((x) => x.id !== t.id));
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Tâches HACCP</h1>
          <p className="text-muted-foreground text-sm">
            Modèles de tâches récurrentes (le planning affiche les occurrences ; les validations viennent du mobile).
          </p>
        </div>
        <Button onClick={() => setModal({ open: true, editing: null })}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle tâche
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">{tasks.length} tâche(s)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Intitulé</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Fréquence</TableHead>
                  <TableHead>Horaire</TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead className="w-[80px] text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.title}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5 text-sm">
                        <span className={cn("h-2 w-2 shrink-0 rounded-full", CAT_DOT[t.category])} />
                        {t.category}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{freqLabel(t)}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {fmtHour(t.startHour)}–{fmtHour(t.endHour)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{t.responsible || "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-0.5">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => setModal({ open: true, editing: t })}
                          aria-label="Modifier"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive h-7 w-7"
                          onClick={() => handleDelete(t)}
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <TaskModal
        open={modal.open}
        initial={modal.editing}
        onClose={() => setModal({ open: false, editing: null })}
        onSave={handleSave}
      />
    </div>
  );
}
