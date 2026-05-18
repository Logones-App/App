"use client";

import { allergenInfo, formatPrice, labelInfo, type PublicProduct } from "./menu-utils";

// ─── Badge allergène ──────────────────────────────────────────────────────────

function AllergenTag({ allergenKey }: { allergenKey: string }) {
  const info = allergenInfo(allergenKey);
  if (!info) return null;
  return (
    <span
      title={info.label}
      className="inline-flex items-center gap-0.5 rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-xs text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
    >
      {info.emoji}
      <span className="hidden sm:inline">{info.label}</span>
    </span>
  );
}

// ─── Badge label ──────────────────────────────────────────────────────────────

function LabelTag({ labelKey }: { labelKey: string }) {
  const info = labelInfo(labelKey);
  if (!info) return null;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-medium ${info.color}`}>
      {info.emoji}
      <span>{info.label}</span>
    </span>
  );
}

// ─── Carte produit ────────────────────────────────────────────────────────────

export function ProductCard({ product }: { product: PublicProduct }) {
  const hasAllergens = product.allergens.length > 0;
  const hasLabels = product.labels.length > 0;
  const portion =
    product.portionWeight != null && product.portionUnit ? `${product.portionWeight} ${product.portionUnit}` : null;

  return (
    <div className="flex items-start justify-between gap-4 border-b py-4 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{product.name}</h3>
          {portion && <span className="text-muted-foreground text-xs">{portion}</span>}
        </div>

        {product.description && <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{product.description}</p>}

        {(hasAllergens || hasLabels) && (
          <div className="mt-2 flex flex-wrap gap-1">
            {product.labels.map((k) => (
              <LabelTag key={k} labelKey={k} />
            ))}
            {product.allergens.map((k) => (
              <AllergenTag key={k} allergenKey={k} />
            ))}
          </div>
        )}
      </div>

      {product.price != null && (
        <p className="shrink-0 text-right font-semibold text-gray-900 tabular-nums dark:text-gray-100">
          {formatPrice(product.price)}
        </p>
      )}
    </div>
  );
}

// ─── Section catégorie ────────────────────────────────────────────────────────

export function CategorySection({ name, products }: { name: string | null; products: PublicProduct[] }) {
  if (!products.length) return null;
  return (
    <section className="mb-8">
      <h2 className="mb-1 text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{name ?? "Autres"}</h2>
      <div className="bg-primary mb-4 h-0.5 w-12 rounded" />
      <div>
        {products.map((p) => (
          <ProductCard key={p.menuProductId} product={p} />
        ))}
      </div>
    </section>
  );
}
