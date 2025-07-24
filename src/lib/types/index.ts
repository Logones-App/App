// ============================================================================
// EXPORT DE TOUS LES TYPES
// ============================================================================

// Types de base Supabase
export type { Tables, TablesInsert, TablesUpdate } from "@/lib/supabase/database.types";

// Types utilitaires et extensions
export * from "./database-extensions";

// ============================================================================
// TYPES GLOBAUX DE L'APPLICATION
// ============================================================================

/**
 * Type pour les IDs d'entités
 */
export type EntityId = string;

/**
 * Type pour les timestamps
 */
export type Timestamp = string;

/**
 * Type pour les métadonnées utilisateur
 */
export type UserMetadata = {
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  organization_id?: string;
  role?: string;
};

/**
 * Type pour les métadonnées d'application
 */
export type AppMetadata = {
  provider?: string;
  providers?: string[];
  role?: string;
  organization_id?: string;
};

/**
 * Type pour les erreurs d'API
 */
export type ApiError = {
  message: string;
  code?: string;
  details?: any;
  hint?: string;
};

/**
 * Type pour les réponses d'API
 */
export type ApiResponse<T = any> = {
  data?: T;
  error?: ApiError;
  success: boolean;
};

/**
 * Type pour les options de requête
 */
export type QueryOptions = {
  enabled?: boolean;
  staleTime?: number;
  refetchInterval?: number;
  refetchOnWindowFocus?: boolean;
  retry?: number | boolean;
};

/**
 * Type pour les options de mutation
 */
export type MutationOptions<TData = any, TError = any, TVariables = any> = {
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: TError, variables: TVariables) => void;
  onSettled?: (data: TData | undefined, error: TError | null, variables: TVariables) => void;
};

// ============================================================================
// TYPES POUR LES COMPOSANTS REACT
// ============================================================================

/**
 * Type pour les props de base d'un composant
 */
export type BaseComponentProps = {
  className?: string;
  children?: React.ReactNode;
};

/**
 * Type pour les props d'un composant avec ID
 */
export type ComponentWithIdProps = BaseComponentProps & {
  id: string;
};

/**
 * Type pour les props d'un composant avec loading
 */
export type ComponentWithLoadingProps = BaseComponentProps & {
  loading?: boolean;
  error?: string | null;
};

/**
 * Type pour les props d'un composant avec données
 */
export type ComponentWithDataProps<T> = ComponentWithLoadingProps & {
  data?: T;
};

// ============================================================================
// TYPES POUR LES ÉVÉNEMENTS
// ============================================================================

/**
 * Type pour les gestionnaires d'événements
 */
export type EventHandler<T = any> = (event: T) => void;

/**
 * Type pour les gestionnaires d'événements avec paramètres
 */
export type EventHandlerWithParams<T = any, P = any> = (event: T, params: P) => void;

/**
 * Type pour les gestionnaires d'événements asynchrones
 */
export type AsyncEventHandler<T = any> = (event: T) => Promise<void>;

// ============================================================================
// TYPES POUR LES UTILITAIRES
// ============================================================================

/**
 * Type pour les fonctions de transformation
 */
export type TransformFunction<TInput, TOutput> = (input: TInput) => TOutput;

/**
 * Type pour les fonctions de validation
 */
export type ValidationFunction<T> = (value: T) => boolean | string;

/**
 * Type pour les fonctions de comparaison
 */
export type ComparisonFunction<T> = (a: T, b: T) => number;

/**
 * Type pour les fonctions de filtrage
 */
export type FilterFunction<T> = (item: T) => boolean;

// ============================================================================
// TYPES POUR LES CONFIGURATIONS
// ============================================================================

/**
 * Type pour les configurations d'environnement
 */
export type EnvironmentConfig = {
  NODE_ENV: "development" | "production" | "test";
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
};

/**
 * Type pour les configurations d'application
 */
export type AppConfig = {
  name: string;
  version: string;
  description: string;
  author: string;
  features: {
    realtime: boolean;
    analytics: boolean;
    multiTenant: boolean;
    notifications: boolean;
  };
  limits: {
    maxOrganizations: number;
    maxEstablishments: number;
    maxUsers: number;
    maxProducts: number;
  };
};

// ============================================================================
// TYPES POUR LES TESTS
// ============================================================================

/**
 * Type pour les mocks de données
 */
export type MockData<T> = {
  valid: T[];
  invalid: Partial<T>[];
  edgeCases: T[];
};

/**
 * Type pour les tests de composants
 */
export type ComponentTestProps<T> = {
  defaultProps: T;
  variants: Partial<T>[];
  edgeCases: Partial<T>[];
};

// ============================================================================
// TYPES POUR LES PERFORMANCES
// ============================================================================

/**
 * Type pour les métriques de performance
 */
export type PerformanceMetrics = {
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  networkRequests: number;
};

/**
 * Type pour les métriques d'erreur
 */
export type ErrorMetrics = {
  count: number;
  type: string;
  message: string;
  stack?: string;
  timestamp: string;
  userId?: string;
  organizationId?: string;
};
