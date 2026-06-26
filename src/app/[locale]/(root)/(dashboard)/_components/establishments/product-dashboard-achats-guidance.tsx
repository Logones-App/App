"use client";

import { Fragment } from "react";

import { ArrowRight, Check } from "lucide-react";

import { useSupplierReferences } from "@/lib/queries/supplier-queries";

type Step = { n: number; label: string; hint: string; done: boolean };

function StepBadge({ step, isCurrent }: { step: Step; isCurrent: boolean }) {
  const base = "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold";
  if (step.done) {
    return (
      <span className={`${base} bg-green-600 text-white`}>
        <Check className="h-3.5 w-3.5" />
      </span>
    );
  }
  return (
    <span className={`${base} ${isCurrent ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
      {step.n}
    </span>
  );
}

/**
 * Fil d'étapes du parcours d'approvisionnement d'un ingrédient :
 * ① unité de stock → ② fournisseur & prix → ③ réception.
 * Se masque automatiquement une fois le stock et au moins un fournisseur configurés.
 */
export function AchatsGuidance({ productId, hasStock }: { productId: string; hasStock: boolean }) {
  const { data: refs = [] } = useSupplierReferences(productId);
  const hasSupplier = refs.length > 0;

  if (hasStock && hasSupplier) return null;

  const steps: Step[] = [
    { n: 1, label: "Unité de stock", hint: "Onglet Stock", done: hasStock },
    { n: 2, label: "Fournisseur & prix", hint: "Paramètres fournisseurs, ci-dessous", done: hasSupplier },
    { n: 3, label: "Réception", hint: "Bouton « Nouvelle réception »", done: false },
  ];
  const currentIndex = steps.findIndex((s) => !s.done);

  return (
    <div className="bg-muted/30 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border p-3">
      {steps.map((step, i) => {
        const isCurrent = i === currentIndex;
        return (
          <Fragment key={step.n}>
            <div className="flex items-center gap-2">
              <StepBadge step={step} isCurrent={isCurrent} />
              <div className="leading-tight">
                <p
                  className={`text-sm ${step.done ? "text-muted-foreground line-through" : isCurrent ? "font-medium" : "text-muted-foreground"}`}
                >
                  {step.label}
                </p>
                {!step.done && isCurrent && <p className="text-muted-foreground text-xs">{step.hint}</p>}
              </div>
            </div>
            {i < steps.length - 1 && <ArrowRight className="text-muted-foreground h-4 w-4 shrink-0" />}
          </Fragment>
        );
      })}
    </div>
  );
}
