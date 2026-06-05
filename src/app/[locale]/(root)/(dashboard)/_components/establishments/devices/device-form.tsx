"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEVICE_MODS, DEVICE_ROLES, DEVICE_DISPLAYS, type DeviceFormData } from "@/lib/schemas/device-schema";

const MOD_LABELS: Record<string, string> = {
  pos: "Caisse (POS)",
  kds: "Écran cuisine (KDS)",
  haccp: "HACCP",
  hr: "RH & Planning",
  booking: "Réservations",
};

const ROLE_LABELS: Record<string, string> = {
  master: "Master (principal)",
  slave: "Slave (secondaire)",
};

const DISPLAY_LABELS: Record<string, string> = {
  landscape: "Paysage (horizontal)",
  portrait: "Portrait (vertical)",
};

interface DeviceFormProps {
  formData: DeviceFormData;
  handleInputChange: (field: keyof DeviceFormData, value: string) => void;
  handleModsChange: (mod: string, checked: boolean) => void;
  handleSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  errors: Record<string, string>;
  isEdit: boolean;
  isLoading: boolean;
  establishmentId: string;
}

export function DeviceForm({
  formData,
  handleInputChange,
  handleModsChange,
  handleSubmit,
  onCancel,
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
        <Label htmlFor="device_role">Rôle</Label>
        <Select value={formData.device_role} onValueChange={(v) => handleInputChange("device_role", v)}>
          <SelectTrigger className={errors.device_role ? "border-destructive" : ""}>
            <SelectValue placeholder="Sélectionnez un rôle" />
          </SelectTrigger>
          <SelectContent>
            {DEVICE_ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {ROLE_LABELS[role]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.device_role && <p className="text-destructive text-sm">{errors.device_role}</p>}
      </div>

      {/* Orientation */}
      <div className="space-y-2">
        <Label htmlFor="display">Orientation écran</Label>
        <Select value={formData.display} onValueChange={(v) => handleInputChange("display", v)}>
          <SelectTrigger className={errors.display ? "border-destructive" : ""}>
            <SelectValue placeholder="Sélectionnez une orientation" />
          </SelectTrigger>
          <SelectContent>
            {DEVICE_DISPLAYS.map((d) => (
              <SelectItem key={d} value={d}>
                {DISPLAY_LABELS[d]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.display && <p className="text-destructive text-sm">{errors.display}</p>}
      </div>

      {/* Statut */}
      <div className="space-y-2">
        <Label htmlFor="status">Statut</Label>
        <Select value={formData.status} onValueChange={(v) => handleInputChange("status", v)}>
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
          placeholder="Ex: SUNMI"
        />
      </div>

      {/* Modèle (optionnel) */}
      <div className="space-y-2">
        <Label htmlFor="model">Modèle (optionnel)</Label>
        <Input
          id="model"
          value={formData.model ?? ""}
          onChange={(e) => handleInputChange("model", e.target.value)}
          placeholder="Ex: V3"
        />
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

      {/* Modules */}
      <div className="space-y-2">
        <Label>Modules disponibles</Label>
        <p className="text-muted-foreground text-xs">Sélectionnez les modules accessibles depuis ce device.</p>
        <div className="grid grid-cols-2 gap-2 pt-1">
          {DEVICE_MODS.map((mod) => (
            <label
              key={mod}
              className="hover:bg-muted/50 flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2"
            >
              <Checkbox
                checked={formData.mods.includes(mod)}
                onCheckedChange={(v) => handleModsChange(mod, Boolean(v))}
              />
              <span className="text-sm">{MOD_LABELS[mod]}</span>
            </label>
          ))}
        </div>
      </div>

      <input type="hidden" value={establishmentId} readOnly />

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" disabled={isLoading} onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Enregistrement..." : isEdit ? "Modifier" : "Créer"}
        </Button>
      </div>
    </form>
  );
}
