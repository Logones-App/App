// Queries de base pour les établissements
export { useOrganizationEstablishments, useEstablishment, useEstablishmentBySlug } from "../establishments-queries";

// Mutations pour les établissements
export { useCreateEstablishment, useUpdateEstablishment, useDeleteEstablishment } from "../establishments-mutations";

// Queries liées aux établissements
export {
  useEstablishmentOpeningHours,
  useEstablishmentBookingSlots,
  useEstablishmentPrinters,
  useEstablishmentVatRates,
  useOrganizationProducts,
  useEstablishmentStocks,
  useEstablishmentProductsWithStocks,
  useOrganizationCategories,
  useEstablishmentCategories,
} from "../establishments-related-queries";

export {
  useEstablishmentMenus,
  useFormulaProductsByFormula,
  useFormulaSlots,
  useMenuFormulas,
  useMenuProducts,
  useEstablishmentProductsNotInMenus,
  useEstablishmentMenusWithSchedules,
  useMenuCategoryGridItems,
  useMenuPaletteCatalog,
  type FormulaProductWithProduct,
  type MenuPaletteCategory,
} from "../establishments-menu-queries";
