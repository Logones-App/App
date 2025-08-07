"use client";

import React from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEstablishmentMobileUsers } from "@/lib/queries/mobile-users-queries";
import type { MobileUserPermissionFormData } from "@/lib/schemas/mobile-user-permissions-schema";

// Composant pour un champ de formulaire simple
function FormField({
  id,
  label,
  type = "text",
  value,
  onChange,
  required = false,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} />
    </div>
  );
}

// Composant pour les champs du formulaire
export function FormFields({
  formData,
  handleInputChange,
  isEdit,
  establishmentId,
  organizationId,
}: {
  formData: MobileUserPermissionFormData;
  handleInputChange: (field: keyof MobileUserPermissionFormData, value: string) => void;
  isEdit: boolean;
  establishmentId: string;
  organizationId?: string;
}) {
  // ✅ UTILISER LE CRUD EXISTANT
  const { data: mobileUsers = [], isLoading: isLoadingMobileUsers } = useEstablishmentMobileUsers(establishmentId);

  // ✅ Remplir automatiquement les champs requis
  React.useEffect(() => {
    if (!isEdit) {
      // Remplir automatiquement establishment_id
      if (formData.establishment_id !== establishmentId) {
        handleInputChange("establishment_id", establishmentId);
      }

      // Remplir automatiquement organization_id
      if (organizationId && formData.organization_id !== organizationId) {
        handleInputChange("organization_id", organizationId);
      }
    }
  }, [establishmentId, organizationId, isEdit, formData.establishment_id, formData.organization_id, handleInputChange]);

  return (
    <>
      {/* Select pour choisir l'utilisateur mobile */}
      <div className="space-y-2">
        <Label htmlFor="mobile_user_id">Utilisateur Mobile</Label>
        <Select
          value={formData.mobile_user_id}
          onValueChange={(value) => handleInputChange("mobile_user_id", value)}
          disabled={isLoadingMobileUsers}
        >
          <SelectTrigger>
            <SelectValue placeholder={isLoadingMobileUsers ? "Chargement..." : "Sélectionner un utilisateur mobile"} />
          </SelectTrigger>
          <SelectContent>
            {mobileUsers.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.firstname} {user.lastname} ({user.email})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {mobileUsers.length === 0 && !isLoadingMobileUsers && (
          <p className="text-muted-foreground text-sm">Aucun utilisateur mobile trouvé dans cet établissement</p>
        )}
      </div>

      {/* Select pour choisir la permission */}
      <div className="space-y-2">
        <Label htmlFor="permission">Permission</Label>
        <Select value={formData.permission} onValueChange={(value) => handleInputChange("permission", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner une permission" />
          </SelectTrigger>
          <SelectContent>
            {/* Permissions existantes */}
            <SelectItem value="bookings:read">Lecture des réservations</SelectItem>
            <SelectItem value="bookings:create">Création de réservations</SelectItem>
            <SelectItem value="bookings:update">Modification de réservations</SelectItem>
            <SelectItem value="bookings:cancel">Annulation de réservations</SelectItem>
            <SelectItem value="orders:read">Lecture des commandes</SelectItem>
            <SelectItem value="orders:create">Création de commandes</SelectItem>
            <SelectItem value="orders:update">Modification de commandes</SelectItem>
            <SelectItem value="orders:cancel">Annulation de commandes</SelectItem>
            <SelectItem value="menu:read">Lecture du menu</SelectItem>
            <SelectItem value="menu:update">Modification du menu</SelectItem>
            <SelectItem value="stock:read">Lecture du stock</SelectItem>
            <SelectItem value="stock:update">Modification du stock</SelectItem>
            <SelectItem value="users:read">Lecture des utilisateurs</SelectItem>
            <SelectItem value="users:manage">Gestion des utilisateurs</SelectItem>
            <SelectItem value="reports:read">Lecture des rapports</SelectItem>
            <SelectItem value="settings:read">Lecture des paramètres</SelectItem>
            <SelectItem value="settings:update">Modification des paramètres</SelectItem>

            {/* Nouvelles permissions - Exemples d'extensibilité */}
            <SelectItem value="analytics:export">Export des analytics</SelectItem>
            <SelectItem value="notifications:send">Envoi de notifications</SelectItem>
            <SelectItem value="payments:process">Traitement des paiements</SelectItem>
            <SelectItem value="inventory:manage">Gestion de l&apos;inventaire</SelectItem>
            <SelectItem value="reports:generate">Génération de rapports</SelectItem>
            <SelectItem value="customers:view">Visualisation des clients</SelectItem>
            <SelectItem value="delivery:track">Suivi des livraisons</SelectItem>
            <SelectItem value="kitchen:orders">Commandes cuisine</SelectItem>
            <SelectItem value="waiter:assign">Assignation des serveurs</SelectItem>
            <SelectItem value="table:reserve">Réservation de tables</SelectItem>
            <SelectItem value="loyalty:points">Points de fidélité</SelectItem>
            <SelectItem value="discount:apply">Application de réductions</SelectItem>
            <SelectItem value="tax:calculate">Calcul des taxes</SelectItem>
            <SelectItem value="tip:distribute">Distribution des pourboires</SelectItem>
            <SelectItem value="shift:schedule">Planification des équipes</SelectItem>
            <SelectItem value="maintenance:request">Demandes de maintenance</SelectItem>
            <SelectItem value="supplier:contact">Contact fournisseurs</SelectItem>
            <SelectItem value="quality:check">Contrôle qualité</SelectItem>
            <SelectItem value="temperature:monitor">Surveillance température</SelectItem>
            <SelectItem value="expenses:approve">Approbation des dépenses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Champs cachés pour les IDs (remplis automatiquement) */}
      {!isEdit && (
        <>
          <FormField
            id="organization_id"
            label="ID Organisation"
            value={organizationId ?? ""}
            onChange={(value) => handleInputChange("organization_id", value)}
            required
          />
          <FormField
            id="establishment_id"
            label="ID Établissement"
            value={establishmentId}
            onChange={(value) => handleInputChange("establishment_id", value)}
            required
          />
        </>
      )}
    </>
  );
}
