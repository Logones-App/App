"use client";

import { useState, useEffect } from "react";

import type { MobileUserPermissionFormData } from "@/lib/schemas/mobile-user-permissions-schema";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { Database } from "@/lib/supabase/database.types";

type MobileUserPermission = Database["public"]["Tables"]["mobile_user_permissions"]["Row"];

export function useMobileUserPermissionForm(initialData?: MobileUserPermission) {
  const { user } = useAuthStore();

  const [formData, setFormData] = useState<MobileUserPermissionFormData>({
    mobile_user_id: "",
    permission: "",
    granted_by: user?.id ?? "", // ✅ Remplir avec l'ID de l'utilisateur actuel
    organization_id: "",
    establishment_id: "",
  });

  // ✅ NOUVEAU PATTERN : useEffect avec dépendance sur initialData
  useEffect(() => {
    if (initialData) {
      setFormData({
        mobile_user_id: initialData.mobile_user_id ?? "",
        permission: initialData.permission ?? "",
        granted_by: initialData.granted_by ?? user?.id ?? "",
        organization_id: initialData.organization_id ?? "",
        establishment_id: initialData.establishment_id ?? "",
      });
    }
  }, [initialData, user?.id]);

  const handleInputChange = (field: keyof MobileUserPermissionFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return { formData, handleInputChange };
}
