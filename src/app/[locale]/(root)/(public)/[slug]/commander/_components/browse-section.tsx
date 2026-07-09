"use client";

import { Plus } from "lucide-react";

import type { Formula } from "@/app/api/table-order/formulas/route";
import { Button } from "@/components/ui/button";

import { formatPrice, type PublicProduct, type PublicSection } from "../../menu/_components/menu-utils";

interface Props {
  sections: PublicSection[];
  formulas: Formula[];
  cartLength: number;
  totalPrice: number;
  isAddingItems: boolean;
  guestName: string;
  getProductCount: (menuProductId: string) => number;
  onAddProduct: (item: PublicProduct) => void;
  onOpenFormula: (formula: Formula) => void;
  onGoToCheckout: () => void;
}

function ItemLine({
  item,
  count,
  onAddProduct,
}: {
  item: PublicProduct;
  count: number;
  onAddProduct: (item: PublicProduct) => void;
}) {
  return (
    <div className={`flex items-center gap-3 ${item.isOutOfStock ? "opacity-50" : ""}`}>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{item.name}</p>
        {item.description && <p className="text-muted-foreground line-clamp-2 text-xs">{item.description}</p>}
        {item.price !== null && (
          <p className="mt-0.5 text-sm font-semibold">{item.isOutOfStock ? "Épuisé" : formatPrice(item.price)}</p>
        )}
      </div>
      {item.price !== null && (
        <div className="relative shrink-0">
          <button
            onClick={() => onAddProduct(item)}
            disabled={item.isOutOfStock}
            className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-full disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
          {count > 0 && (
            <span className="bg-primary text-primary-foreground absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold">
              {count}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function SectionBlock({
  section,
  depth,
  getProductCount,
  onAddProduct,
}: {
  section: PublicSection;
  depth: number;
  getProductCount: (menuProductId: string) => number;
  onAddProduct: (item: PublicProduct) => void;
}) {
  const hasItems = section.items.length > 0;
  const hasSubs = section.subsections.length > 0;
  if (!hasItems && !hasSubs) return null;

  return (
    <div className={depth === 0 ? "px-4 py-5" : "mt-4 border-l-2 pl-3"}>
      <h2 className={depth === 0 ? "mb-3 text-base font-semibold" : "text-muted-foreground mb-2 text-sm font-semibold"}>
        {section.name}
      </h2>
      {hasItems && (
        <div className="space-y-4">
          {section.items.map((item) => (
            <ItemLine
              key={item.menuProductId}
              item={item}
              count={getProductCount(item.menuProductId)}
              onAddProduct={onAddProduct}
            />
          ))}
        </div>
      )}
      {section.subsections.map((sub) => (
        <SectionBlock
          key={sub.id}
          section={sub}
          depth={depth + 1}
          getProductCount={getProductCount}
          onAddProduct={onAddProduct}
        />
      ))}
    </div>
  );
}

export function BrowseSection({
  sections,
  formulas,
  cartLength,
  totalPrice,
  isAddingItems,
  guestName,
  getProductCount,
  onAddProduct,
  onOpenFormula,
  onGoToCheckout,
}: Props) {
  return (
    <>
      {isAddingItems && (
        <div className="bg-primary/10 border-primary/20 border-b px-4 py-2 text-sm">
          Ajout d&apos;articles pour <strong>{guestName}</strong>
        </div>
      )}
      {formulas.length > 0 && (
        <div className="px-4 py-5">
          <h2 className="mb-3 text-base font-semibold">Formules</h2>
          <div className="space-y-2">
            {formulas.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onOpenFormula(f)}
                className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-colors hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">{f.name}</span>
                  <span className="text-primary font-bold">{formatPrice(f.price)}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">{f.slots.map((s) => s.name).join(" · ")}</p>
              </button>
            ))}
          </div>
        </div>
      )}
      {sections.length === 0 && (
        <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">Menu non disponible</div>
      )}
      {sections.map((section) => (
        <SectionBlock
          key={section.id}
          section={section}
          depth={0}
          getProductCount={getProductCount}
          onAddProduct={onAddProduct}
        />
      ))}
      {cartLength > 0 && (
        <div className="fixed right-0 bottom-0 left-0 border-t bg-white p-4 shadow-lg">
          <Button className="w-full" onClick={onGoToCheckout}>
            Commander ({cartLength} article{cartLength > 1 ? "s" : ""}) — {formatPrice(totalPrice)}
          </Button>
        </div>
      )}
    </>
  );
}
