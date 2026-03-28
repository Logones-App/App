// Queries de base pour les établissements
export { useOrganizationEstablishments, useEstablishment, useEstablishmentBySlug } from "../establishments-queries";

// Mutations pour les établissements
export { useCreateEstablishment, useUpdateEstablishment, useDeleteEstablishment } from "../establishments-mutations";

// Queries liées aux établissements
export {
  useEstablishmentOpeningHours,
  useEstablishmentBookingSlots,
  useOrganizationProducts,
  useEstablishmentStocks,
  useEstablishmentProductsWithStocks,
  useOrganizationCategories,
} from "../establishments-related-queries";

export {
  useEstablishmentMenus,
  useMenuProducts,
  useEstablishmentProductsNotInMenus,
  useEstablishmentMenusWithSchedules,
  useMenuCategoryGridItems,
  useMenuPaletteCatalog,
  type MenuPaletteCategory,
} from "../establishments-menu-queries";
