"use client";

import { useState } from "react";

import { useParams } from "next/navigation";

import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";
import {
  type HaccpZone,
  useDeleteHaccpZone,
  useHaccpZones,
  useUpsertHaccpZone,
} from "@/lib/queries/haccp-config-queries";

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
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
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

export default function HaccpZonesPage() {
  const params = useParams();
  const establishmentId = params.id as string;
  const organizationId = useOrgaUserOrganizationId();

  const { data: zones = [], isLoading } = useHaccpZones(establishmentId);
  const upsert = useUpsertHaccpZone(establishmentId, organizationId ?? "");
  const del = useDeleteHaccpZone(establishmentId);

  const [modal, setModal] = useState<{ open: boolean; editing: HaccpZone | null }>({ open: false, editing: null });

  if (!organizationId) {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 p-12">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>Chargement…</span>
      </div>
    );
  }

  const handleSave = (name: string) => {
    upsert.mutate({ id: modal.editing?.id, name }, { onSuccess: () => setModal({ open: false, editing: null }) });
  };

  const handleDelete = (z: HaccpZone) => {
    if (!confirm(`Supprimer la zone « ${z.name} » ?`)) return;
    del.mutate(z.id);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Zones</h1>
          <p className="text-muted-foreground text-sm">
            Zones de l&apos;établissement, partagées par les équipements (sondes) et le plan de nettoyage.
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
          {isLoading ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm">
              <Loader2 className="h-5 w-5 animate-spin" />
              Chargement…
            </div>
          ) : zones.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">Aucune zone — ajoutez-en une.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zone</TableHead>
                    <TableHead className="w-[80px] text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {zones.map((z) => (
                    <TableRow key={z.id}>
                      <TableCell className="font-medium">{z.name}</TableCell>
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
        <ZoneModal
          initial={modal.editing}
          busy={upsert.isPending}
          onClose={() => setModal({ open: false, editing: null })}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
