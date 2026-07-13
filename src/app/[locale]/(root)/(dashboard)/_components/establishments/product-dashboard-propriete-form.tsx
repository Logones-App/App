"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { type AllergenKey, type LabelKey } from "@/lib/constants/product-attributes";
import type { LocalizedContent } from "@/lib/i18n/localized";
import { useEstablishmentPrinters, useOrganizationVatRates } from "@/lib/queries/establishments";
import { useRestoreProduct } from "@/lib/queries/product-archive";
import {
  PRODUCT_DASHBOARD_QUERY_KEY,
  type ProductWithCategoryName,
} from "@/lib/queries/product-establishment-dashboard";
import { useOrgCardLocales } from "@/lib/queries/public-menu-queries";
import { createClient } from "@/lib/supabase/client";

import { ArchiveProductDialog } from "./archive-product-dialog";
import { ProductBaseFields, type ProductBaseDraft } from "./product-base-fields";

const toTranslations = (v: unknown): LocalizedContent => (v && typeof v === "object" ? (v as LocalizedContent) : {});

function toDraft(product: ProductWithCategoryName): ProductBaseDraft {
  return {
    name: product.name,
    description: product.description ?? "",
    is_available: product.is_available ?? true,
    printer_id: product.printer_id ?? "__none__",
    vat_rate_id: product.vat_rate_id ?? "",
    sku: product.sku ?? "",
    food_cost_target: product.food_cost_target != null ? String(Math.round(product.food_cost_target * 100)) : "",
  };
}

export function ProductProprieteForm({
  product,
  productId,
  organizationId,
  establishmentId,
  backHref,
}: {
  product: ProductWithCategoryName;
  productId: string;
  organizationId: string;
  establishmentId: string;
  backHref: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: vatRates = [] } = useOrganizationVatRates(organizationId);
  const { data: printers = [] } = useEstablishmentPrinters(establishmentId, organizationId);
  const { data: orgLocales = ["fr"] } = useOrgCardLocales(organizationId);

  const [draft, setDraft] = useState<ProductBaseDraft>(() => toDraft(product));
  const [allergens, setAllergens] = useState<AllergenKey[]>(() => (product.allergens as AllergenKey[] | null) ?? []);
  const [labels, setLabels] = useState<LabelKey[]>(() => (product.labels as LabelKey[] | null) ?? []);
  const [origins, setOrigins] = useState<string[]>(() => (product.origins as string[] | null) ?? []);
  const [translations, setTranslations] = useState<LocalizedContent>(() => toTranslations(product.translations));
  const [archiveOpen, setArchiveOpen] = useState(false);

  useEffect(() => {
    setDraft(toDraft(product));
    setAllergens((product.allergens as AllergenKey[] | null) ?? []);
    setLabels((product.labels as LabelKey[] | null) ?? []);
    setOrigins((product.origins as string[] | null) ?? []);
    setTranslations(toTranslations(product.translations));
  }, [product]);

  const patch = (k: keyof ProductBaseDraft, v: string | boolean) => setDraft((prev) => ({ ...prev, [k]: v }));

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: [PRODUCT_DASHBOARD_QUERY_KEY, productId, establishmentId, organizationId],
    });
    void queryClient.invalidateQueries({ queryKey: ["organization-products", organizationId] });
    void queryClient.invalidateQueries({
      queryKey: ["establishment-products-with-stocks", establishmentId, organizationId],
    });
  };

  // Enregistrement unique : base + caractéristiques.
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!draft.name.trim()) throw new Error("Le nom est requis.");
      if (!draft.vat_rate_id) throw new Error("La TVA est requise.");
      const fct = parseFloat(draft.food_cost_target.replace(",", ".").replace("%", "")) / 100;
      const supabase = createClient();
      const { error } = await supabase
        .from("products")
        .update({
          name: draft.name.trim(),
          description: draft.description.trim() || null,
          is_available: draft.is_available,
          printer_id: draft.printer_id === "__none__" ? null : draft.printer_id,
          vat_rate_id: draft.vat_rate_id,
          allergens,
          labels,
          origins,
          sku: draft.sku.trim() || null,
          food_cost_target: Number.isFinite(fct) && fct > 0 && fct <= 1 ? Math.round(fct * 10000) / 10000 : null,
          translations,
        })
        .eq("id", productId)
        .eq("organization_id", organizationId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produit mis à jour.");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Échec de l'enregistrement."),
  });

  const restoreMutation = useRestoreProduct(organizationId, () => invalidate());

  const orphanPrinterId =
    product.printer_id && !printers.some((p) => p.id === product.printer_id) ? product.printer_id : null;
  const orphanVatId =
    product.vat_rate_id && !vatRates.some((v) => v.id === product.vat_rate_id) ? product.vat_rate_id : null;

  const archiveButton = !product.deleted ? (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="text-destructive border-destructive/40"
        onClick={() => setArchiveOpen(true)}
      >
        Archiver le produit
      </Button>
      <ArchiveProductDialog
        productId={productId}
        productName={product.name}
        organizationId={organizationId}
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        onArchived={() => {
          invalidate();
          router.push(backHref);
        }}
      />
    </>
  ) : null;

  return (
    <div className="space-y-6">
      {product.deleted && (
        <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-amber-800 dark:text-amber-200">
              Ce produit est archivé et n&apos;est plus listé dans le catalogue actif.
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={restoreMutation.isPending}
              onClick={() => restoreMutation.mutate(productId)}
            >
              {restoreMutation.isPending ? "Restauration…" : "Restaurer le produit"}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <ProductBaseFields
        draft={draft}
        patch={patch}
        allergens={allergens}
        setAllergens={setAllergens}
        labels={labels}
        setLabels={setLabels}
        origins={origins}
        setOrigins={setOrigins}
        vatRates={vatRates}
        printers={printers}
        headerRight={archiveButton}
        orphanPrinterId={orphanPrinterId}
        orphanVatId={orphanVatId}
        translations={translations}
        onTranslationsChange={setTranslations}
        orgLocales={orgLocales}
      />

      <Button type="button" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
        {saveMutation.isPending ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </div>
  );
}
