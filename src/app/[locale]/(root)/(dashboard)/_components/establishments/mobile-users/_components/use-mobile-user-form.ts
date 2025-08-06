"use client";

import { useState } from "react";

import type { MobileUserFormData } from "@/lib/schemas/mobile-user-schema";
import type { Database } from "@/lib/supabase/database.types";

type MobileUser = Database["public"]["Tables"]["mobile_users"]["Row"];

export function useMobileUserForm(initialData?: MobileUser) {
  const [formData, setFormData] = useState<MobileUserFormData>({
    firstname: initialData?.firstname ?? "",
    lastname: initialData?.lastname ?? "",
    email: initialData?.email ?? "",
    phone: initialData?.phone ?? "",
    role: initialData?.role ?? "user",
    is_active: initialData?.is_active ?? true,
    password: "",
  });

  const handleInputChange = (field: keyof MobileUserFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return { formData, handleInputChange };
}
