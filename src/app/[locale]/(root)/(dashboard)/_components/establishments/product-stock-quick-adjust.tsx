"use client";

import { useEffect, useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

export const PRODUCT_DASHBOARD_QUERY_KEY = "product-establishment-dashboard" as const;

export function parseStockAmount(raw: string): number | null {
  const t = raw
    .trim()
    .replace(/\s/g, "")
    .replace(/\u00a0/g, "")
    .replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

type Props = {
  stock: Tables<"product_stocks">;
  productId: string;
  establishmentId: string;
  organizationId: string;
  /** Libellé court pour le champ (accessibilité). */
  label?: string;
};

export function ProductStockQuickAdjust({
  stock,
  productId,
  establishmentId,
  organizationId,
  label = "Stock réel",
}: Props) {
  const queryClient = useQueryClient();
  const [val, setVal] = useState(String(stock.current_stock));

  useEffect(() => {
    setVal(String(stock.current_stock));
  }, [stock.id, stock.current_stock]);

  const mutation = useMutation({
    mutationFn: async (next: number) => {
      const supabase = createClient();
      const { error } = await supabase.from("product_stocks").update({ current_stock: next }).eq("id", stock.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Stock réel mis à jour.");
      void queryClient.invalidateQueries({
        queryKey: ["establishment-products-with-stocks", establishmentId, organizationId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["establishment-stocks", establishmentId, organizationId],
      });
      void queryClient.invalidateQueries({
        queryKey: [PRODUCT_DASHBOARD_QUERY_KEY, productId, establishmentId, organizationId],
      });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Mise à jour impossible.");
    },
  });

  return (
    <div className="flex flex-wrap items-end gap-2 border-t border-dashed pt-3">
      <div className="space-y-1">
        <Label htmlFor={`stock-qty-${stock.id}`} className="text-muted-foreground text-xs">
          {label}
        </Label>
        <Input
          id={`stock-qty-${stock.id}`}
          className="h-8 w-28 text-xs tabular-nums"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          type="text"
          inputMode="decimal"
          disabled={mutation.isPending}
        />
      </div>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="h-8"
        disabled={mutation.isPending}
        onClick={() => {
          const parsed = parseStockAmount(val);
          if (parsed === null) {
            toast.error("Quantité invalide.");
            return;
          }
          if (parsed === stock.current_stock) {
            toast.message("Déjà cette valeur.");
            return;
          }
          mutation.mutate(parsed);
        }}
      >
        Appliquer
      </Button>
    </div>
  );
}
