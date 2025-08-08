import { z } from "zod";

export const deviceSchema = z.object({
  name: z.string().min(1, "Le nom du device est requis"),
  device_id: z.string().min(1, "L'ID du device est requis"),
  establishment_id: z.string().uuid("ID établissement invalide"),
  device_type: z.string().default("tablet"),
  status: z.string().default("active"),
  last_seen: z.string().optional(),
});

export type DeviceFormData = z.infer<typeof deviceSchema>;

export const deviceCreateSchema = deviceSchema;

export const deviceUpdateSchema = deviceSchema.partial().extend({
  id: z.string().uuid("ID invalide"),
});

export type DeviceUpdateFormData = DeviceFormData & { id: string };
