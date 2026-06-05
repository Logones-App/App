"use client";

import { useState, useEffect } from "react";

import type { DeviceFormData } from "@/lib/schemas/device-schema";
import type { Database } from "@/lib/supabase/database.types";

type Device = Database["public"]["Tables"]["devices"]["Row"];

export function useDeviceForm(initialData?: Device) {
  const [deviceId, setDeviceId] = useState<string | undefined>(initialData?.id);

  const [formData, setFormData] = useState<DeviceFormData>({
    establishment_id: "",
    serial_number: "",
    device_role: "slave",
    display: "portrait",
    status: "active",
    manufacturer: "",
    model: "",
    port_attribue: undefined,
    mods: [],
  });

  useEffect(() => {
    if (initialData) {
      setDeviceId(initialData.id);
      setFormData({
        establishment_id: initialData.establishment_id ?? "",
        serial_number: initialData.serial_number,
        device_role: (initialData.device_role as DeviceFormData["device_role"]) ?? "slave",
        display: (initialData.display as DeviceFormData["display"]) ?? "portrait",
        status: initialData.status,
        manufacturer: initialData.manufacturer ?? "",
        model: initialData.model ?? "",
        port_attribue: initialData.port_attribue ?? undefined,
        mods: (initialData.mods as DeviceFormData["mods"]) ?? [],
      });
    }
  }, [initialData]);

  const handleInputChange = (field: keyof DeviceFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleModsChange = (mod: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      mods: checked
        ? [...(prev.mods ?? []), mod as DeviceFormData["mods"][number]]
        : (prev.mods ?? []).filter((m) => m !== mod),
    }));
  };

  return { formData, deviceId, handleInputChange, handleModsChange };
}
