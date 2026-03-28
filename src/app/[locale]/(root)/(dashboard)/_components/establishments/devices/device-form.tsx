"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

/* eslint-disable complexity -- formulaire multi-champs (rôles, statuts, erreurs par champ) */
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
      {/* Numéro de série */}
      <div className="space-y-2">
        <Label htmlFor="serial_number">Numéro de série</Label>
        <Input
          id="serial_number"
          value={formData.serial_number}
          onChange={(e) => handleInputChange("serial_number", e.target.value)}
          placeholder="Ex: SN-123456"
          className={errors.serial_number ? "border-destructive" : ""}
        />
        {errors.serial_number && <p className="text-destructive text-sm">{errors.serial_number}</p>}
      </div>

      {/* Rôle */}
      <div className="space-y-2">
        <Label htmlFor="device_role">Rôle du device</Label>
        <Select value={formData.device_role} onValueChange={(value) => handleInputChange("device_role", value)}>
          <SelectTrigger className={errors.device_role ? "border-destructive" : ""}>
            <SelectValue placeholder="Sélectionnez un rôle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tablet">Tablette</SelectItem>
            <SelectItem value="phone">Smartphone</SelectItem>
            <SelectItem value="pos">POS</SelectItem>
            <SelectItem value="kiosk">Borne</SelectItem>
          </SelectContent>
        </Select>
        {errors.device_role && <p className="text-destructive text-sm">{errors.device_role}</p>}
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

      {/* Fabricant (optionnel) */}
      <div className="space-y-2">
        <Label htmlFor="manufacturer">Fabricant (optionnel)</Label>
        <Input
          id="manufacturer"
          value={formData.manufacturer ?? ""}
          onChange={(e) => handleInputChange("manufacturer", e.target.value)}
          placeholder="Ex: Samsung"
          className={errors.manufacturer ? "border-destructive" : ""}
        />
        {errors.manufacturer && <p className="text-destructive text-sm">{errors.manufacturer}</p>}
      </div>

      {/* Modèle (optionnel) */}
      <div className="space-y-2">
        <Label htmlFor="model">Modèle (optionnel)</Label>
        <Input
          id="model"
          value={formData.model ?? ""}
          onChange={(e) => handleInputChange("model", e.target.value)}
          placeholder="Ex: Galaxy Tab A8"
          className={errors.model ? "border-destructive" : ""}
        />
        {errors.model && <p className="text-destructive text-sm">{errors.model}</p>}
      </div>

      {/* Port attribué (optionnel) */}
      <div className="space-y-2">
        <Label htmlFor="port_attribue">Port attribué (optionnel)</Label>
        <Input
          id="port_attribue"
          inputMode="numeric"
          value={formData.port_attribue === undefined ? "" : String(formData.port_attribue)}
          onChange={(e) => handleInputChange("port_attribue", e.target.value)}
          placeholder="Ex: 8080"
          className={errors.port_attribue ? "border-destructive" : ""}
        />
        {errors.port_attribue && <p className="text-destructive text-sm">{errors.port_attribue}</p>}
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
/* eslint-enable complexity */
