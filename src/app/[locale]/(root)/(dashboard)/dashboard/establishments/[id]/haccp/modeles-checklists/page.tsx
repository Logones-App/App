"use client";

import { useState } from "react";

import { useParams } from "next/navigation";

import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";
import {
  HACCP_FREQUENCY_OPTIONS,
  type HaccpChecklistTemplate,
  type HaccpFrequency,
  haccpFrequencyLabel,
  useDeleteHaccpChecklist,
  useHaccpChecklists,
  useUpsertHaccpChecklist,
} from "@/lib/queries/haccp-config-queries";

function ChecklistModal({
  initial,
  busy,
  onClose,
  onSave,
}: {
  initial: HaccpChecklistTemplate | null;
  busy: boolean;
  onClose: () => void;
  onSave: (v: { title: string; frequency: HaccpFrequency; frequency_label: string; items: string[] }) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [frequency, setFrequency] = useState<HaccpFrequency>(
    (initial?.frequency as HaccpFrequency | undefined) ?? "quotidien",
  );
  const [freq, setFreq] = useState(initial?.frequency_label ?? "");
  const [items, setItems] = useState<string[]>(() => ((initial?.items as string[] | null) ?? []).slice());

  const setItem = (i: number, v: string) => setItems((prev) => prev.map((x, idx) => (idx === i ? v : x)));
  const addItem = () => setItems((prev) => [...prev, ""]);
  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier la checklist" : "Nouvelle checklist"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label>
              Titre <span className="text-destructive">*</span>
            </Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex : Ouverture" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>Cadence</Label>
            <Select value={frequency} onValueChange={(v) => setFrequency(v as HaccpFrequency)}>
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
            <p className="text-muted-foreground text-xs">Pilote le tableau de bord des tâches (mobile).</p>
          </div>
          <div className="space-y-1.5">
            <Label>
              Libellé de fréquence{" "}
              <span className="text-muted-foreground text-xs font-normal">(affichage libre, optionnel)</span>
            </Label>
            <Input value={freq} onChange={(e) => setFreq(e.target.value)} placeholder="Ex : Quotidien — matin" />
          </div>
          <div className="space-y-1.5">
            <Label>Points à vérifier</Label>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input value={it} onChange={(e) => setItem(i, e.target.value)} placeholder={`Point ${i + 1}`} />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive h-8 w-8 shrink-0"
                    onClick={() => removeItem(i)}
                    aria-label="Retirer"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un point
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Annuler
          </Button>
          <Button
            onClick={() => onSave({ title: title.trim(), frequency, frequency_label: freq, items })}
            disabled={busy || !title.trim()}
          >
            {busy ? "…" : initial ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function HaccpChecklistTemplatesPage() {
  const params = useParams();
  const establishmentId = params.id as string;
  const organizationId = useOrgaUserOrganizationId();

  const { data: checklists = [], isLoading } = useHaccpChecklists(establishmentId);
  const upsert = useUpsertHaccpChecklist(establishmentId, organizationId ?? "");
  const del = useDeleteHaccpChecklist(establishmentId);

  const [modal, setModal] = useState<{ open: boolean; editing: HaccpChecklistTemplate | null }>({
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

  const handleSave = (v: { title: string; frequency: HaccpFrequency; frequency_label: string; items: string[] }) => {
    upsert.mutate({ id: modal.editing?.id, ...v }, { onSuccess: () => setModal({ open: false, editing: null }) });
  };

  const handleDelete = (c: HaccpChecklistTemplate) => {
    if (!confirm(`Supprimer la checklist « ${c.title} » ?`)) return;
    del.mutate(c.id);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Modèles de checklists</h1>
          <p className="text-muted-foreground text-sm">
            Listes de points à vérifier. Les passages (mobile) reprennent ces modèles.
          </p>
        </div>
        <Button onClick={() => setModal({ open: true, editing: null })}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle checklist
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm">
          <Loader2 className="h-5 w-5 animate-spin" />
          Chargement…
        </div>
      ) : checklists.length === 0 ? (
        <p className="text-muted-foreground rounded-md border border-dashed py-10 text-center text-sm">
          Aucune checklist — créez-en une.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {checklists.map((c) => {
            const items = (c.items as string[] | null) ?? [];
            return (
              <Card key={c.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{c.title}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {haccpFrequencyLabel(c.frequency)}
                      </Badge>
                      {c.frequency_label && <span className="text-muted-foreground text-xs">{c.frequency_label}</span>}
                    </div>
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
                      disabled={del.isPending}
                      aria-label="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
                    {items.map((it, i) => (
                      <li key={i}>{it}</li>
                    ))}
                    {items.length === 0 && <li className="list-none italic">Aucun point.</li>}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {modal.open && (
        <ChecklistModal
          initial={modal.editing}
          busy={upsert.isPending}
          onClose={() => setModal({ open: false, editing: null })}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
