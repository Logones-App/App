"use client";

import { useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCreateDevice, useUpdateDevice, useDeleteDevice } from "@/lib/queries/devices-mutations";
import { useEstablishmentDevices } from "@/lib/queries/devices-queries";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { Database } from "@/lib/supabase/database.types";

import { useDeviceHandlers } from "./_components/use-device-handlers";
import { DeviceModal } from "./device-modal";
import { DevicesList } from "./devices-list";
import { PageHeader } from "./page-header";
import { StatsCards } from "./stats-cards";

type Device = Database["public"]["Tables"]["devices"]["Row"];

interface DevicesSharedProps {
  establishmentId: string;
  organizationId?: string;
  isAdmin: boolean;
}

export function DevicesShared({ establishmentId, organizationId, isAdmin }: DevicesSharedProps) {
  const { user } = useAuthStore();
  const { data: devices = [], isLoading, error } = useEstablishmentDevices(establishmentId);
  const createDeviceMutation = useCreateDevice();
  const updateDeviceMutation = useUpdateDevice();
  const deleteDeviceMutation = useDeleteDevice();

  // États pour les modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);

  // Handlers extraits dans un hook personnalisé
  const { handleCreateDevice, handleUpdateDevice, handleDeleteDevice, openEditModal } = useDeviceHandlers({
    establishmentId,
    createDeviceMutation,
    updateDeviceMutation,
    deleteDeviceMutation,
    setIsCreateModalOpen,
    setIsEditModalOpen,
    setEditingDevice,
  });

  // Vérification des permissions
  if (!user) {
    return <div>Non autorisé</div>;
  }

  // Calcul des statistiques
  const totalDevices = devices.length;
  const activeDevices = devices.filter((device) => device.status === "active").length;
  const inactiveDevices = devices.filter((device) => device.status === "inactive").length;
  const maintenanceDevices = devices.filter((device) => device.status === "maintenance").length;

  const getPageTitle = () => {
    return isAdmin ? `Admin - Devices (Établissement: ${establishmentId})` : `Devices - ${establishmentId}`;
  };

  const getPageDescription = () => {
    return isAdmin
      ? `Gestion des devices de l&apos;établissement ${establishmentId}`
      : `Gestion des devices de votre établissement`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        pageTitle={getPageTitle()}
        pageDescription={getPageDescription()}
        onCreateClick={() => setIsCreateModalOpen(true)}
        isCreateLoading={createDeviceMutation.isPending}
      />

      {/* Stats Cards */}
      <StatsCards
        totalDevices={totalDevices}
        activeDevices={activeDevices}
        inactiveDevices={inactiveDevices}
        maintenanceDevices={maintenanceDevices}
      />

      {/* Devices List */}
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

      {/* Debug Info */}
      {isAdmin && organizationId && (
        <Card>
          <CardHeader>
            <CardTitle>Informations de Debug</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>
                <strong>Type d&apos;accès:</strong> Admin
              </p>
              <p>
                <strong>Établissement ID:</strong> {establishmentId}
              </p>
              <p>
                <strong>Organisation ID:</strong> {organizationId}
              </p>
              <p>
                <strong>Utilisateur actuel:</strong> {user.email}
              </p>
              <p>
                <strong>Rôle utilisateur:</strong> {user.user_metadata.role ?? "Non défini"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <DeviceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={(data) => handleCreateDevice(data as Parameters<typeof handleCreateDevice>[0])}
        isEdit={false}
        isLoading={createDeviceMutation.isPending}
        establishmentId={establishmentId}
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
      />
    </div>
  );
}
