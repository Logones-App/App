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
  HACCP_FREQUENCY_OPTIONS,
  type HaccpFrequency,
  type HaccpOilBath,
  type HaccpProbe,
  haccpFrequencyLabel,
  useDeleteHaccpOilBath,
  useDeleteHaccpProbe,
  useHaccpOilBaths,
  useHaccpProbes,
  useHaccpZones,
  useUpsertHaccpOilBath,
  useUpsertHaccpProbe,
} from "@/lib/queries/haccp-config-queries";

type Kind = "temperature" | "oil";
type EquipRow = { kind: "temperature"; row: HaccpProbe } | { kind: "oil"; row: HaccpOilBath };
type SaveInput = {
  kind: Kind;
  id?: string;
  label: string;
  zone_id: string | null;
  min_c: string;
  max_c: string;
  frequency: HaccpFrequency;
};

const NO_ZONE = "__none__";
const defaultFrequency = (kind: Kind): HaccpFrequency => (kind === "temperature" ? "biquotidien" : "quotidien");
const numToStr = (n: number | null | undefined): string => (n != null ? String(n) : "");
const initialFrequency = (r: EquipRow | null): HaccpFrequency =>
  (r?.row.frequency as HaccpFrequency | undefined) ?? defaultFrequency(r?.kind ?? "temperature");
const submitLabel = (busy: boolean, editing: boolean): string => (busy ? "…" : editing ? "Enregistrer" : "Créer");

function CadenceSelect({ value, onChange }: { value: HaccpFrequency; onChange: (v: HaccpFrequency) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>Cadence</Label>
      <Select value={value} onValueChange={(v) => onChange(v as HaccpFrequency)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {HACCP_FREQUENCY_OPTIONS.map((f) => (
            <SelectItem key={f.value} value={f.value}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-muted-foreground text-xs">Fréquence attendue des relevés (tableau de bord mobile).</p>
    </div>
  );
}

function TemperatureFields({
  zones,
  zoneId,
  setZoneId,
  minC,
  setMinC,
  maxC,
  setMaxC,
}: {
  zones: { id: string; name: string }[];
  zoneId: string;
  setZoneId: (v: string) => void;
  minC: string;
  setMinC: (v: string) => void;
  maxC: string;
  setMaxC: (v: string) => void;
}) {
  return (
    <>
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
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Seuil min (°C)</Label>
          <Input value={minC} onChange={(e) => setMinC(e.target.value)} inputMode="decimal" placeholder="0" />
        </div>
        <div className="space-y-1.5">
          <Label>Seuil max (°C)</Label>
          <Input value={maxC} onChange={(e) => setMaxC(e.target.value)} inputMode="decimal" placeholder="4" />
        </div>
      </div>
    </>
  );
}

function EquipModal({
  initial,
  zones,
  busy,
  onClose,
  onSave,
}: {
  initial: EquipRow | null;
  zones: { id: string; name: string }[];
  busy: boolean;
  onClose: () => void;
  onSave: (v: SaveInput) => void;
}) {
  const probe = initial?.kind === "temperature" ? initial.row : null;
  const [kind, setKind] = useState<Kind>(initial?.kind ?? "temperature");
  const [label, setLabel] = useState(initial?.row.label ?? "");
  const [zoneId, setZoneId] = useState<string>(probe?.zone_id ?? NO_ZONE);
  const [minC, setMinC] = useState(numToStr(probe?.min_c));
  const [maxC, setMaxC] = useState(numToStr(probe?.max_c));
  const [frequency, setFrequency] = useState<HaccpFrequency>(initialFrequency(initial));

  const save = () =>
    onSave({
      kind,
      id: initial?.row.id,
      label: label.trim(),
      zone_id: zoneId === NO_ZONE ? null : zoneId,
      min_c: minC,
      max_c: maxC,
      frequency,
    });

  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier l'équipement" : "Nouvel équipement"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as Kind)} disabled={!!initial}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="temperature">Sonde de température (froid/chaud)</SelectItem>
                <SelectItem value="oil">Bain de friture</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>
              Nom <span className="text-destructive">*</span>
            </Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={kind === "oil" ? "Ex : Friteuse 1" : "Ex : Sonde centrale"}
              autoFocus
            />
          </div>

          <CadenceSelect value={frequency} onChange={setFrequency} />

          {kind === "temperature" && (
            <TemperatureFields
              zones={zones}
              zoneId={zoneId}
              setZoneId={setZoneId}
              minC={minC}
              setMinC={setMinC}
              maxC={maxC}
              setMaxC={setMaxC}
            />
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Annuler
          </Button>
          <Button onClick={save} disabled={busy || !label.trim()}>
            {submitLabel(busy, !!initial)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function parseNum(s: string): number | null {
  const n = parseFloat(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export default function HaccpEquipementsPage() {
  const params = useParams();
  const establishmentId = params.id as string;
  const organizationId = useOrgaUserOrganizationId();

  const { data: zones = [] } = useHaccpZones(establishmentId);
  const { data: probes = [], isLoading: lp } = useHaccpProbes(establishmentId);
  const { data: baths = [], isLoading: lb } = useHaccpOilBaths(establishmentId);
  const upsertProbe = useUpsertHaccpProbe(establishmentId, organizationId ?? "");
  const upsertBath = useUpsertHaccpOilBath(establishmentId, organizationId ?? "");
  const delProbe = useDeleteHaccpProbe(establishmentId);
  const delBath = useDeleteHaccpOilBath(establishmentId);

  const [modal, setModal] = useState<{ open: boolean; editing: EquipRow | null }>({ open: false, editing: null });

  if (!organizationId) {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 p-12">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>Chargement…</span>
      </div>
    );
  }

  const zoneName = (id: string | null) => (id ? (zones.find((z) => z.id === id)?.name ?? "—") : "—");
  const rows: EquipRow[] = [
    ...probes.map((p) => ({ kind: "temperature" as const, row: p })),
    ...baths.map((b) => ({ kind: "oil" as const, row: b })),
  ];
  const busy = upsertProbe.isPending || upsertBath.isPending;

  const handleSave = (v: SaveInput) => {
    const done = { onSuccess: () => setModal({ open: false, editing: null }) };
    if (v.kind === "temperature") {
      upsertProbe.mutate(
        {
          id: v.id,
          label: v.label,
          zone_id: v.zone_id,
          min_c: parseNum(v.min_c),
          max_c: parseNum(v.max_c),
          frequency: v.frequency,
        },
        done,
      );
    } else {
      upsertBath.mutate({ id: v.id, label: v.label, frequency: v.frequency }, done);
    }
  };

  const handleDelete = (e: EquipRow) => {
    if (!confirm(`Supprimer « ${e.row.label} » ?`)) return;
    if (e.kind === "temperature") delProbe.mutate(e.row.id);
    else delBath.mutate(e.row.id);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Équipements</h1>
          <p className="text-muted-foreground text-sm">
            Sondes de température (avec seuils) et bains de friture. Les relevés (mobile) s&apos;y rattachent.
          </p>
        </div>
        <Button onClick={() => setModal({ open: true, editing: null })}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un équipement
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">{rows.length} équipement(s)</CardTitle>
        </CardHeader>
        <CardContent>
          {lp || lb ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm">
              <Loader2 className="h-5 w-5 animate-spin" />
              Chargement…
            </div>
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">Aucun équipement — ajoutez-en un.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Équipement</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Cadence</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead>Seuils</TableHead>
                    <TableHead className="w-[80px] text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((e) => (
                    <TableRow key={`${e.kind}-${e.row.id}`}>
                      <TableCell className="font-medium">{e.row.label}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {e.kind === "temperature" ? "Température" : "Huile"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{haccpFrequencyLabel(e.row.frequency)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {e.kind === "temperature" ? zoneName(e.row.zone_id) : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {e.kind === "temperature" && (e.row.min_c != null || e.row.max_c != null)
                          ? `${e.row.min_c ?? "…"} – ${e.row.max_c ?? "…"} °C`
                          : "—"}
                      </TableCell>
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
                            disabled={delProbe.isPending || delBath.isPending}
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
        <EquipModal
          initial={modal.editing}
          zones={zones}
          busy={busy}
          onClose={() => setModal({ open: false, editing: null })}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
