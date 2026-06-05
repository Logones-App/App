"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { DeviceFormData, DeviceUpdateFormData } from "@/lib/schemas/device-schema";
import type { Database } from "@/lib/supabase/database.types";

import { useDeviceForm } from "./_components/use-device-form";
import { DeviceForm } from "./device-form";

type Device = Database["public"]["Tables"]["devices"]["Row"];

interface DeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DeviceFormData | DeviceUpdateFormData) => void;
  initialData?: Device;
  isEdit: boolean;
  isLoading: boolean;
  establishmentId: string;
}

export function DeviceModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isEdit,
  isLoading,
  establishmentId,
}: DeviceModalProps) {
  const { formData, deviceId, handleInputChange, handleModsChange } = useDeviceForm(initialData);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit && deviceId) {
      onSubmit({ ...formData, id: deviceId });
    } else {
      onSubmit(formData);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier le device" : "Ajouter un device"}</DialogTitle>
        </DialogHeader>
        <DeviceForm
          formData={formData}
          handleInputChange={handleInputChange}
          handleModsChange={handleModsChange}
          handleSubmit={handleSubmit}
          onCancel={onClose}
          errors={{}}
          isEdit={isEdit}
          isLoading={isLoading}
          establishmentId={establishmentId}
        />
      </DialogContent>
    </Dialog>
  );
}
