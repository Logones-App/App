"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { AllergenKey, LabelKey, ProductTypeKey } from "@/lib/constants/product-attributes";
import { insertMenusProductPriceHistoryRow } from "@/lib/menus-products-price-history";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import { Step1BaseInfo } from "./product-new-step1-base";
import { Step2Prix } from "./product-new-step2-prix";
import { Step3Caracteristiques } from "./product-new-step3-caracteristiques";
import { Step4Fournisseur } from "./product-new-step4-fournisseur";
import { Step5Ingredients } from "./product-new-step5-ingredients";

type WizardStep = 1 | 2 | 3 | 4 | 5;

export type WizardSupplierLink = {
  supplier_id: string;
  supplier_name: string;
  supplier_product_ref: string;
  supplier_product_name: string;
  order_unit: string;
  order_quantity: string;
  lead_time_days: string;
  is_preferred: boolean;
  notes: string;
  unit_price: string;
};

export type WizardComposition = {
  component_product_id: string;
  component_name: string;
  default_quantity: number;
  quantity_unit: string;
  unit_cost: number | null;
  ingredient_portion_unit: string | null;
};

export type WizardData = {
  name: string;
  description: string;
  vat_rate_id: string;
  printer_id: string;
  is_available: boolean;
  product_types: ProductTypeKey[];
  menu_prices: Record<string, string>;
  sku: string;
  purchase_price: string;
  portion_weight: string;
  portion_unit: string;
  food_cost_target: string;
  allergens: AllergenKey[];
  labels: LabelKey[];
  supplier_links: WizardSupplierLink[];
  compositions: WizardComposition[];
};

function emptyData(): WizardData {
  return {
    name: "",
    description: "",
    vat_rate_id: "",
    printer_id: "__none__",
    is_available: true,
    product_types: [],
    menu_prices: {},
    sku: "",
    purchase_price: "",
    portion_weight: "",
    portion_unit: "",
    food_cost_target: "",
    allergens: [],
    labels: [],
    supplier_links: [],
    compositions: [],
  };
}

type Supa = ReturnType<typeof createClient>;

async function saveMenuPrices(
  supabase: Supa,
  productId: string,
  establishmentId: string,
  organizationId: string,
  menuPrices: Record<string, string>,
) {
  const entries = Object.entries(menuPrices)
    .map(([menuId, raw]) => {
      const n = parseFloat(raw.replace(",", "."));
      return { menuId, price: Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null };
    })
    .filter((e): e is { menuId: string; price: number } => e.price !== null);
  for (const entry of entries) {
    const { data: mp, error } = await supabase
      .from("menus_products")
      .insert({
        menus_id: entry.menuId,
        products_id: productId,
        establishment_id: establishmentId,
        organization_id: organizationId,
        price: entry.price,
        deleted: false,
      })
      .select("id")
      .single();
    if (error) throw error;
    if (mp.id) await insertMenusProductPriceHistoryRow(supabase, mp.id, entry.price, "product_creation");
  }
}

async function saveSupplierLinks(
  supabase: Supa,
  productId: string,
  organizationId: string,
  links: WizardSupplierLink[],
) {
  for (const link of links) {
    const qty = parseFloat(link.order_quantity.replace(",", "."));
    const days = parseInt(link.lead_time_days, 10);
    const up = parseFloat(link.unit_price.replace(",", "."));
    const unitPrice = Number.isFinite(up) && up > 0 ? Math.round(up * 10000) / 10000 : null;
    const { error } = await supabase.from("product_suppliers").insert({
      product_id: productId,
      supplier_id: link.supplier_id,
      organization_id: organizationId,
      supplier_product_ref: link.supplier_product_ref || null,
      supplier_product_name: link.supplier_product_name || null,
      order_unit: link.order_unit || null,
      order_quantity: Number.isFinite(qty) && qty > 0 ? qty : null,
      lead_time_days: Number.isFinite(days) && days >= 0 ? days : null,
      is_preferred: link.is_preferred,
      notes: link.notes || null,
      unit_price: unitPrice,
    });
    if (error) throw error;
    if (unitPrice) {
      await supabase.from("product_purchase_price_history").insert({
        product_id: productId,
        organization_id: organizationId,
        unit_cost: unitPrice,
        supplier_id: link.supplier_id,
        effective_from: new Date().toISOString().slice(0, 10),
        currency: "EUR",
      });
    }
  }
}

async function saveCompositions(
  supabase: Supa,
  productId: string,
  establishmentId: string,
  organizationId: string,
  compositions: WizardComposition[],
) {
  for (const comp of compositions) {
    const { error } = await supabase.from("product_compositions").insert({
      main_product_id: productId,
      component_product_id: comp.component_product_id,
      composition_kind: "recipe",
      default_quantity: comp.default_quantity,
      quantity_unit: comp.quantity_unit,
      establishment_id: establishmentId,
      organization_id: organizationId,
      is_required: false,
      deleted: false,
    });
    if (error) throw error;
  }
}

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
  const [step, setStep] = useState<WizardStep>(1);
  const [data, setData] = useState<WizardData>(emptyData);

  const patch = (updates: Partial<WizardData>) => setData((prev) => ({ ...prev, ...updates }));

  const isRecipe = data.product_types.includes("recipe");
  const canCreate = data.name.trim().length > 0 && data.vat_rate_id.length > 0;

  useEffect(() => {
    if (!isRecipe && step === 5) setStep(4);
  }, [isRecipe, step]);

  const steps: { id: WizardStep; label: string }[] = useMemo(
    () => [
      { id: 1, label: "Infos de base" },
      { id: 2, label: "Prix & menus" },
      { id: 3, label: "Caractéristiques" },
      { id: 4, label: "Fournisseur" },
      ...(isRecipe ? ([{ id: 5, label: "Ingrédients" }] as { id: WizardStep; label: string }[]) : []),
    ],
    [isRecipe],
  );

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!data.name.trim()) throw new Error("Le nom est requis.");
      if (!data.vat_rate_id) throw new Error("La TVA est requise.");
      const supabase = createClient();

      const pw = parseFloat(data.portion_weight.replace(",", "."));
      const fct = parseFloat(data.food_cost_target.replace(",", ".").replace("%", "")) / 100;

      const { data: created, error: prodErr } = await supabase
        .from("products")
        .insert({
          organization_id: organizationId,
          name: data.name.trim(),
          description: data.description.trim() || null,
          category_id: null,
          price: 0,
          is_available: data.is_available,
          printer_id: data.printer_id === "__none__" ? null : data.printer_id,
          vat_rate_id: data.vat_rate_id,
          product_type: data.product_types,
          allergens: data.allergens,
          labels: data.labels,
          portion_weight: Number.isFinite(pw) && pw > 0 ? pw : null,
          portion_unit: data.portion_unit || null,
          sku: data.sku.trim() || null,
          food_cost_target: Number.isFinite(fct) && fct > 0 && fct <= 1 ? Math.round(fct * 10000) / 10000 : null,
          deleted: false,
        })
        .select("id")
        .single();
      if (prodErr) throw prodErr;
      const productId = created.id;

      // Prix d'achat : depuis les fournisseurs en priorité, sinon prix manuel
      const hasSupplierPrice = data.supplier_links.some((l) => {
        const p = parseFloat(l.unit_price.replace(",", "."));
        return Number.isFinite(p) && p > 0;
      });
      if (!hasSupplierPrice) {
        const pp = parseFloat(data.purchase_price.replace(",", "."));
        if (Number.isFinite(pp) && pp > 0) {
          await supabase.from("product_purchase_price_history").insert({
            product_id: productId,
            organization_id: organizationId,
            unit_cost: Math.round(pp * 10000) / 10000,
            supplier_id: null,
            effective_from: new Date().toISOString().slice(0, 10),
            currency: "EUR",
          });
        }
      }

      await saveMenuPrices(supabase, productId, establishmentId, organizationId, data.menu_prices);
      await saveSupplierLinks(supabase, productId, organizationId, data.supplier_links);
      await saveCompositions(supabase, productId, establishmentId, organizationId, data.compositions);
    },
    onSuccess: () => {
      toast.success("Produit créé.");
      void queryClient.invalidateQueries({ queryKey: ["organization-products", organizationId] });
      void queryClient.invalidateQueries({
        queryKey: ["establishment-products-with-stocks", establishmentId, organizationId],
      });
      router.push(backHref);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Création impossible."),
  });

  const validationError = useMemo(() => {
    if (!data.name.trim()) return "Nom requis (étape 1)";
    if (!data.vat_rate_id) return "TVA requise (étape 1)";
    return null;
  }, [data.name, data.vat_rate_id]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <Button variant="outline" size="sm" asChild className="w-fit">
          <Link href={backHref}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à la liste
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Nouveau produit</h1>
        <p className="text-muted-foreground text-sm">
          Remplissez les étapes puis cliquez sur <strong>Créer le produit</strong>.
        </p>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b" aria-label="Étapes">
        {steps.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStep(s.id)}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              step === s.id
                ? "border-primary text-primary"
                : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            {s.id}. {s.label}
          </button>
        ))}
      </nav>

      {step === 1 && (
        <Step1BaseInfo data={data} patch={patch} establishmentId={establishmentId} organizationId={organizationId} />
      )}
      {step === 2 && (
        <Step2Prix data={data} patch={patch} establishmentId={establishmentId} organizationId={organizationId} />
      )}
      {step === 3 && <Step3Caracteristiques data={data} patch={patch} />}
      {step === 4 && <Step4Fournisseur data={data} patch={patch} organizationId={organizationId} />}
      {step === 5 && isRecipe && <Step5Ingredients data={data} patch={patch} organizationId={organizationId} />}

      <div className="flex items-center gap-4 border-t pt-4">
        <Button type="button" disabled={!canCreate || createMutation.isPending} onClick={() => createMutation.mutate()}>
          {createMutation.isPending ? "Création…" : "Créer le produit"}
        </Button>
        {validationError && <p className="text-destructive text-sm">{validationError}</p>}
      </div>
    </div>
  );
}
