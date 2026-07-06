"use client";

import { useState } from "react";

import { Droplet, Pencil, Plus, Thermometer, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// ─── Modèle (mock — sera relié à la base HACCP une fois le schéma créé) ────────

type Measure = "temperature" | "oil";

type Equipment = {
  id: string;
  name: string;
  type: string;
  measure: Measure;
  min: number | null; // borne basse (null = pas de minimum)
  max: number | null; // borne haute (null = pas de maximum)
  location: string;
};

const EQUIP_TYPES = [
  "Chambre froide positive",
  "Chambre froide négative",
  "Réfrigérateur",
  "Congélateur",
  "Bain-marie",
  "Cellule de refroidissement",
  "Maintien au chaud",
  "Friteuse",
  "Autre",
];

const SEED: Equipment[] = [
  {
    id: "1",
    name: "Chambre froide positive",
    type: "Chambre froide positive",
    measure: "temperature",
    min: 0,
    max: 4,
    location: "Cuisine",
  },
  {
    id: "2",
    name: "Chambre froide négative",
    type: "Chambre froide négative",
    measure: "temperature",
    min: null,
    max: -18,
    location: "Réserve",
  },
  {
    id: "3",
    name: "Bain-marie sauces",
    type: "Bain-marie",
    measure: "temperature",
    min: 63,
    max: null,
    location: "Ligne chaude",
  },
  { id: "4", name: "Friteuse 1", type: "Friteuse", measure: "oil", min: null, max: 25, location: "Cuisine" },
];

function thresholdLabel(e: Equipment): string {
  const unit = e.measure === "oil" ? "%" : "°C";
  if (e.min != null && e.max != null) return `${e.min} – ${e.max} ${unit}`;
  if (e.min != null) return `≥ ${e.min} ${unit}`;
  if (e.max != null) return `≤ ${e.max} ${unit}`;
  return "—";
}

// ─── Modale création / édition ────────────────────────────────────────────────

type Draft = { name: string; type: string; measure: Measure; min: string; max: string; location: string };

const toDraft = (e: Equipment | null): Draft => ({
  name: e?.name ?? "",
  type: e?.type ?? EQUIP_TYPES[0],
  measure: e?.measure ?? "temperature",
  min: e?.min != null ? String(e.min) : "",
  max: e?.max != null ? String(e.max) : "",
  location: e?.location ?? "",
});

function EquipmentModal({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: Equipment | null;
  onClose: () => void;
  onSave: (values: Omit<Equipment, "id">) => void;
}) {
  const [d, setD] = useState<Draft>(() => toDraft(initial));

  const handleOpen = (v: boolean) => {
    if (v) setD(toDraft(initial));
    else onClose();
  };

  const parse = (s: string): number | null => {
    const n = parseFloat(s.replace(",", "."));
    return s.trim() !== "" && Number.isFinite(n) ? n : null;
  };

  const save = () => {
    if (!d.name.trim()) return;
    onSave({
      name: d.name.trim(),
      type: d.type,
      measure: d.measure,
      min: parse(d.min),
      max: parse(d.max),
      location: d.location.trim(),
    });
  };

  const unit = d.measure === "oil" ? "%" : "°C";

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier l'équipement" : "Nouvel équipement"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label>
              Nom <span className="text-destructive">*</span>
            </Label>
            <Input
              value={d.name}
              onChange={(e) => setD({ ...d, name: e.target.value })}
              placeholder="Ex : Chambre froide positive"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={d.type} onValueChange={(v) => setD({ ...d, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EQUIP_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Contrôle</Label>
              <Select value={d.measure} onValueChange={(v) => setD({ ...d, measure: v as Measure })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="temperature">Température (°C)</SelectItem>
                  <SelectItem value="oil">Acidité huile (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Seuil min ({unit})</Label>
              <Input
                value={d.min}
                onChange={(e) => setD({ ...d, min: e.target.value })}
                inputMode="decimal"
                placeholder="—"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Seuil max ({unit})</Label>
              <Input
                value={d.max}
                onChange={(e) => setD({ ...d, max: e.target.value })}
                inputMode="decimal"
                placeholder="—"
              />
            </div>
          </div>
          <p className="text-muted-foreground -mt-2 text-xs">
            Laissez un seuil vide s&apos;il n&apos;y a pas de borne de ce côté (ex. « ≤ -18 °C » = seul le max).
          </p>
          <div className="space-y-1.5">
            <Label>Emplacement</Label>
            <Input
              value={d.location}
              onChange={(e) => setD({ ...d, location: e.target.value })}
              placeholder="Ex : Cuisine, Réserve…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={save} disabled={!d.name.trim()}>
            {initial ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HaccpEquipementsPage() {
  const [equipments, setEquipments] = useState<Equipment[]>(SEED);
  const [modal, setModal] = useState<{ open: boolean; editing: Equipment | null }>({ open: false, editing: null });

  const handleSave = (values: Omit<Equipment, "id">) => {
    setEquipments((prev) =>
      modal.editing
        ? prev.map((e) => (e.id === modal.editing!.id ? { ...e, ...values } : e))
        : [...prev, { ...values, id: crypto.randomUUID() }],
    );
    setModal({ open: false, editing: null });
  };

  const handleDelete = (e: Equipment) => {
    if (!confirm(`Supprimer « ${e.name} » ?`)) return;
    setEquipments((prev) => prev.filter((x) => x.id !== e.id));
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Équipements &amp; seuils</h1>
          <p className="text-muted-foreground text-sm">
            Référentiel des équipements et de leurs seuils de conformité (T° et acidité des huiles). Les relevés terrain
            (mobile) se rattachent à ces équipements.
          </p>
        </div>
        <Button onClick={() => setModal({ open: true, editing: null })}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un équipement
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">{equipments.length} équipement(s)</CardTitle>
        </CardHeader>
        <CardContent>
          {equipments.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">Aucun équipement — ajoutez-en un.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Contrôle</TableHead>
                    <TableHead>Seuil</TableHead>
                    <TableHead>Emplacement</TableHead>
                    <TableHead className="w-[80px] text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {equipments.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.name}</TableCell>
                      <TableCell className="text-muted-foreground">{e.type}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1.5 text-sm">
                          {e.measure === "oil" ? (
                            <Droplet className="h-3.5 w-3.5 text-amber-500" />
                          ) : (
                            <Thermometer className="h-3.5 w-3.5 text-blue-500" />
                          )}
                          {e.measure === "oil" ? "Acidité" : "Température"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono text-xs">
                          {thresholdLabel(e)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{e.location || "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-0.5">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => setModal({ open: true, editing: e })}
                            aria-label="Modifier"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive h-7 w-7"
                            onClick={() => handleDelete(e)}
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
          )}
        </CardContent>
      </Card>

      <EquipmentModal
        open={modal.open}
        initial={modal.editing}
        onClose={() => setModal({ open: false, editing: null })}
        onSave={handleSave}
      />
    </div>
  );
}
