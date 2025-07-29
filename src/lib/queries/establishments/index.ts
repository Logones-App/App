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
  useEstablishmentMenus,
  useMenuProducts,
  useEstablishmentProductsNotInMenus,
  useEstablishmentMenusWithSchedules,
} from "../establishments-related-queries";
