import { productCatalogProprieteSchema } from "./product-catalog-propriete-schema";

export const productCreateSchema = productCatalogProprieteSchema;

export type ProductCreateParsed = typeof productCreateSchema._output;
