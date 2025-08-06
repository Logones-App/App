"use client";

import React from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { MobileUserFormData } from "@/lib/schemas/mobile-user-schema";

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
}: {
  formData: MobileUserFormData;
  handleInputChange: (field: keyof MobileUserFormData, value: string | boolean) => void;
  isEdit: boolean;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          id="firstname"
          label="Prénom"
          value={formData.firstname}
          onChange={(value) => handleInputChange("firstname", value)}
          required
        />
        <FormField
          id="lastname"
          label="Nom"
          value={formData.lastname}
          onChange={(value) => handleInputChange("lastname", value)}
          required
        />
      </div>
      <FormField
        id="email"
        label="Email"
        type="email"
        value={formData.email}
        onChange={(value) => handleInputChange("email", value)}
        required
      />
      <FormField
        id="phone"
        label="Téléphone"
        type="tel"
        value={formData.phone ?? ""}
        onChange={(value) => handleInputChange("phone", value)}
      />
      {!isEdit && (
        <FormField
          id="password"
          label="Mot de passe"
          type="password"
          value={formData.password ?? ""}
          onChange={(value) => handleInputChange("password", value)}
          required
        />
      )}
      <div className="space-y-2">
        <Label htmlFor="role">Rôle</Label>
        <Select value={formData.role} onValueChange={(value) => handleInputChange("role", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner un rôle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user">Utilisateur</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="admin">Administrateur</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          id="is_active"
          checked={formData.is_active}
          onCheckedChange={(checked) => handleInputChange("is_active", checked)}
        />
        <Label htmlFor="is_active">Utilisateur actif</Label>
      </div>
    </>
  );
}
