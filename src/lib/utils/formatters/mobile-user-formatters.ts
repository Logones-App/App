import type { MobileUserFormData } from "@/lib/schemas/mobile-user-schema";
import type { Database } from "@/lib/supabase/database.types";

type MobileUser = Database["public"]["Tables"]["mobile_users"]["Row"];

// Fonction utilitaire pour obtenir une valeur avec fallback
function getValue<T>(value: T | null | undefined, defaultValue: T): T {
  return value ?? defaultValue;
}

export const mobileUserFormatters = {
  formatForCreate: (data: MobileUserFormData, organizationId: string) => ({
    ...data,
    organization_id: organizationId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }),

  formatForUpdate: (data: MobileUserFormData, userId: string) => ({
    ...data,
    id: userId,
    updated_at: new Date().toISOString(),
  }),

  getInitialData: (initialData?: MobileUser): MobileUserFormData => ({
    firstname: getValue(initialData?.firstname, ""),
    lastname: getValue(initialData?.lastname, ""),
    email: getValue(initialData?.email, ""),
    phone: getValue(initialData?.phone, ""),
    role: getValue(initialData?.role, "user"),
    is_active: getValue(initialData?.is_active, true),
    password: "",
  }),
};
