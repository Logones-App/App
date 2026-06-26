"use client";

import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type ReconciliationRow, useFifoReconciliation } from "@/lib/queries/fifo-reporting-queries";

function DeltaBadge({ delta, unit }: { delta: number; unit: string }) {
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span className="tabular-nums">0</span>
      </span>
    );
  }
  const isNeg = delta < 0;
  return (
    <span
      className={`inline-flex items-center gap-1 font-medium tabular-nums ${
        isNeg ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
      }`}
    >
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      {delta > 0 ? "+" : ""}
      {delta} {unit}
    </span>
  );
}

function ReconciliationTable({ rows }: { rows: ReconciliationRow[] }) {
  const sorted = [...rows].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const driftCount = sorted.filter((r) => r.delta !== 0).length;

  return (
    <div className="space-y-3">
      {driftCount === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Tous les stocks sont cohérents avec les lots FIFO.
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            <strong>
              {driftCount} fiche{driftCount > 1 ? "s" : ""}
            </strong>{" "}
            avec écart entre <code className="text-xs">current_stock</code> et lots FIFO actifs.
          </span>
        </div>
      )}

      <div className="overflow-x-auto rounded border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produit</TableHead>
              <TableHead className="text-right">Stock actuel</TableHead>
              <TableHead className="text-right">Lots FIFO</TableHead>
              <TableHead className="text-right">Écart</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((row) => (
              <TableRow
                key={row.stockId}
                className={
                  row.delta !== 0
                    ? row.delta < 0
                      ? "bg-red-50/60 dark:bg-red-950/30"
                      : "bg-amber-50/60 dark:bg-amber-950/30"
                    : undefined
                }
              >
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{row.productName}</span>
                    <Badge variant="outline" className="w-fit text-[10px]">
                      {row.unit}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.currentStock} {row.unit}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.fifoSum} {row.unit}
                </TableCell>
                <TableCell className="text-right">
                  <DeltaBadge delta={row.delta} unit={row.unit} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-muted-foreground text-xs">
        <strong>Écart positif</strong> : current_stock &gt; lots FIFO — mouvements hors-réception (ajustement, import
        manuel).
        <br />
        <strong>Écart négatif</strong> : current_stock &lt; lots FIFO — ventes non tracées ou lots non consommés.
      </p>
    </div>
  );
}

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  establishmentId: string;
};

export function StockReconciliationModal({ open, onOpenChange, establishmentId }: Props) {
  const { data, isLoading, refetch, isFetching } = useFifoReconciliation(establishmentId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle>Réconciliation stock FIFO</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Rafraîchir
            </Button>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : !data?.length ? (
          <p className="text-muted-foreground text-sm">
            Aucune fiche stock avec suivi inventaire actif dans cet établissement.
          </p>
        ) : (
          <ReconciliationTable rows={data} />
        )}
      </DialogContent>
    </Dialog>
  );
}
