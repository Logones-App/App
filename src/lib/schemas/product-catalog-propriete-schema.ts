import { z } from "zod";

const fkOptional = z.union([z.literal("__none__"), z.string().uuid()]).transform((v) => (v === "__none__" ? null : v));

export const productCatalogProprieteSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  description: z.string().optional(),
  category_id: fkOptional,
  is_available: z.boolean(),
  printer_id: fkOptional,
  vat_rate_id: z.string().uuid("La TVA est requise"),
});

export type ProductCatalogProprieteParsed = z.output<typeof productCatalogProprieteSchema>;
