"use client";

import { useState } from "react";

import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Check, Pencil, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDeletePendingReception, useUpdatePendingReception } from "@/lib/queries/pending-reception-queries";
import { type PendingReceptionRow } from "@/lib/queries/reception-queries";

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

function parsePositive(s: string): number | null {
  const n = parseFloat(s.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

type PendingMutations = {
  deletePending: ReturnType<typeof useDeletePendingReception>;
  updatePending: ReturnType<typeof useUpdatePendingReception>;
};

function PendingRow({ r, deletePending, updatePending }: { r: PendingReceptionRow } & PendingMutations) {
  const [editing, setEditing] = useState(false);
  const [qtyStr, setQtyStr] = useState("");
  const [puStr, setPuStr] = useState("");
  const busy = deletePending.isPending || updatePending.isPending;

  const startEdit = () => {
    setQtyStr(r.quantite != null ? String(r.quantite) : "");
    setPuStr(r.prix_unitaire != null ? String(r.prix_unitaire) : "");
    setEditing(true);
  };
  const save = () => {
    const q = parsePositive(qtyStr);
    const p = parsePositive(puStr);
    if (q == null || p == null || !r.doc) return;
    updatePending.mutate(
      {
        lineId: r.id,
        importId: r.doc.id,
        supplierReferenceId: r.supplier_reference_id,
        newOrderQty: q,
        newUnitPrice: p,
      },
      { onSuccess: () => setEditing(false) },
    );
  };

  return (
    <div className="flex items-center justify-between gap-2 text-sm tabular-nums">
      <span className="text-muted-foreground">
        {r.doc?.date_livraison ? format(parseISO(r.doc.date_livraison), "d MMM yyyy", { locale: fr }) : "—"}
        {" · "}
        {r.doc?.supplier?.name ?? "—"}
      </span>
      {editing ? (
        <span className="flex items-center gap-1">
          <Input
            value={qtyStr}
            onChange={(e) => setQtyStr(e.target.value)}
            inputMode="decimal"
            className="h-6 w-16 text-xs tabular-nums"
          />
          <Input
            value={puStr}
            onChange={(e) => setPuStr(e.target.value)}
            inputMode="decimal"
            className="h-6 w-16 text-xs tabular-nums"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-green-600"
            onClick={save}
            disabled={busy}
          >
            <Check className="h-3 w-3" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditing(false)}>
            <X className="h-3 w-3" />
          </Button>
        </span>
      ) : (
        <span className="flex items-center gap-2">
          <span>
            {r.quantite ?? "—"} {r.unite ?? ""}
          </span>
          {r.prix_unitaire != null && <span className="text-muted-foreground">{eur.format(r.prix_unitaire)}</span>}
          <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200">
            en attente
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={startEdit}
            disabled={busy}
            title="Modifier"
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive h-6 w-6"
            disabled={busy}
            title="Annuler cette réception en attente"
            onClick={() => {
              if (r.doc && confirm("Annuler cette réception en attente ? Le prix associé sera aussi retiré.")) {
                deletePending.mutate({ importId: r.doc.id, supplierReferenceId: r.supplier_reference_id });
              }
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </span>
      )}
    </div>
  );
}

export function PendingReceptions({
  rows,
  productId,
  organizationId,
  establishmentId,
}: {
  rows: PendingReceptionRow[];
  productId: string;
  organizationId: string;
  establishmentId: string;
}) {
  const deletePending = useDeletePendingReception(productId, organizationId, establishmentId);
  const updatePending = useUpdatePendingReception(productId, organizationId, establishmentId);
  if (rows.length === 0) return null;
  return (
    <div className="mb-3 space-y-1.5 rounded-md border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900 dark:bg-amber-950/20">
      <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
        En attente de validation caisse ({rows.length})
      </p>
      {rows.map((r) => (
        <PendingRow key={r.id} r={r} deletePending={deletePending} updatePending={updatePending} />
      ))}
    </div>
  );
}
