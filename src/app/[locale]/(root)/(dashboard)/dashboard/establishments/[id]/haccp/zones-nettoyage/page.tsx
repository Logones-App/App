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
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";
import {
  type CleaningFrequency,
  type HaccpSurface,
  type HaccpZone,
  useDeleteHaccpSurface,
  useDeleteHaccpZone,
  useHaccpSurfaces,
  useHaccpZones,
  useUpsertHaccpSurface,
  useUpsertHaccpZone,
} from "@/lib/queries/haccp-config-queries";

const FREQ: { value: CleaningFrequency; label: string }[] = [
  { value: "quotidien", label: "Quotidien" },
  { value: "hebdomadaire", label: "Hebdomadaire" },
  { value: "mensuel", label: "Mensuel" },
];
const freqLabel = (f: string) => FREQ.find((x) => x.value === f)?.label ?? f;
const NO_ZONE = "__none__";

type ModalState =
  | { kind: "zone"; editing: HaccpZone | null }
  | { kind: "surface"; editing: HaccpSurface | null; presetZoneId: string | null }
  | null;

function ZoneModal({
  initial,
  busy,
  onClose,
  onSave,
}: {
  initial: HaccpZone | null;
  busy: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier la zone" : "Nouvelle zone"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5 py-2">
          <Label>
            Nom de la zone <span className="text-destructive">*</span>
          </Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Chambre froide" autoFocus />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Annuler
          </Button>
          <Button onClick={() => onSave(name.trim())} disabled={busy || !name.trim()}>
            {busy ? "…" : initial ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SurfaceModal({
  initial,
  presetZoneId,
  zones,
  busy,
  onClose,
  onSave,
}: {
  initial: HaccpSurface | null;
  presetZoneId: string | null;
  zones: { id: string; name: string }[];
  busy: boolean;
  onClose: () => void;
  onSave: (v: { label: string; zone_id: string | null; frequency: CleaningFrequency }) => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [zoneId, setZoneId] = useState<string>(initial?.zone_id ?? presetZoneId ?? NO_ZONE);
  const [frequency, setFrequency] = useState<CleaningFrequency>(
    (initial?.frequency ?? "quotidien") as CleaningFrequency,
  );

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
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

function SurfaceRow({
  surface,
  onEdit,
  onDelete,
  deleting,
}: {
  surface: HaccpSurface;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border p-2.5">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{surface.label}</span>
        <Badge variant="secondary" className="text-xs">
          {freqLabel(surface.frequency)}
        </Badge>
      </div>
      <div className="flex shrink-0 gap-0.5">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit} aria-label="Modifier">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="text-destructive hover:text-destructive h-7 w-7"
          onClick={onDelete}
          disabled={deleting}
          aria-label="Supprimer"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function ZoneCard({
  title,
  surfaces,
  deleting,
  onAddSurface,
  onEditSurface,
  onDeleteSurface,
  onEditZone,
  onDeleteZone,
}: {
  title: string;
  surfaces: HaccpSurface[];
  deleting: boolean;
  onAddSurface: () => void;
  onEditSurface: (s: HaccpSurface) => void;
  onDeleteSurface: (s: HaccpSurface) => void;
  onEditZone?: () => void;
  onDeleteZone?: () => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          {title}
          <Badge variant="outline" className="text-xs">
            {surfaces.length} surface(s)
          </Badge>
        </CardTitle>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button size="sm" variant="outline" onClick={onAddSurface}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Surface
          </Button>
          {onEditZone && (
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEditZone} aria-label="Renommer la zone">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {onDeleteZone && (
            <Button
              size="icon"
              variant="ghost"
              className="text-destructive hover:text-destructive h-7 w-7"
              onClick={onDeleteZone}
              aria-label="Supprimer la zone"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {surfaces.length === 0 ? (
          <p className="text-muted-foreground py-2 text-center text-sm">Aucune surface dans cette zone.</p>
        ) : (
          surfaces.map((s) => (
            <SurfaceRow
              key={s.id}
              surface={s}
              deleting={deleting}
              onEdit={() => onEditSurface(s)}
              onDelete={() => onDeleteSurface(s)}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default function HaccpZonesPage() {
  const params = useParams();
  const establishmentId = params.id as string;
  const organizationId = useOrgaUserOrganizationId();

  const { data: zones = [], isLoading: lz } = useHaccpZones(establishmentId);
  const { data: surfaces = [], isLoading: ls } = useHaccpSurfaces(establishmentId);
  const upsertZone = useUpsertHaccpZone(establishmentId, organizationId ?? "");
  const delZone = useDeleteHaccpZone(establishmentId);
  const upsertSurface = useUpsertHaccpSurface(establishmentId, organizationId ?? "");
  const delSurface = useDeleteHaccpSurface(establishmentId);

  const [modal, setModal] = useState<ModalState>(null);

  if (!organizationId) {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 p-12">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>Chargement…</span>
      </div>
    );
  }

  const close = () => setModal(null);
  const surfacesOf = (zoneId: string | null) => surfaces.filter((s) => s.zone_id === zoneId);
  const orphanSurfaces = surfacesOf(null);

  const saveZone = (name: string) => {
    if (modal?.kind !== "zone") return;
    upsertZone.mutate({ id: modal.editing?.id, name }, { onSuccess: close });
  };
  const saveSurface = (v: { label: string; zone_id: string | null; frequency: CleaningFrequency }) => {
    if (modal?.kind !== "surface") return;
    upsertSurface.mutate({ id: modal.editing?.id, ...v }, { onSuccess: close });
  };
  const deleteZone = (z: HaccpZone) => {
    if (!confirm(`Supprimer la zone « ${z.name} » ? Les surfaces rattachées ne seront pas supprimées.`)) return;
    delZone.mutate(z.id);
  };
  const deleteSurface = (s: HaccpSurface) => {
    if (!confirm(`Supprimer la surface « ${s.label} » ?`)) return;
    delSurface.mutate(s.id);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Zones &amp; surfaces</h1>
          <p className="text-muted-foreground text-sm">
            Zones de l&apos;établissement et, dans chacune, les surfaces du plan de nettoyage (fréquence). Les zones
            sont aussi utilisées par les équipements (sondes).
          </p>
        </div>
        <Button onClick={() => setModal({ kind: "zone", editing: null })}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter une zone
        </Button>
      </div>

      {lz || ls ? (
        <div className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm">
          <Loader2 className="h-5 w-5 animate-spin" />
          Chargement…
        </div>
      ) : zones.length === 0 && orphanSurfaces.length === 0 ? (
        <p className="text-muted-foreground rounded-md border border-dashed py-10 text-center text-sm">
          Aucune zone — ajoutez-en une pour commencer.
        </p>
      ) : (
        <div className="space-y-4">
          {zones.map((z) => (
            <ZoneCard
              key={z.id}
              title={z.name}
              surfaces={surfacesOf(z.id)}
              deleting={delSurface.isPending}
              onAddSurface={() => setModal({ kind: "surface", editing: null, presetZoneId: z.id })}
              onEditSurface={(s) => setModal({ kind: "surface", editing: s, presetZoneId: s.zone_id })}
              onDeleteSurface={deleteSurface}
              onEditZone={() => setModal({ kind: "zone", editing: z })}
              onDeleteZone={() => deleteZone(z)}
            />
          ))}

          {orphanSurfaces.length > 0 && (
            <ZoneCard
              title="Sans zone"
              surfaces={orphanSurfaces}
              deleting={delSurface.isPending}
              onAddSurface={() => setModal({ kind: "surface", editing: null, presetZoneId: null })}
              onEditSurface={(s) => setModal({ kind: "surface", editing: s, presetZoneId: s.zone_id })}
              onDeleteSurface={deleteSurface}
            />
          )}
        </div>
      )}

      {modal?.kind === "zone" && (
        <ZoneModal initial={modal.editing} busy={upsertZone.isPending} onClose={close} onSave={saveZone} />
      )}
      {modal?.kind === "surface" && (
        <SurfaceModal
          initial={modal.editing}
          presetZoneId={modal.presetZoneId}
          zones={zones}
          busy={upsertSurface.isPending}
          onClose={close}
          onSave={saveSurface}
        />
      )}
    </div>
  );
}
