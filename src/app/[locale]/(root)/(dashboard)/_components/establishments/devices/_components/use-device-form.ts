"use client";

import { useState, useEffect } from "react";

import type { DeviceFormData } from "@/lib/schemas/device-schema";
import type { Database } from "@/lib/supabase/database.types";

type Device = Database["public"]["Tables"]["devices"]["Row"];

export function useDeviceForm(initialData?: Device) {
  const [formData, setFormData] = useState<DeviceFormData>({
    establishment_id: "",
    serial_number: "",
    device_role: "tablet",
    status: "active",
    manufacturer: "",
    model: "",
    port_attribue: undefined,
  });

  // ✅ NOUVEAU PATTERN : useEffect avec dépendance sur initialData
  useEffect(() => {
    if (initialData) {
      setFormData({
        establishment_id: initialData.establishment_id,
        serial_number: initialData.serial_number,
        device_role: initialData.device_role,
        status: initialData.status,
        manufacturer: initialData.manufacturer ?? "",
        model: initialData.model ?? "",
        port_attribue: initialData.port_attribue ?? undefined,
      });
    }
  }, [initialData]);

  const handleInputChange = (field: keyof DeviceFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return { formData, handleInputChange };
}
