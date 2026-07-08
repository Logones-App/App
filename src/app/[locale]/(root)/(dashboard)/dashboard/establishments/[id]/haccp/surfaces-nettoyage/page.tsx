"use client";

import { useState } from "react";

import { useParams } from "next/navigation";

import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";
import {
  type CleaningFrequency,
  type HaccpSurface,
  useDeleteHaccpSurface,
  useHaccpSurfaces,
  useHaccpZones,
  useUpsertHaccpSurface,
} from "@/lib/queries/haccp-config-queries";

const FREQ: { value: CleaningFrequency; label: string }[] = [
  { value: "quotidien", label: "Quotidien" },
  { value: "hebdomadaire", label: "Hebdomadaire" },
  { value: "mensuel", label: "Mensuel" },
];
const NO_ZONE = "__none__";

function SurfaceModal({
  initial,
  zones,
  busy,
  onClose,
  onSave,
}: {
  initial: HaccpSurface | null;
  zones: { id: string; name: string }[];
  busy: boolean;
  onClose: () => void;
  onSave: (v: { label: string; zone_id: string | null; frequency: CleaningFrequency }) => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [zoneId, setZoneId] = useState<string>(initial?.zone_id ?? NO_ZONE);
  const [frequency, setFrequency] = useState<CleaningFrequency>(
    (initial?.frequency ?? "quotidien") as CleaningFrequency,
  );

  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier la surface" : "Nouvelle surface"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label>
              Surface <span className="text-destructive">*</span>
            </Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex : Plan de travail"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Zone</Label>
            <Select value={zoneId} onValueChange={setZoneId}>
              <SelectTrigger>
                <SelectValue placeholder="Aucune" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_ZONE}>— Aucune</SelectItem>
                {zones.map((z) => (
                  <SelectItem key={z.id} value={z.id}>
                    {z.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Fréquence</Label>
            <Select value={frequency} onValueChange={(v) => setFrequency(v as CleaningFrequency)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQ.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Annuler
          </Button>
          <Button
            onClick={() => onSave({ label: label.trim(), zone_id: zoneId === NO_ZONE ? null : zoneId, frequency })}
            disabled={busy || !label.trim()}
          >
            {busy ? "…" : initial ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function HaccpSurfacesPage() {
  const params = useParams();
  const establishmentId = params.id as string;
  const organizationId = useOrgaUserOrganizationId();

  const { data: zones = [] } = useHaccpZones(establishmentId);
  const { data: surfaces = [], isLoading } = useHaccpSurfaces(establishmentId);
  const upsert = useUpsertHaccpSurface(establishmentId, organizationId ?? "");
  const del = useDeleteHaccpSurface(establishmentId);

  const [modal, setModal] = useState<{ open: boolean; editing: HaccpSurface | null }>({ open: false, editing: null });

  if (!organizationId) {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 p-12">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>Chargement…</span>
      </div>
    );
  }

  const zoneName = (id: string | null) => (id ? (zones.find((z) => z.id === id)?.name ?? "—") : "—");
  const freqLabel = (f: string) => FREQ.find((x) => x.value === f)?.label ?? f;

  const handleSave = (v: { label: string; zone_id: string | null; frequency: CleaningFrequency }) => {
    upsert.mutate({ id: modal.editing?.id, ...v }, { onSuccess: () => setModal({ open: false, editing: null }) });
  };

  const handleDelete = (s: HaccpSurface) => {
    if (!confirm(`Supprimer la surface « ${s.label} » ?`)) return;
    del.mutate(s.id);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Surfaces de nettoyage</h1>
          <p className="text-muted-foreground text-sm">
            Plan de nettoyage : surfaces à nettoyer, zone et fréquence. Les validations (mobile) s&apos;y rattachent.
          </p>
        </div>
        <Button onClick={() => setModal({ open: true, editing: null })}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter une surface
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">{surfaces.length} surface(s)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm">
              <Loader2 className="h-5 w-5 animate-spin" />
              Chargement…
            </div>
          ) : surfaces.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">Aucune surface — ajoutez-en une.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Surface</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead>Fréquence</TableHead>
                    <TableHead className="w-[80px] text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {surfaces.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.label}</TableCell>
                      <TableCell className="text-muted-foreground">{zoneName(s.zone_id)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {freqLabel(s.frequency)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-0.5">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => setModal({ open: true, editing: s })}
                            aria-label="Modifier"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive h-7 w-7"
                            onClick={() => handleDelete(s)}
                            disabled={del.isPending}
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

      {modal.open && (
        <SurfaceModal
          initial={modal.editing}
          zones={zones}
          busy={upsert.isPending}
          onClose={() => setModal({ open: false, editing: null })}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
