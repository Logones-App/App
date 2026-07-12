"use client";

import { useState } from "react";

import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Info, Plus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useEstablishmentStockOwner } from "@/lib/queries/establishments-queries";
import {
  MOVEMENT_TYPES,
  type MovementType,
  type StockMovementRow,
  useActiveFifoLotsCount,
  useAddStockMovement,
  useProductStockMovements,
} from "@/lib/queries/stock-movement-queries";

// Types de variation disponibles dans l'onglet Stock (hors purchase, géré dans Achats)
const VARIATION_TYPES = MOVEMENT_TYPES.filter((t) => t.key !== "purchase");

function applySign(qty: number, sign: "positive" | "negative" | "both"): number {
  if (sign === "negative") return -Math.abs(qty);
  if (sign === "positive") return Math.abs(qty);
  return qty;
}

function StockVariationForm({
  currentStock,
  unit,
  productId,
  organizationId,
  establishmentId,
  productStockId,
  onClose,
}: {
  currentStock: number;
  unit: string | null;
  productId: string;
  organizationId: string;
  establishmentId: string;
  productStockId: string;
  onClose: () => void;
}) {
  const [movementType, setMovementType] = useState<MovementType>("waste");
  const [quantityStr, setQuantityStr] = useState("");
  const [notes, setNotes] = useState("");

  const addMutation = useAddStockMovement(productId, organizationId, establishmentId, productStockId, unit);
  const typeConfig = VARIATION_TYPES.find((t) => t.key === movementType)!;
  const rawQty = parseFloat(quantityStr.replace(",", "."));
  const effectiveQty = Number.isFinite(rawQty) ? applySign(rawQty, typeConfig.sign) : null;
  const quantityAfterPreview = effectiveQty != null ? currentStock + effectiveQty : null;

  const handleSubmit = () => {
    if (effectiveQty == null || effectiveQty === 0) {
      toast.error("Quantité invalide");
      return;
    }
    addMutation.mutate({ movementType, quantity: effectiveQty, notes, currentStock }, { onSuccess: onClose });
  };

  return (
    <div className="bg-muted/30 space-y-4 rounded-lg border p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Type de variation</Label>
          <Select value={movementType} onValueChange={(v) => setMovementType(v as MovementType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VARIATION_TYPES.map((t) => (
                <SelectItem key={t.key} value={t.key}>
                  {t.emoji} {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>
            Quantité{unit ? ` (${unit})` : ""}{" "}
            <span className="text-muted-foreground text-xs font-normal">
              {typeConfig.sign === "negative"
                ? "(sortie)"
                : typeConfig.sign === "positive"
                  ? "(entrée)"
                  : "(positif = entrée, négatif = sortie)"}
            </span>
          </Label>
          <Input
            value={quantityStr}
            onChange={(e) => setQuantityStr(e.target.value)}
            inputMode="decimal"
            placeholder={typeConfig.sign === "both" ? "ex: 5 ou -3" : "0"}
            className="tabular-nums"
          />
          {quantityAfterPreview != null && (
            <p className="text-muted-foreground text-xs">
              Stock après :{" "}
              <strong className={quantityAfterPreview < 0 ? "text-red-600" : ""}>{quantityAfterPreview}</strong>
              {quantityAfterPreview < 0 && " ⚠️ stock négatif"}
            </p>
          )}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Notes (optionnel)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Raison de l'ajustement, numéro de lot concerné…"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          onClick={handleSubmit}
          disabled={addMutation.isPending || effectiveQty == null || effectiveQty === 0}
        >
          {addMutation.isPending ? "Enregistrement…" : "Enregistrer"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Annuler
        </Button>
      </div>
    </div>
  );
}

export function StockMovementsSection({
  productId,
  organizationId,
  establishmentId,
  productStockId,
  currentStock,
  unit,
}: {
  productId: string;
  organizationId: string;
  establishmentId: string;
  productStockId: string | null;
  currentStock: number;
  unit: string | null;
}) {
  const [showForm, setShowForm] = useState(false);
  const { data: movements = [], isLoading } = useProductStockMovements(productId, organizationId, establishmentId);
  const { data: activeLots = 0 } = useActiveFifoLotsCount(productStockId);
  const stockOwner = useEstablishmentStockOwner(establishmentId);

  // En 'pos', inventaire/pertes/corrections sont gérés sur la caisse (règle d'or) → pas de déclaration SaaS.
  const isPos = stockOwner === "pos";
  const canDeclare = activeLots > 0 && !isPos;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base">Variations de stock</CardTitle>
          <CardDescription>
            Pertes, ajustements inventaire, transferts. Stock actuel : <strong>{currentStock}</strong>
            {unit ? ` ${unit}` : ""}
          </CardDescription>
        </div>
        {!showForm && productStockId && canDeclare && (
          <Button type="button" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Déclarer une variation
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50/60 px-3 py-2 text-xs text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Pour réceptionner une commande fournisseur, utilisez l&apos;onglet <strong>Achats</strong>.
        </div>
        {productStockId && !canDeclare && !isPos && (
          <p className="text-muted-foreground text-sm">
            Aucun stock disponible (lots FIFO épuisés). Faites une réception dans l&apos;onglet Achats.
          </p>
        )}
        {isPos && (
          <p className="text-muted-foreground text-sm">
            Inventaire, pertes et corrections de stock sont gérés <strong>sur la caisse</strong>.
          </p>
        )}
        {showForm && productStockId && (
          <StockVariationForm
            currentStock={currentStock}
            unit={unit}
            productId={productId}
            organizationId={organizationId}
            establishmentId={establishmentId}
            productStockId={productStockId}
            onClose={() => setShowForm(false)}
          />
        )}
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Chargement…</p>
        ) : movements.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">Aucun mouvement enregistré.</p>
        ) : (
          <MovementsTable movements={movements} />
        )}
      </CardContent>
    </Card>
  );
}

function MovementsTable({ movements }: { movements: StockMovementRow[] }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Qté</TableHead>
            <TableHead className="text-right">Avant</TableHead>
            <TableHead className="text-right">Après</TableHead>
            <TableHead className="text-right">Total HT</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movements.map((m) => {
            const type = MOVEMENT_TYPES.find((t) => t.key === m.movement_type);
            const isPositive = m.quantity > 0;
            return (
              <TableRow key={m.id}>
                <TableCell className="text-muted-foreground text-sm tabular-nums">
                  {m.created_at ? format(parseISO(m.created_at), "d MMM à HH:mm", { locale: fr }) : "—"}
                </TableCell>
                <TableCell className="text-sm">
                  {type ? (
                    <span>
                      {type.emoji} {type.label}
                    </span>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      {m.movement_type}
                    </Badge>
                  )}
                </TableCell>
                <TableCell
                  className={`text-right font-medium tabular-nums ${isPositive ? "text-green-600" : "text-red-600"}`}
                >
                  {isPositive ? "+" : ""}
                  {m.quantity}
                </TableCell>
                <TableCell className="text-muted-foreground text-right tabular-nums">{m.quantity_before}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">{m.quantity_after}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  {m.unit_cost != null
                    ? `${(Math.abs(m.quantity) * m.unit_cost).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
                    : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground max-w-[200px] truncate text-sm">{m.notes ?? "—"}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
