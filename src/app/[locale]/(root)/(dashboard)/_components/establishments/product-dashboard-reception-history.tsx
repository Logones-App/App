"use client";

import { useState } from "react";

import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Check, Lock, Pencil, Trash2, X } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  useDeleteReception,
  useProductReceptions,
  useUpdateReception,
  type ReceptionRow,
} from "@/lib/queries/reception-queries";

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

function parsePositive(s: string): number | null {
  const n = parseFloat(s.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

type RowView = {
  factor: number;
  orderUnit: string;
  qtyOrder: number;
  pu: number | null;
  total: number | null;
  intact: boolean;
};

function computeRowView(row: ReceptionRow): RowView {
  const factor = row.supplier_reference?.conversion_factor ?? 1;
  return {
    factor,
    orderUnit: row.supplier_reference?.order_unit ?? row.unit ?? "",
    qtyOrder: factor > 0 ? Math.round((row.quantity / factor) * 1000) / 1000 : row.quantity,
    pu: row.unit_cost != null ? Math.round(row.unit_cost * factor * 10000) / 10000 : null,
    total: row.unit_cost != null ? Math.round(row.quantity * row.unit_cost * 100) / 100 : null,
    intact: row.remaining_quantity != null && Math.abs(row.remaining_quantity - row.quantity) < 0.001,
  };
}

type RowProps = {
  row: ReceptionRow;
  productStockId: string;
  deleteMutation: ReturnType<typeof useDeleteReception>;
  updateMutation: ReturnType<typeof useUpdateReception>;
};

function DeleteReceptionDialog({
  open,
  onOpenChange,
  hasPrice,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  hasPrice: boolean;
  onConfirm: (alsoDeletePrice: boolean) => void;
}) {
  const [alsoDeletePrice, setAlsoDeletePrice] = useState(true);
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer cette réception ?</AlertDialogTitle>
          <AlertDialogDescription>
            Le stock sera diminué de la quantité reçue. Cette action est irréversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {hasPrice && (
          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={alsoDeletePrice}
              onCheckedChange={(v) => setAlsoDeletePrice(v === true)}
              className="mt-0.5"
            />
            <span>
              Supprimer aussi le <strong>prix d&apos;achat</strong> enregistré par cette réception.
              <span className="text-muted-foreground block text-xs">
                Le prix catalogue sera recalculé sur la réception précédente.
              </span>
            </span>
          </label>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={() => onConfirm(hasPrice && alsoDeletePrice)}>Supprimer</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ReceptionTableRow({ row, productStockId, deleteMutation, updateMutation }: RowProps) {
  const { factor, orderUnit, qtyOrder, pu, total, intact } = computeRowView(row);

  const [editing, setEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [qtyStr, setQtyStr] = useState("");
  const [puStr, setPuStr] = useState("");

  const startEdit = () => {
    setQtyStr(String(qtyOrder));
    setPuStr(pu != null ? String(pu) : "");
    setEditing(true);
  };

  const saveEdit = () => {
    const newOrderQty = parsePositive(qtyStr);
    const newUnitPrice = parsePositive(puStr);
    if (newOrderQty == null || newUnitPrice == null) return;
    updateMutation.mutate(
      {
        movementId: row.id,
        productStockId,
        quantityBefore: row.quantity_before,
        oldQuantity: row.quantity,
        remainingQuantity: row.remaining_quantity,
        factor,
        newOrderQty,
        newUnitPrice,
      },
      { onSuccess: () => setEditing(false) },
    );
  };

  return (
    <TableRow>
      <TableCell className="text-muted-foreground text-xs tabular-nums">
        {row.created_at ? format(parseISO(row.created_at), "d MMM yyyy", { locale: fr }) : "—"}
      </TableCell>
      <TableCell className="text-sm">{row.supplier_reference?.supplier?.name ?? "—"}</TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {row.supplier_reference?.supplier_product_name ?? "—"}
      </TableCell>
      <TableCell className="text-right text-sm tabular-nums">
        {editing ? (
          <Input
            value={qtyStr}
            onChange={(e) => setQtyStr(e.target.value)}
            inputMode="decimal"
            className="h-7 w-20 text-xs tabular-nums"
          />
        ) : (
          `${qtyOrder} ${orderUnit}`
        )}
      </TableCell>
      <TableCell className="text-right text-sm tabular-nums">
        {editing ? (
          <Input
            value={puStr}
            onChange={(e) => setPuStr(e.target.value)}
            inputMode="decimal"
            className="h-7 w-20 text-xs tabular-nums"
          />
        ) : pu != null ? (
          `${eur.format(pu)}${orderUnit ? `/${orderUnit}` : ""}`
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell className="text-right text-sm tabular-nums">{total != null ? eur.format(total) : "—"}</TableCell>
      <TableCell className="text-right">
        <RowActions
          editing={editing}
          intact={intact}
          pending={updateMutation.isPending || deleteMutation.isPending}
          onStartEdit={startEdit}
          onSave={saveEdit}
          onCancel={() => setEditing(false)}
          onDelete={() => setConfirmOpen(true)}
        />
        <DeleteReceptionDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          hasPrice={row.supplier_reference_id != null}
          onConfirm={(alsoDeletePrice) => {
            deleteMutation.mutate({
              movementId: row.id,
              productStockId,
              quantity: row.quantity,
              remainingQuantity: row.remaining_quantity,
              supplierReferenceId: row.supplier_reference_id,
              createdAt: row.created_at,
              alsoDeletePrice,
            });
            setConfirmOpen(false);
          }}
        />
      </TableCell>
    </TableRow>
  );
}

function RowActions({
  editing,
  intact,
  pending,
  onStartEdit,
  onSave,
  onCancel,
  onDelete,
}: {
  editing: boolean;
  intact: boolean;
  pending: boolean;
  onStartEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  if (editing) {
    return (
      <div className="flex items-center justify-end gap-1">
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={onSave}>
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onCancel}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }
  if (!intact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-muted-foreground inline-flex h-7 w-7 items-center justify-center">
            <Lock className="h-3.5 w-3.5" />
          </span>
        </TooltipTrigger>
        <TooltipContent>Réception déjà entamée par des ventes — corrigez via un ajustement.</TooltipContent>
      </Tooltip>
    );
  }
  return (
    <div className="flex items-center justify-end gap-0.5">
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onStartEdit} disabled={pending}>
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-destructive hover:text-destructive h-7 w-7"
        onClick={onDelete}
        disabled={pending}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function ReceptionHistoryTable({
  productId,
  organizationId,
  establishmentId,
  productStockId,
}: {
  productId: string;
  organizationId: string;
  establishmentId: string;
  productStockId: string;
}) {
  const { data: rows = [], isLoading } = useProductReceptions(productId, establishmentId);
  const deleteMutation = useDeleteReception(productId, organizationId, establishmentId);
  const updateMutation = useUpdateReception(productId, organizationId, establishmentId);

  if (isLoading) return <p className="text-muted-foreground text-sm">Chargement…</p>;
  if (rows.length === 0) return <p className="text-muted-foreground text-sm">Aucune réception enregistrée.</p>;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Fournisseur</TableHead>
            <TableHead>Référence</TableHead>
            <TableHead className="text-right">Qté</TableHead>
            <TableHead className="text-right">PU HT</TableHead>
            <TableHead className="text-right">Total HT</TableHead>
            <TableHead className="w-[80px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <ReceptionTableRow
              key={row.id}
              row={row}
              productStockId={productStockId}
              deleteMutation={deleteMutation}
              updateMutation={updateMutation}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
