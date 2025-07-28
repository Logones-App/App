import type { Tables, TablesInsert, TablesUpdate } from "@/lib/supabase/database.types";

// ============================================================================
// TYPES POUR LES JOINTURES
// ============================================================================

/**
 * Produit avec son stock associé
 */
export type ProductWithStock = Tables<"products"> & {
  stock: Tables<"product_stocks"> | null;
};

/**
 * Organisation avec ses utilisateurs
 */
export type OrganizationWithUsers = Tables<"organizations"> & {
  users: Tables<"users">[];
};

/**
 * Établissement avec son organisation
 */
export type EstablishmentWithOrganization = Tables<"establishments"> & {
  organization: Tables<"organizations">;
};

/**
 * Réservation avec son établissement
 */
export type BookingWithEstablishment = Tables<"bookings"> & {
  establishment: Tables<"establishments">;
};

/**
 * Menu avec ses produits
 */
export type MenuWithProducts = Tables<"menus"> & {
  products: Tables<"products">[];
};

// ============================================================================
// TYPES POUR LES RÉPONSES SUPABASE
// ============================================================================

/**
 * Réponse standard de Supabase
 */
export type SupabaseResponse<T> = {
  data: T | null;
  error: Record<string, unknown> | null;
  count?: number;
};

/**
 * Réponse de jointure pour les produits avec stock
 */
export type ProductStockJoin = Tables<"product_stocks"> & {
  product: Tables<"products">;
};

/**
 * Réponse de jointure pour les utilisateurs avec organisations
 */
export type UserOrganizationJoin = {
  organizations: Tables<"organizations">;
  users_organizations: Tables<"users_organizations">;
};

// ============================================================================
// TYPES POUR LES MUTATIONS
// ============================================================================

/**
 * Payloads pour les produits
 */
export type CreateProductPayload = TablesInsert<"products">;
export type UpdateProductPayload = TablesUpdate<"products">;

/**
 * Payloads pour les stocks de produits
 */
export type CreateProductStockPayload = TablesInsert<"product_stocks">;
export type UpdateProductStockPayload = TablesUpdate<"product_stocks">;

/**
 * Payloads pour les organisations
 */
export type CreateOrganizationPayload = TablesInsert<"organizations">;
export type UpdateOrganizationPayload = TablesUpdate<"organizations">;

/**
 * Payloads pour les établissements
 */
export type CreateEstablishmentPayload = TablesInsert<"establishments">;
export type UpdateEstablishmentPayload = TablesUpdate<"establishments">;

/**
 * Payloads pour les réservations
 */
export type CreateBookingPayload = TablesInsert<"bookings">;
export type UpdateBookingPayload = TablesUpdate<"bookings">;

/**
 * Payloads pour les menus
 */
export type CreateMenuPayload = TablesInsert<"menus">;
export type UpdateMenuPayload = TablesUpdate<"menus">;

// ============================================================================
// TYPES POUR LES ÉVÉNEMENTS REALTIME
// ============================================================================

/**
 * Événement realtime de base
 */
export type RealtimeEvent<T = Record<string, unknown>> = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: T;
  oldRecord?: T;
  timestamp: string;
};

/**
 * Événement de changement de table
 */
export type TableChangeEvent<T = Record<string, unknown>> = {
  table: string;
  event: "INSERT" | "UPDATE" | "DELETE";
  record: T;
  oldRecord?: T;
};

/**
 * Message realtime
 */
export type RealtimeMessage<T = Record<string, unknown>> = {
  type: "notification" | "user_action" | "table_change";
  payload: T;
  timestamp: string;
  userId?: string;
  organizationId?: string;
};

/**
 * Événements spécifiques aux produits
 */
export type ProductsRealtimeEvent = RealtimeEvent<Tables<"products"> | Tables<"product_stocks">>;

/**
 * Événements spécifiques aux organisations
 */
export type OrganizationsRealtimeEvent = RealtimeEvent<Tables<"organizations">>;

// ============================================================================
// TYPES POUR LES FORMULAIRES
// ============================================================================

/**
 * État d'un formulaire
 */
export type FormState<T> = {
  data: T;
  errors: Record<keyof T, string>;
  isDirty: boolean;
  isValid: boolean;
  isSubmitting: boolean;
};

/**
 * Erreur de validation
 */
export type ValidationError = {
  field: string;
  message: string;
  code: string;
};

/**
 * Résultat de validation
 */
export type ValidationResult<T> = {
  isValid: boolean;
  data?: T;
  errors?: ValidationError[];
};

// ============================================================================
// TYPES POUR LES QUERIES
// ============================================================================

/**
 * Options pour les queries avec multi-tenant
 */
export type MultiTenantQueryOptions = {
  enabled?: boolean;
  staleTime?: number;
  refetchInterval?: number;
};

/**
 * Paramètres pour les queries filtrées
 */
export type QueryFilters = {
  organizationId?: string;
  establishmentId?: string;
  userId?: string;
  deleted?: boolean;
  isActive?: boolean;
};

// ============================================================================
// TYPES POUR LES COMPOSANTS UI
// ============================================================================

/**
 * Colonne de table avec métadonnées
 */
export type TableColumn<T> = {
  key: keyof T;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  align?: "left" | "center" | "right";
};

/**
 * Action de table
 */
export type TableAction<T> = {
  label: string;
  icon?: React.ComponentType;
  onClick: (item: T) => void;
  variant?: "default" | "destructive" | "outline";
  disabled?: (item: T) => boolean;
};

/**
 * Options de pagination
 */
export type PaginationOptions = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

// ============================================================================
// TYPES POUR LES STATUTS ET ÉTATS
// ============================================================================

/**
 * Statut de stock
 */
export type StockStatus = "no-stock" | "not-managed" | "out-of-stock" | "critical" | "low" | "min" | "ok" | "error";

/**
 * Statut de réservation
 */
export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed" | "no-show";

/**
 * Statut de disponibilité
 */
export type AvailabilityStatus = "available" | "unavailable" | "limited" | "out-of-stock";

// ============================================================================
// TYPES POUR LES CONFIGURATIONS
// ============================================================================

/**
 * Configuration d'organisation
 */
export type OrganizationSettings = {
  timezone?: string;
  currency?: string;
  language?: string;
  notifications?: {
    email?: boolean;
    push?: boolean;
    sms?: boolean;
  };
  features?: {
    realtime?: boolean;
    analytics?: boolean;
    multiTenant?: boolean;
  };
};

/**
 * Configuration d'établissement
 */
export type EstablishmentSettings = {
  bookingEnabled?: boolean;
  maxCapacity?: number;
  openingHours?: {
    [key: string]: {
      open: string;
      close: string;
      isActive: boolean;
    };
  };
  services?: string[];
};
