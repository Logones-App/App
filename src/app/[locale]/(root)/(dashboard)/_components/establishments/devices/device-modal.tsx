"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Database } from "@/lib/supabase/database.types";

import { useDeviceForm } from "./_components/use-device-form";
import { DeviceForm } from "./device-form";

type Device = Database["public"]["Tables"]["devices"]["Row"];

interface DeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
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
  const { formData, handleInputChange } = useDeviceForm(initialData);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const getModalTitle = () => {
    return isEdit ? "Modifier le Device" : "Ajouter un Device";
  };

  const getModalDescription = () => {
    return isEdit ? "Modifiez les informations du device" : "Ajoutez un nouveau device à votre établissement";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{getModalTitle()}</DialogTitle>
        </DialogHeader>
        <DeviceForm
          formData={formData}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          errors={{}}
          isEdit={isEdit}
          isLoading={isLoading}
          establishmentId={establishmentId}
        />
      </DialogContent>
    </Dialog>
  );
}
