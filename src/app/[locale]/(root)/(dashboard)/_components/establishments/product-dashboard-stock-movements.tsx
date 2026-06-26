"use client";

import { useState } from "react";

import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  MOVEMENT_TYPES,
  type MovementType,
  type StockMovementRow,
  useAddStockMovement,
  useProductStockMovements,
} from "@/lib/queries/stock-movement-queries";

function applySign(qty: number, sign: "positive" | "negative" | "both"): number {
  if (sign === "negative") return -Math.abs(qty);
  if (sign === "positive") return Math.abs(qty);
  return qty;
}

function StockMovementForm({
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
  const [movementType, setMovementType] = useState<MovementType>("purchase");
  const [quantityStr, setQuantityStr] = useState("");
  const [totalPriceStr, setTotalPriceStr] = useState("");
  const [notes, setNotes] = useState("");

  const addMutation = useAddStockMovement(productId, organizationId, establishmentId, productStockId, unit);

  const typeConfig = MOVEMENT_TYPES.find((t) => t.key === movementType)!;
  const rawQty = parseFloat(quantityStr.replace(",", "."));
  const effectiveQty = Number.isFinite(rawQty) ? applySign(rawQty, typeConfig.sign) : null;
  const quantityAfterPreview = effectiveQty != null ? currentStock + effectiveQty : null;
  const totalPrice = totalPriceStr ? parseFloat(totalPriceStr.replace(",", ".")) : undefined;
  const unitCostPreview =
    totalPrice != null && effectiveQty != null && effectiveQty !== 0
      ? Math.round((totalPrice / Math.abs(effectiveQty)) * 100000) / 100000
      : null;

  const handleSubmit = () => {
    if (effectiveQty == null) {
      toast.error("Quantité invalide");
      return;
    }
    if (movementType === "purchase" && (totalPrice == null || !Number.isFinite(totalPrice) || totalPrice <= 0)) {
      toast.error("Le prix total HT est requis pour une réception fournisseur");
      return;
    }
    addMutation.mutate(
      { movementType, quantity: effectiveQty, notes, currentStock, totalPrice },
      { onSuccess: onClose },
    );
  };

  return (
    <div className="bg-muted/30 space-y-4 rounded-lg border p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Type de mouvement</Label>
          <Select value={movementType} onValueChange={(v) => setMovementType(v as MovementType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MOVEMENT_TYPES.map((t) => (
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
                ? "(sortie — toujours négatif)"
                : typeConfig.sign === "positive"
                  ? "(entrée — toujours positif)"
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
        {movementType === "purchase" && (
          <div className="space-y-2">
            <Label>
              Prix total HT (€){" "}
              <span className="text-muted-foreground text-xs font-normal">total de la ligne sur le BL</span>
            </Label>
            <Input
              value={totalPriceStr}
              onChange={(e) => setTotalPriceStr(e.target.value)}
              inputMode="decimal"
              placeholder="ex: 7.50"
              className="tabular-nums"
            />
            {unitCostPreview != null && unit && (
              <p className="text-muted-foreground text-xs">
                → coût unitaire FIFO :{" "}
                <strong>
                  {unitCostPreview} €/{unit}
                </strong>
              </p>
            )}
          </div>
        )}
        <div className="space-y-2 sm:col-span-2">
          <Label>Notes (optionnel)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Numéro BL, raison de l'ajustement…"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={handleSubmit} disabled={addMutation.isPending || effectiveQty == null}>
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base">Mouvements de stock</CardTitle>
          <CardDescription>
            Réceptions fournisseur, ajustements inventaire, pertes. Stock actuel : <strong>{currentStock}</strong>
            {unit ? ` ${unit}` : ""}
          </CardDescription>
        </div>
        {!showForm && productStockId && (
          <Button type="button" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Saisir un mouvement
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && productStockId && (
          <StockMovementForm
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
          <MovementsTable movements={movements} unit={unit} />
        )}
      </CardContent>
    </Card>
  );
}

function MovementsTable({ movements, unit }: { movements: StockMovementRow[]; unit: string | null }) {
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
