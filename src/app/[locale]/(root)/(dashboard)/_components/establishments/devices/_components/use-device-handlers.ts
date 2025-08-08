"use client";

import type { UseMutationResult } from "@tanstack/react-query";
import { toast } from "sonner";

import type { DeviceFormData, DeviceUpdateFormData } from "@/lib/schemas/device-schema";
import type { Database } from "@/lib/supabase/database.types";

type Device = Database["public"]["Tables"]["devices"]["Row"];
type CreateDevicePayload = Database["public"]["Tables"]["devices"]["Insert"];
type UpdateDevicePayload = Database["public"]["Tables"]["devices"]["Update"];

interface UseDeviceHandlersProps {
  user: { id: string; email?: string } | null;
  establishmentId: string;
  createDeviceMutation: UseMutationResult<Device, Error, CreateDevicePayload>;
  updateDeviceMutation: UseMutationResult<Device, Error, { id: string; updates: UpdateDevicePayload }>;
  deleteDeviceMutation: UseMutationResult<void, Error, string>;
  setIsCreateModalOpen: (open: boolean) => void;
  setIsEditModalOpen: (open: boolean) => void;
  setEditingDevice: (device: Device | null) => void;
}

export function useDeviceHandlers({
  user,
  establishmentId,
  createDeviceMutation,
  updateDeviceMutation,
  deleteDeviceMutation,
  setIsCreateModalOpen,
  setIsEditModalOpen,
  setEditingDevice,
}: UseDeviceHandlersProps) {
  const handleCreateDevice = (formData: DeviceFormData) => {
    const deviceData = {
      name: formData.name,
      device_id: formData.device_id,
      establishment_id: establishmentId,
      device_type: formData.device_type,
      status: formData.status,
      last_seen: formData.last_seen ?? null,
    };

    createDeviceMutation.mutate(deviceData, {
      onSuccess: () => {
        setIsCreateModalOpen(false);
        toast.success("Device créé avec succès");
      },
      onError: (error) => {
        toast.error(`Erreur lors de la création: ${error.message}`);
      },
    });
  };

  const handleUpdateDevice = (formData: DeviceUpdateFormData) => {
    if (!formData.id) return;

    const updateData = {
      name: formData.name,
      device_id: formData.device_id,
      device_type: formData.device_type,
      status: formData.status,
      last_seen: formData.last_seen ?? null,
    };

    updateDeviceMutation.mutate(
      {
        id: formData.id,
        updates: updateData,
      },
      {
        onSuccess: () => {
          setIsEditModalOpen(false);
          setEditingDevice(null);
          toast.success("Device mis à jour avec succès");
        },
        onError: (error) => {
          toast.error(`Erreur lors de la mise à jour: ${error.message}`);
        },
      },
    );
  };

  const handleDeleteDevice = (deviceId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce device ?")) return;

    deleteDeviceMutation.mutate(deviceId, {
      onSuccess: () => {
        toast.success("Device supprimé avec succès");
      },
      onError: (error) => {
        toast.error("Erreur lors de la suppression du device");
        console.error(error);
      },
    });
  };

  const openEditModal = (device: Device) => {
    setEditingDevice(device);
    setIsEditModalOpen(true);
  };

  return {
    handleCreateDevice,
    handleUpdateDevice,
    handleDeleteDevice,
    openEditModal,
  };
}
