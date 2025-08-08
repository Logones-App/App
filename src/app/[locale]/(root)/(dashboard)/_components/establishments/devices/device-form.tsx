"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { DeviceFormData } from "@/lib/schemas/device-schema";

interface DeviceFormProps {
  formData: DeviceFormData;
  handleInputChange: (field: keyof DeviceFormData, value: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  errors: Record<string, string>;
  isEdit: boolean;
  isLoading: boolean;
  establishmentId: string;
}

export function DeviceForm({
  formData,
  handleInputChange,
  handleSubmit,
  errors,
  isEdit,
  isLoading,
  establishmentId,
}: DeviceFormProps) {
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Nom du Device */}
      <div className="space-y-2">
        <Label htmlFor="name">Nom du Device</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleInputChange("name", e.target.value)}
          placeholder="Ex: Tablette Cuisine"
          className={errors.name ? "border-destructive" : ""}
        />
        {errors.name && <p className="text-destructive text-sm">{errors.name}</p>}
      </div>

      {/* ID du Device */}
      <div className="space-y-2">
        <Label htmlFor="device_id">ID du Device</Label>
        <Input
          id="device_id"
          value={formData.device_id}
          onChange={(e) => handleInputChange("device_id", e.target.value)}
          placeholder="Ex: TABLET_001"
          className={errors.device_id ? "border-destructive" : ""}
        />
        {errors.device_id && <p className="text-destructive text-sm">{errors.device_id}</p>}
      </div>

      {/* Type de Device */}
      <div className="space-y-2">
        <Label htmlFor="device_type">Type de Device</Label>
        <Select value={formData.device_type} onValueChange={(value) => handleInputChange("device_type", value)}>
          <SelectTrigger className={errors.device_type ? "border-destructive" : ""}>
            <SelectValue placeholder="Sélectionnez un type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tablet">Tablette</SelectItem>
            <SelectItem value="phone">Smartphone</SelectItem>
            <SelectItem value="pos">Terminal de paiement</SelectItem>
            <SelectItem value="kiosk">Borne interactive</SelectItem>
          </SelectContent>
        </Select>
        {errors.device_type && <p className="text-destructive text-sm">{errors.device_type}</p>}
      </div>

      {/* Statut */}
      <div className="space-y-2">
        <Label htmlFor="status">Statut</Label>
        <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
          <SelectTrigger className={errors.status ? "border-destructive" : ""}>
            <SelectValue placeholder="Sélectionnez un statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Actif</SelectItem>
            <SelectItem value="inactive">Inactif</SelectItem>
            <SelectItem value="maintenance">En maintenance</SelectItem>
          </SelectContent>
        </Select>
        {errors.status && <p className="text-destructive text-sm">{errors.status}</p>}
      </div>

      {/* Dernière activité (optionnel) */}
      <div className="space-y-2">
        <Label htmlFor="last_seen">Dernière activité (optionnel)</Label>
        <Input
          id="last_seen"
          type="datetime-local"
          value={formData.last_seen}
          onChange={(e) => handleInputChange("last_seen", e.target.value)}
          className={errors.last_seen ? "border-destructive" : ""}
        />
        {errors.last_seen && <p className="text-destructive text-sm">{errors.last_seen}</p>}
      </div>

      {/* Établissement ID (caché) */}
      <input
        type="hidden"
        value={establishmentId}
        onChange={(e) => handleInputChange("establishment_id", e.target.value)}
      />

      {/* Boutons d'action */}
      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" disabled={isLoading}>
          Annuler
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Enregistrement..." : isEdit ? "Modifier" : "Créer"}
        </Button>
      </div>
    </form>
  );
}
