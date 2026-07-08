"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type AllergenKey, type LabelKey, type ProductTypeKey } from "@/lib/constants/product-attributes";
import { useEstablishmentPrinters, useEstablishmentVatRates } from "@/lib/queries/establishments";
import { createClient } from "@/lib/supabase/client";

import { ProductBaseFields, type ProductBaseDraft } from "./product-base-fields";

export type CreationIntent = "product" | "ingredient";

// Chaque item décide QUOI créer ensuite : il pose le product_type déduit et enchaîne sur le bon onglet.
type NextAction = {
  key: string;
  label: string;
  types: ProductTypeKey[];
  tab: string;
};

const SELL_ACTIONS: NextAction[] = [
  { key: "ingredients", label: "Cuisiné — ajouter des ingrédients", types: ["sellable"], tab: "recette" },
  { key: "achat", label: "Acheté prêt — prix d'achat", types: ["ingredient", "sellable"], tab: "achats" },
  { key: "prix", label: "Vendu tel quel — prix de vente", types: ["sellable"], tab: "prix-menus" },
];
const MATIERE_ACTION: NextAction = {
  key: "matiere",
  label: "Créer une matière (non vendue)",
  types: ["ingredient"],
  tab: "achats",
};

const emptyDraft = (): ProductBaseDraft => ({
  name: "",
  description: "",
  is_available: true,
  printer_id: "__none__",
  vat_rate_id: "",
  sku: "",
  food_cost_target: "",
});

export function ProductNewWizard({
  establishmentId,
  organizationId,
  backHref,
  intent = "product",
}: {
  establishmentId: string;
  organizationId: string;
  backHref: string;
  intent?: CreationIntent;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const normalizedBase = backHref.replace(/\/$/, "");
  const namePlaceholder = intent === "ingredient" ? "Nom de l'ingrédient" : "Nom du produit";

  const { data: vatRates = [] } = useEstablishmentVatRates(establishmentId);
  const { data: printers = [] } = useEstablishmentPrinters(establishmentId, organizationId);

  const [draft, setDraft] = useState<ProductBaseDraft>(emptyDraft);
  const [allergens, setAllergens] = useState<AllergenKey[]>([]);
  const [labels, setLabels] = useState<LabelKey[]>([]);
  const [origins, setOrigins] = useState<string[]>([]);

  const patch = (k: keyof ProductBaseDraft, v: string | boolean) => setDraft((prev) => ({ ...prev, [k]: v }));

  const createMutation = useMutation({
    mutationFn: async (action: NextAction) => {
      const fct = parseFloat(draft.food_cost_target.replace(",", ".").replace("%", "")) / 100;
      const supabase = createClient();
      const { data, error } = await supabase
        .from("products")
        .insert({
          organization_id: organizationId,
          name: draft.name.trim(),
          description: draft.description.trim() || null,
          category_id: null,
          is_available: draft.is_available,
          printer_id: draft.printer_id === "__none__" ? null : draft.printer_id,
          vat_rate_id: draft.vat_rate_id,
          product_type: action.types,
          allergens,
          labels,
          origins,
          sku: draft.sku.trim() || null,
          food_cost_target: Number.isFinite(fct) && fct > 0 && fct <= 1 ? Math.round(fct * 10000) / 10000 : null,
          deleted: false,
        })
        .select("id")
        .single();
      if (error) throw error;
      return { id: data.id, tab: action.tab };
    },
    onSuccess: ({ id, tab }) => {
      toast.success("Produit créé.");
      void queryClient.invalidateQueries({ queryKey: ["organization-products", organizationId] });
      void queryClient.invalidateQueries({
        queryKey: ["establishment-products-with-stocks", establishmentId, organizationId],
      });
      router.push(`${normalizedBase}/${id}?tab=${tab}`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Création impossible."),
  });

  const run = (action: NextAction) => {
    if (!draft.name.trim()) {
      toast.error("Le nom est requis.");
      return;
    }
    if (!draft.vat_rate_id) {
      toast.error("La TVA est requise.");
      return;
    }
    createMutation.mutate(action);
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
          <p className="text-muted-foreground text-sm">
            Renseignez la fiche, puis choisissez la suite selon ce qu&apos;est le produit.
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" disabled={busy}>
              {busy ? "Création…" : "Créer et…"}
              <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Produit à vendre</DropdownMenuLabel>
            {SELL_ACTIONS.map((a) => (
              <DropdownMenuItem key={a.key} onSelect={() => run(a)}>
                {a.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => run(MATIERE_ACTION)}>{MATIERE_ACTION.label}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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
        namePlaceholder={namePlaceholder}
      />
    </div>
  );
}
