import { z } from "zod";

const fkSelect = z.union([z.literal("__none__"), z.string().uuid()]).transform((v) => (v === "__none__" ? null : v));

export const productCatalogProprieteSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  description: z.string().optional(),
  category_id: z.string().uuid("Catégorie invalide"),
  display_order: z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return null;
    const n = typeof val === "string" ? Number(val) : typeof val === "number" ? val : NaN;
    return Number.isFinite(n) ? n : null;
  }, z.number().int().min(0).nullable().optional()),
  is_available: z.boolean(),
  printer_id: fkSelect,
  vat_rate_id: fkSelect,
});

export type ProductCatalogProprieteParsed = z.output<typeof productCatalogProprieteSchema>;
