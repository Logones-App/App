"use client";

import { useMemo, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCreateDevice, useUpdateDevice, useDeleteDevice } from "@/lib/queries/devices-mutations";
import { useEstablishmentDevices } from "@/lib/queries/devices-queries";
import { useEstablishmentModules } from "@/lib/queries/establishment-modules-queries";
import { DEVICE_MODS } from "@/lib/schemas/device-schema";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { Database } from "@/lib/supabase/database.types";

import { useDeviceHandlers } from "./_components/use-device-handlers";
import { type ModuleSeatInfo } from "./device-form";
import { DeviceModal } from "./device-modal";
import { DevicesList } from "./devices-list";
import { PageHeader } from "./page-header";
import { StatsCards } from "./stats-cards";
import { TabletAccessCard } from "./tablet-access-card";

type Device = Database["public"]["Tables"]["devices"]["Row"];

interface DevicesSharedProps {
  establishmentId: string;
  organizationId?: string;
  isAdmin: boolean;
}

export function DevicesShared({ establishmentId, organizationId, isAdmin }: DevicesSharedProps) {
  const { user } = useAuthStore();
  const { data: devices = [], isLoading, error } = useEstablishmentDevices(establishmentId);
  const { data: estModules = [] } = useEstablishmentModules(establishmentId, organizationId ?? "");
  const createDeviceMutation = useCreateDevice();
  const updateDeviceMutation = useUpdateDevice();
  const deleteDeviceMutation = useDeleteDevice();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);

  const { handleCreateDevice, handleUpdateDevice, handleDeleteDevice, openEditModal } = useDeviceHandlers({
    establishmentId,
    createDeviceMutation,
    updateDeviceMutation,
    deleteDeviceMutation,
    setIsCreateModalOpen,
    setIsEditModalOpen,
    setEditingDevice,
  });

  const createModuleSeatInfo = useMemo<ModuleSeatInfo[]>(
    () =>
      DEVICE_MODS.map((mod) => {
        const mc = estModules.find((m) => m.module === mod);
        return {
          module: mod,
          seats: mc?.seats ?? 0,
          used: devices.filter((d) => !d.deleted && d.mods.includes(mod)).length,
          enabled: mc?.enabled ?? false,
        };
      }),
    [devices, estModules],
  );

  const editModuleSeatInfo = useMemo<ModuleSeatInfo[]>(
    () =>
      DEVICE_MODS.map((mod) => {
        const mc = estModules.find((m) => m.module === mod);
        const used = devices.filter((d) => !d.deleted && d.id !== editingDevice?.id && d.mods.includes(mod)).length;
        return { module: mod, seats: mc?.seats ?? 0, used, enabled: mc?.enabled ?? false };
      }),
    [devices, estModules, editingDevice],
  );

  if (!user) return <div>Non autorisé</div>;

  const totalDevices = devices.length;
  const activeDevices = devices.filter((d) => d.status === "active").length;
  const inactiveDevices = devices.filter((d) => d.status === "inactive").length;
  const maintenanceDevices = devices.filter((d) => d.status === "maintenance").length;

  return (
    <div className="space-y-6">
      <PageHeader
        pageTitle={isAdmin ? `Admin - Devices (${establishmentId})` : "Devices"}
        pageDescription={isAdmin ? `Établissement ${establishmentId}` : "Gérez les devices de votre établissement"}
        onCreateClick={() => setIsCreateModalOpen(true)}
        isCreateLoading={createDeviceMutation.isPending}
      />

      <TabletAccessCard establishmentId={establishmentId} />

      <StatsCards
        totalDevices={totalDevices}
        activeDevices={activeDevices}
        inactiveDevices={inactiveDevices}
        maintenanceDevices={maintenanceDevices}
      />

      <Card>
        <CardHeader>
          <CardTitle>Liste des Devices</CardTitle>
          <CardDescription>Gérez les devices de votre établissement</CardDescription>
        </CardHeader>
        <CardContent>
          <DevicesList
            devices={devices}
            isLoading={isLoading}
            error={error}
            onCreateClick={() => setIsCreateModalOpen(true)}
            onEditClick={openEditModal}
            onDeleteClick={handleDeleteDevice}
            isCreateLoading={createDeviceMutation.isPending}
            isUpdateLoading={updateDeviceMutation.isPending}
            isDeleteLoading={deleteDeviceMutation.isPending}
          />
        </CardContent>
      </Card>

      {isAdmin && organizationId && (
        <Card>
          <CardHeader>
            <CardTitle>Debug</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <strong>Établissement :</strong> {establishmentId}
            </p>
            <p>
              <strong>Organisation :</strong> {organizationId}
            </p>
            <p>
              <strong>Utilisateur :</strong> {user.email}
            </p>
            <p>
              <strong>Rôle :</strong> {user.user_metadata.role ?? "Non défini"}
            </p>
          </CardContent>
        </Card>
      )}

      <DeviceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={(data) => handleCreateDevice(data as Parameters<typeof handleCreateDevice>[0])}
        isEdit={false}
        isLoading={createDeviceMutation.isPending}
        establishmentId={establishmentId}
        moduleSeatInfo={createModuleSeatInfo}
      />

      <DeviceModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingDevice(null);
        }}
        onSubmit={(data) => handleUpdateDevice(data as Parameters<typeof handleUpdateDevice>[0])}
        initialData={editingDevice ?? undefined}
        isEdit={true}
        isLoading={updateDeviceMutation.isPending}
        establishmentId={establishmentId}
        moduleSeatInfo={editModuleSeatInfo}
      />
    </div>
  );
}
