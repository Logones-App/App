import { z } from "zod";

import { productCatalogProprieteSchema } from "./product-catalog-propriete-schema";

export const productCreateSchema = productCatalogProprieteSchema.extend({
  price: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return 0;
      const n = typeof val === "string" ? Number(val.replace(",", ".")) : typeof val === "number" ? val : NaN;
      return Number.isFinite(n) ? n : NaN;
    },
    z.number().min(0, "Le prix doit être positif ou nul"),
  ),
});

export type ProductCreateParsed = z.output<typeof productCreateSchema>;
