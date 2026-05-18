import { z } from "zod";

import { productCatalogProprieteSchema } from "./product-catalog-propriete-schema";

// TVA obligatoire à la création — on rejette __none__ et on exige un UUID valide
export const productCreateSchema = productCatalogProprieteSchema.extend({
  vat_rate_id: z.string().uuid("La TVA est requise"),
});

export type ProductCreateParsed = z.output<typeof productCreateSchema>;
