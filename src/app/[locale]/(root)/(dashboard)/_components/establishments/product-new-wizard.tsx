"use client";

import { useRef, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { ProductTypeKey } from "@/lib/constants/product-attributes";
import { useEstablishmentPrinters, useEstablishmentVatRates } from "@/lib/queries/establishments";
import { createClient } from "@/lib/supabase/client";

import { Step1FormFields } from "./product-new-step1-base";

type Draft = {
  name: string;
  description: string;
  vat_rate_id: string;
  printer_id: string;
  is_available: boolean;
};

type Action = "fiche" | "new" | "close";

const emptyDraft = (): Draft => ({
  name: "",
  description: "",
  vat_rate_id: "",
  printer_id: "__none__",
  is_available: true,
});

export function ProductNewWizard({
  establishmentId,
  organizationId,
  backHref,
}: {
  establishmentId: string;
  organizationId: string;
  backHref: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const normalizedBase = backHref.replace(/\/$/, "");

  const { data: vatRates = [] } = useEstablishmentVatRates(establishmentId);
  const { data: printers = [] } = useEstablishmentPrinters(establishmentId, organizationId);

  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [productTypes, setProductTypes] = useState<ProductTypeKey[]>([]);
  const actionRef = useRef<Action>("fiche");

  const patch = (k: keyof Draft, v: string | boolean) => setDraft((prev) => ({ ...prev, [k]: v }));

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!draft.name.trim()) throw new Error("Le nom est requis.");
      if (!draft.vat_rate_id) throw new Error("La TVA est requise.");
      const supabase = createClient();
      const { data, error } = await supabase
        .from("products")
        .insert({
          organization_id: organizationId,
          name: draft.name.trim(),
          description: draft.description.trim() || null,
          category_id: null,
          price: 0,
          is_available: draft.is_available,
          printer_id: draft.printer_id === "__none__" ? null : draft.printer_id,
          vat_rate_id: draft.vat_rate_id,
          product_type: productTypes,
          deleted: false,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (productId) => {
      toast.success("Produit créé.");
      void queryClient.invalidateQueries({ queryKey: ["organization-products", organizationId] });
      void queryClient.invalidateQueries({
        queryKey: ["establishment-products-with-stocks", establishmentId, organizationId],
      });
      const action = actionRef.current;
      if (action === "fiche") {
        router.push(`${normalizedBase}/${productId}`);
      } else if (action === "close") {
        router.push(backHref);
      } else {
        setDraft(emptyDraft());
        setProductTypes([]);
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Création impossible."),
  });

  const handleSave = (action: Action) => {
    if (!draft.name.trim()) {
      toast.error("Le nom est requis.");
      return;
    }
    if (!draft.vat_rate_id) {
      toast.error("La TVA est requise.");
      return;
    }
    actionRef.current = action;
    createMutation.mutate();
  };

  const busy = createMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
            <Link href={backHref}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Retour à la liste
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Nouveau produit</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => router.push(backHref)}>
            Fermer
          </Button>
          <Button variant="outline" size="sm" disabled={busy} onClick={() => handleSave("new")}>
            {busy && actionRef.current === "new" ? "Création…" : "Créer et Nouveau"}
          </Button>
          <Button size="sm" disabled={busy} onClick={() => handleSave("fiche")}>
            {busy && actionRef.current === "fiche" ? "Création…" : "Créer et accéder à la fiche →"}
          </Button>
        </div>
      </div>

      <Step1FormFields
        draft={draft}
        patch={patch}
        productTypes={productTypes}
        setProductTypes={setProductTypes}
        vatRates={vatRates}
        printers={printers}
      />
    </div>
  );
}
