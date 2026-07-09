"use client";

import {
  allergenInfo,
  formatPrice,
  labelInfo,
  type PublicProduct,
  type PublicSection,
  sectionHasContent,
} from "./menu-utils";

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
        {product.note && <p className="mt-0.5 text-xs text-gray-500 italic dark:text-gray-400">{product.note}</p>}

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

// ─── Section (récursive : gère les sous-sections à n niveaux) ──────────────────

export function SectionNode({ section, depth = 0 }: { section: PublicSection; depth?: number }) {
  const hasItems = section.items.length > 0;
  // On masque une section dont tout le sous-arbre est vide (ex. items filtrés par RLS anon).
  if (!sectionHasContent(section)) return null;

  return (
    <section className={depth === 0 ? "mb-10" : "border-primary/25 dark:border-primary/40 mt-6 border-l-2 pl-4"}>
      {depth === 0 ? (
        <div className="mb-4">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            {section.name || "Autres"}
          </h2>
          <div className="bg-primary mt-1.5 h-1 w-10 rounded-full" />
        </div>
      ) : (
        <h3 className="text-primary mb-2 flex items-center gap-1.5 text-xs font-bold tracking-[0.14em] uppercase">
          <span className="bg-primary inline-block h-1 w-1 rounded-full" />
          {section.name}
        </h3>
      )}
      {section.description && <p className="text-muted-foreground mb-3 text-sm">{section.description}</p>}
      {hasItems && (
        <div>
          {section.items.map((p) => (
            <ProductCard key={p.menuProductId} product={p} />
          ))}
        </div>
      )}
      {section.subsections.map((sub) => (
        <SectionNode key={sub.id} section={sub} depth={depth + 1} />
      ))}
    </section>
  );
}
