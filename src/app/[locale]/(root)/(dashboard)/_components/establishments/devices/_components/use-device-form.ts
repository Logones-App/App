"use client";

import { useState, useEffect } from "react";

import type { DeviceFormData } from "@/lib/schemas/device-schema";
import type { Database } from "@/lib/supabase/database.types";

type Device = Database["public"]["Tables"]["devices"]["Row"];

export function useDeviceForm(initialData?: Device) {
  const [formData, setFormData] = useState<DeviceFormData>({
    name: "",
    device_id: "",
    establishment_id: "",
    device_type: "tablet",
    status: "active",
    last_seen: "",
  });

  // ✅ NOUVEAU PATTERN : useEffect avec dépendance sur initialData
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name ?? "",
        device_id: initialData.device_id ?? "",
        establishment_id: initialData.establishment_id ?? "",
        device_type: initialData.device_type ?? "tablet",
        status: initialData.status ?? "active",
        last_seen: initialData.last_seen ?? "",
      });
    }
  }, [initialData]);

  const handleInputChange = (field: keyof DeviceFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return { formData, handleInputChange };
}
