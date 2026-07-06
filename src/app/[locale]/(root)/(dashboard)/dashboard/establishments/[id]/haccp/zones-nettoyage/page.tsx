"use client";

import { useState } from "react";

import { Pencil, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// ─── Modèle (mock — sera relié à la base HACCP une fois le schéma créé) ────────

type Frequency = "daily" | "weekly" | "monthly";

type Zone = {
  id: string;
  name: string;
  frequency: Frequency;
  product: string;
  method: string;
};

const FREQ_LABEL: Record<Frequency, string> = {
  daily: "Quotidien",
  weekly: "Hebdomadaire",
  monthly: "Mensuel",
};

const SEED: Zone[] = [
  {
    id: "1",
    name: "Plan de travail cuisine",
    frequency: "daily",
    product: "Dégraissant alimentaire",
    method: "Nettoyer puis désinfecter, rincer",
  },
  {
    id: "2",
    name: "Sols cuisine + plonge",
    frequency: "daily",
    product: "Détergent désinfectant",
    method: "Balayage humide + serpillière",
  },
  {
    id: "3",
    name: "Frigos (joints + clayettes)",
    frequency: "weekly",
    product: "Désinfectant contact alimentaire",
    method: "Vider, nettoyer joints et clayettes",
  },
  {
    id: "4",
    name: "Hottes et filtres",
    frequency: "weekly",
    product: "Dégraissant four/hotte",
    method: "Démonter filtres, dégraisser, sécher",
  },
  {
    id: "5",
    name: "WC personnel",
    frequency: "daily",
    product: "Nettoyant sanitaire",
    method: "Nettoyer et désinfecter",
  },
];

// ─── Modale création / édition ────────────────────────────────────────────────

type Draft = { name: string; frequency: Frequency; product: string; method: string };

const toDraft = (z: Zone | null): Draft => ({
  name: z?.name ?? "",
  frequency: z?.frequency ?? "daily",
  product: z?.product ?? "",
  method: z?.method ?? "",
});

function ZoneModal({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: Zone | null;
  onClose: () => void;
  onSave: (values: Omit<Zone, "id">) => void;
}) {
  const [d, setD] = useState<Draft>(() => toDraft(initial));

  const handleOpen = (v: boolean) => {
    if (v) setD(toDraft(initial));
    else onClose();
  };

  const save = () => {
    if (!d.name.trim()) return;
    onSave({
      name: d.name.trim(),
      frequency: d.frequency,
      product: d.product.trim(),
      method: d.method.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier la zone" : "Nouvelle zone"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label>
              Zone <span className="text-destructive">*</span>
            </Label>
            <Input
              value={d.name}
              onChange={(e) => setD({ ...d, name: e.target.value })}
              placeholder="Ex : Plan de travail cuisine"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Fréquence</Label>
            <Select value={d.frequency} onValueChange={(v) => setD({ ...d, frequency: v as Frequency })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Quotidien</SelectItem>
                <SelectItem value="weekly">Hebdomadaire</SelectItem>
                <SelectItem value="monthly">Mensuel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Produit utilisé</Label>
            <Input
              value={d.product}
              onChange={(e) => setD({ ...d, product: e.target.value })}
              placeholder="Ex : Dégraissant alimentaire"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Protocole / méthode</Label>
            <Input
              value={d.method}
              onChange={(e) => setD({ ...d, method: e.target.value })}
              placeholder="Ex : Nettoyer puis désinfecter, rincer"
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

export default function HaccpZonesNettoyagePage() {
  const [zones, setZones] = useState<Zone[]>(SEED);
  const [modal, setModal] = useState<{ open: boolean; editing: Zone | null }>({ open: false, editing: null });

  const handleSave = (values: Omit<Zone, "id">) => {
    setZones((prev) =>
      modal.editing
        ? prev.map((z) => (z.id === modal.editing!.id ? { ...z, ...values } : z))
        : [...prev, { ...values, id: crypto.randomUUID() }],
    );
    setModal({ open: false, editing: null });
  };

  const handleDelete = (z: Zone) => {
    if (!confirm(`Supprimer la zone « ${z.name} » ?`)) return;
    setZones((prev) => prev.filter((x) => x.id !== z.id));
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Zones de nettoyage</h1>
          <p className="text-muted-foreground text-sm">
            Plan de nettoyage : zones, fréquence et protocole. Les passages réalisés (mobile) se rattachent à ces zones.
          </p>
        </div>
        <Button onClick={() => setModal({ open: true, editing: null })}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter une zone
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">{zones.length} zone(s)</CardTitle>
        </CardHeader>
        <CardContent>
          {zones.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">Aucune zone — ajoutez-en une.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zone</TableHead>
                    <TableHead>Fréquence</TableHead>
                    <TableHead>Produit</TableHead>
                    <TableHead>Protocole</TableHead>
                    <TableHead className="w-[80px] text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {zones.map((z) => (
                    <TableRow key={z.id}>
                      <TableCell className="font-medium">{z.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {FREQ_LABEL[z.frequency]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{z.product || "—"}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[280px] truncate">{z.method || "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-0.5">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => setModal({ open: true, editing: z })}
                            aria-label="Modifier"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive h-7 w-7"
                            onClick={() => handleDelete(z)}
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

      <ZoneModal
        open={modal.open}
        initial={modal.editing}
        onClose={() => setModal({ open: false, editing: null })}
        onSave={handleSave}
      />
    </div>
  );
}
