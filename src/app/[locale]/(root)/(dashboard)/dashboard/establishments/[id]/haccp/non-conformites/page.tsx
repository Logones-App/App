"use client";

import { useState } from "react";

import { useParams } from "next/navigation";

import { CheckCircle2, Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";
import { useHaccpZones } from "@/lib/queries/haccp-config-queries";
import {
  type HaccpNonConformity,
  NC_CATEGORIES,
  NC_SEVERITIES,
  NC_STATUSES,
  type NcInput,
  type NcSeverity,
  type NcStatus,
  ncCategoryLabel,
  ncSeverityLabel,
  ncStatusLabel,
  useCloseHaccpNc,
  useDeleteHaccpNc,
  useHaccpNcRealtime,
  useHaccpNonConformities,
  useUpsertHaccpNc,
} from "@/lib/queries/haccp-nc-queries";

const NO_ZONE = "__none__";

const severityVariant = (s: string): "destructive" | "default" | "secondary" =>
  s === "critique" ? "destructive" : s === "majeure" ? "default" : "secondary";
const statusVariant = (s: string): "outline" | "default" | "secondary" =>
  s === "ouvert" ? "outline" : s === "en_cours" ? "default" : "secondary";
const toDateInput = (iso: string | null): string => (iso ? iso.slice(0, 10) : "");
const clean = (s: string): string | null => s.trim() || null;

function initialNcState(initial: HaccpNonConformity | null) {
  if (!initial) {
    return {
      category: "reception",
      title: "",
      description: "",
      severity: "majeure" as NcSeverity,
      status: "ouvert" as NcStatus,
      zoneId: NO_ZONE,
      correctiveAction: "",
      preventiveAction: "",
      assignedTo: "",
      dueAt: "",
      reference: "",
    };
  }
  return {
    category: initial.category,
    title: initial.title ?? "",
    description: initial.description,
    severity: initial.severity as NcSeverity,
    status: initial.status as NcStatus,
    zoneId: initial.zone_id ?? NO_ZONE,
    correctiveAction: initial.corrective_action ?? "",
    preventiveAction: initial.preventive_action ?? "",
    assignedTo: initial.assigned_to_label ?? "",
    dueAt: toDateInput(initial.due_at),
    reference: initial.reference ?? "",
  };
}

function NcModal({
  initial,
  zones,
  busy,
  onClose,
  onSave,
}: {
  initial: HaccpNonConformity | null;
  zones: { id: string; name: string }[];
  busy: boolean;
  onClose: () => void;
  onSave: (v: NcInput) => void;
}) {
  const init = initialNcState(initial);
  const [category, setCategory] = useState(init.category);
  const [title, setTitle] = useState(init.title);
  const [description, setDescription] = useState(init.description);
  const [severity, setSeverity] = useState<NcSeverity>(init.severity);
  const [status, setStatus] = useState<NcStatus>(init.status);
  const [zoneId, setZoneId] = useState(init.zoneId);
  const [correctiveAction, setCorrectiveAction] = useState(init.correctiveAction);
  const [preventiveAction, setPreventiveAction] = useState(init.preventiveAction);
  const [assignedTo, setAssignedTo] = useState(init.assignedTo);
  const [dueAt, setDueAt] = useState(init.dueAt);
  const [reference, setReference] = useState(init.reference);

  const save = () =>
    onSave({
      id: initial?.id,
      category,
      title: clean(title),
      description: description.trim(),
      severity,
      status,
      zone_id: zoneId === NO_ZONE ? null : zoneId,
      corrective_action: clean(correctiveAction),
      preventive_action: clean(preventiveAction),
      assigned_to_label: clean(assignedTo),
      due_at: dueAt || null,
      reference: clean(reference),
    });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier la non-conformité" : "Nouvelle non-conformité"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Catégorie</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NC_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Gravité</Label>
              <Select value={severity} onValueChange={(v) => setSeverity(v as NcSeverity)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NC_SEVERITIES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Titre</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex : Rupture chaîne du froid"
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez l'anomalie constatée"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Statut</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as NcStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NC_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          </div>

          <div className="space-y-1.5">
            <Label>Action corrective (immédiate)</Label>
            <Textarea
              value={correctiveAction}
              onChange={(e) => setCorrectiveAction(e.target.value)}
              placeholder="Mesure prise sur le moment"
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Action préventive (récidive)</Label>
            <Textarea
              value={preventiveAction}
              onChange={(e) => setPreventiveAction(e.target.value)}
              placeholder="Mesure pour éviter que ça se reproduise"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Responsable</Label>
              <Input value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="Nom" />
            </div>
            <div className="space-y-1.5">
              <Label>Échéance</Label>
              <Input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>N° NC</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Réf." />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Annuler
          </Button>
          <Button onClick={save} disabled={busy || !description.trim()}>
            {busy ? "…" : initial ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NcCard({
  nc,
  zoneName,
  onEdit,
  onCloseNc,
  onDelete,
  closing,
  deleting,
}: {
  nc: HaccpNonConformity;
  zoneName: string;
  onEdit: () => void;
  onCloseNc: () => void;
  onDelete: () => void;
  closing: boolean;
  deleting: boolean;
}) {
  const meta = [zoneName, nc.assigned_to_label, nc.due_at ? `échéance ${toDateInput(nc.due_at)}` : null]
    .filter(Boolean)
    .join(" · ");
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-base">{nc.title ?? ncCategoryLabel(nc.category)}</CardTitle>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="text-xs">
              {ncCategoryLabel(nc.category)}
            </Badge>
            <Badge variant={severityVariant(nc.severity)} className="text-xs">
              {ncSeverityLabel(nc.severity)}
            </Badge>
            <Badge variant={statusVariant(nc.status)} className="text-xs">
              {ncStatusLabel(nc.status)}
            </Badge>
            <span className="text-muted-foreground text-xs">{toDateInput(nc.detected_at)}</span>
          </div>
        </div>
        <div className="flex shrink-0 gap-0.5">
          {nc.status !== "cloture" && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-emerald-600 hover:text-emerald-600"
              onClick={onCloseNc}
              disabled={closing}
              aria-label="Clôturer"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
            </Button>
          )}
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
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm">{nc.description}</p>
        {meta && <p className="text-muted-foreground text-xs">{meta}</p>}
        {nc.corrective_action && (
          <p className="text-xs">
            <span className="text-muted-foreground">Corrective : </span>
            {nc.corrective_action}
          </p>
        )}
        {nc.preventive_action && (
          <p className="text-xs">
            <span className="text-muted-foreground">Préventive : </span>
            {nc.preventive_action}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

const FILTERS: { value: string; label: string }[] = [
  { value: "actives", label: "Actives" },
  { value: "ouvert", label: "Ouvertes" },
  { value: "en_cours", label: "En cours" },
  { value: "cloture", label: "Clôturées" },
  { value: "all", label: "Toutes" },
];

export default function HaccpNonConformitesPage() {
  const params = useParams();
  const establishmentId = params.id as string;
  const organizationId = useOrgaUserOrganizationId();

  useHaccpNcRealtime(establishmentId);
  const { data: zones = [] } = useHaccpZones(establishmentId);
  const { data: ncs = [], isLoading } = useHaccpNonConformities(establishmentId);
  const upsert = useUpsertHaccpNc(establishmentId, organizationId ?? "");
  const close = useCloseHaccpNc(establishmentId);
  const del = useDeleteHaccpNc(establishmentId);

  const [filter, setFilter] = useState("actives");
  const [modal, setModal] = useState<{ open: boolean; editing: HaccpNonConformity | null }>({
    open: false,
    editing: null,
  });

  if (!organizationId) {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 p-12">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>Chargement…</span>
      </div>
    );
  }

  const zoneName = (id: string | null) => (id ? (zones.find((z) => z.id === id)?.name ?? "—") : "—");
  const matches = (nc: HaccpNonConformity) =>
    filter === "all" ? true : filter === "actives" ? nc.status !== "cloture" : nc.status === filter;
  const list = ncs.filter(matches);
  const openCount = ncs.filter((n) => n.status !== "cloture").length;

  const handleSave = (v: NcInput) => {
    upsert.mutate(v, { onSuccess: () => setModal({ open: false, editing: null }) });
  };
  const handleDelete = (nc: HaccpNonConformity) => {
    if (!confirm("Supprimer cette non-conformité ?")) return;
    del.mutate(nc.id);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Non-conformités</h1>
          <p className="text-muted-foreground text-sm">
            Registre central des anomalies HACCP (toutes origines) — {openCount} active(s).
          </p>
        </div>
        <Button onClick={() => setModal({ open: true, editing: null })}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle non-conformité
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            size="sm"
            variant={filter === f.value ? "default" : "outline"}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm">
          <Loader2 className="h-5 w-5 animate-spin" />
          Chargement…
        </div>
      ) : list.length === 0 ? (
        <p className="text-muted-foreground rounded-md border border-dashed py-10 text-center text-sm">
          Aucune non-conformité{filter === "actives" ? " active" : ""}.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((nc) => (
            <NcCard
              key={nc.id}
              nc={nc}
              zoneName={zoneName(nc.zone_id)}
              closing={close.isPending}
              deleting={del.isPending}
              onEdit={() => setModal({ open: true, editing: nc })}
              onCloseNc={() => close.mutate(nc.id)}
              onDelete={() => handleDelete(nc)}
            />
          ))}
        </div>
      )}

      {modal.open && (
        <NcModal
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
