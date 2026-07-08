"use client";

import { useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PortionInput } from "@/components/ui/product-attribute-pickers";
import { PRODUCT_DASHBOARD_QUERY_KEY } from "@/lib/queries/product-establishment-dashboard";
import { createClient } from "@/lib/supabase/client";

/**
 * Poids/volume d'une portion vendue (ex. 200 g). Notion de vente (affichée pour tout produit vendable,
 * recette ou non), déplacée hors des « Caractéristiques ». Sert au coût matière par portion.
 */
export function SoldPortionCard({
  productId,
  establishmentId,
  organizationId,
  portionWeight,
  portionUnit,
}: {
  productId: string;
  establishmentId: string;
  organizationId: string;
  portionWeight: number | null;
  portionUnit: string | null;
}) {
  const queryClient = useQueryClient();
  const [weight, setWeight] = useState(portionWeight != null ? String(portionWeight) : "");
  const [unit, setUnit] = useState(portionUnit ?? "");

  const mutation = useMutation({
    mutationFn: async () => {
      const pw = parseFloat(weight.replace(",", "."));
      const supabase = createClient();
      const { error } = await supabase
        .from("products")
        .update({
          portion_weight: Number.isFinite(pw) && pw > 0 ? pw : null,
          portion_unit: unit || null,
        })
        .eq("id", productId)
        .eq("organization_id", organizationId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Portion enregistrée.");
      void queryClient.invalidateQueries({
        queryKey: [PRODUCT_DASHBOARD_QUERY_KEY, productId, establishmentId, organizationId],
      });
      void queryClient.invalidateQueries({ queryKey: ["organization-products", organizationId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur lors de l'enregistrement."),
  });

  const dirty = weight !== (portionWeight != null ? String(portionWeight) : "") || unit !== (portionUnit ?? "");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Portion vendue</CardTitle>
        <CardDescription>
          Poids ou volume d&apos;une portion servie au client (ex.&nbsp;200&nbsp;g). Sert au coût matière par portion.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-end gap-2">
          <PortionInput weight={weight} unit={unit} onWeightChange={setWeight} onUnitChange={setUnit} />
          <Button
            type="button"
            size="sm"
            className="mb-0.5"
            disabled={!dirty || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "…" : "Enregistrer"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
