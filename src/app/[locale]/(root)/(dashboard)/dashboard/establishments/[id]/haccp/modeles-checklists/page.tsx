"use client";

import { useState } from "react";

import { GripVertical, Pencil, Plus, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ─── Modèle (mock — sera relié à la base HACCP une fois le schéma créé) ────────

type ChecklistModel = {
  id: string;
  name: string;
  moment: string;
  items: string[];
};

const MOMENTS = ["Ouverture", "Fermeture", "Service", "Réception", "Autre"];

const SEED: ChecklistModel[] = [
  {
    id: "1",
    name: "Checklist ouverture",
    moment: "Ouverture",
    items: [
      "Tenue propre et complète",
      "Lavage des mains",
      "Relevé T° des frigos",
      "Vérification des DLC",
      "Plan de travail désinfecté",
    ],
  },
  {
    id: "2",
    name: "Checklist fermeture",
    moment: "Fermeture",
    items: ["Surfaces nettoyées", "Poubelles sorties", "Frigos fermés", "Sols lavés", "Gaz et équipements coupés"],
  },
];

// ─── Modale création / édition ────────────────────────────────────────────────

type Draft = { name: string; moment: string; items: string[] };

const toDraft = (c: ChecklistModel | null): Draft => ({
  name: c?.name ?? "",
  moment: c?.moment ?? MOMENTS[0],
  items: c?.items.length ? [...c.items] : [""],
});

function ChecklistModal({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: ChecklistModel | null;
  onClose: () => void;
  onSave: (values: Omit<ChecklistModel, "id">) => void;
}) {
  const [d, setD] = useState<Draft>(() => toDraft(initial));

  const handleOpen = (v: boolean) => {
    if (v) setD(toDraft(initial));
    else onClose();
  };

  const setItem = (i: number, value: string) =>
    setD({ ...d, items: d.items.map((it, idx) => (idx === i ? value : it)) });
  const addItem = () => setD({ ...d, items: [...d.items, ""] });
  const removeItem = (i: number) => setD({ ...d, items: d.items.filter((_, idx) => idx !== i) });

  const save = () => {
    const items = d.items.map((it) => it.trim()).filter(Boolean);
    if (!d.name.trim() || items.length === 0) return;
    onSave({ name: d.name.trim(), moment: d.moment, items });
  };

  const canSave = d.name.trim() !== "" && d.items.some((it) => it.trim() !== "");

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier le modèle" : "Nouveau modèle de checklist"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>
                Nom <span className="text-destructive">*</span>
              </Label>
              <Input
                value={d.name}
                onChange={(e) => setD({ ...d, name: e.target.value })}
                placeholder="Ex : Checklist ouverture"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Moment</Label>
              <Select value={d.moment} onValueChange={(v) => setD({ ...d, moment: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MOMENTS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Points à vérifier</Label>
            <div className="space-y-2">
              {d.items.map((it, i) => (
                <div key={i} className="flex items-center gap-2">
                  <GripVertical className="text-muted-foreground/50 h-4 w-4 shrink-0" />
                  <Input
                    value={it}
                    onChange={(e) => setItem(i, e.target.value)}
                    placeholder={`Point ${i + 1}`}
                    className="h-8 text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive h-8 w-8 shrink-0"
                    onClick={() => removeItem(i)}
                    aria-label="Retirer"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" className="mt-1 h-8" onClick={addItem}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Ajouter un point
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={save} disabled={!canSave}>
            {initial ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HaccpModelesChecklistsPage() {
  const [models, setModels] = useState<ChecklistModel[]>(SEED);
  const [modal, setModal] = useState<{ open: boolean; editing: ChecklistModel | null }>({ open: false, editing: null });

  const handleSave = (values: Omit<ChecklistModel, "id">) => {
    setModels((prev) =>
      modal.editing
        ? prev.map((c) => (c.id === modal.editing!.id ? { ...c, ...values } : c))
        : [...prev, { ...values, id: crypto.randomUUID() }],
    );
    setModal({ open: false, editing: null });
  };

  const handleDelete = (c: ChecklistModel) => {
    if (!confirm(`Supprimer le modèle « ${c.name} » ?`)) return;
    setModels((prev) => prev.filter((x) => x.id !== c.id));
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Modèles de checklists</h1>
          <p className="text-muted-foreground text-sm">
            Modèles de checklists (ouverture, fermeture…) et leurs points. Les passages réalisés (mobile) partent de ces
            modèles.
          </p>
        </div>
        <Button onClick={() => setModal({ open: true, editing: null })}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau modèle
        </Button>
      </div>

      {models.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-10 text-center text-sm">
            Aucun modèle — créez-en un.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {models.map((c) => (
            <Card key={c.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                <div className="min-w-0">
                  <CardTitle className="text-base">{c.name}</CardTitle>
                  <Badge variant="secondary" className="mt-1 text-xs">
                    {c.moment}
                  </Badge>
                </div>
                <div className="flex gap-0.5">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => setModal({ open: true, editing: c })}
                    aria-label="Modifier"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive h-7 w-7"
                    onClick={() => handleDelete(c)}
                    aria-label="Supprimer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-2 text-xs">{c.items.length} point(s)</p>
                <ul className="space-y-1">
                  {c.items.map((it, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <span className="border-muted-foreground/40 h-3.5 w-3.5 shrink-0 rounded-[3px] border" />
                      {it}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ChecklistModal
        open={modal.open}
        initial={modal.editing}
        onClose={() => setModal({ open: false, editing: null })}
        onSave={handleSave}
      />
    </div>
  );
}
