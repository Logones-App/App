import { z } from "zod";

export const deviceSchema = z.object({
  establishment_id: z.string().uuid("ID établissement invalide"),
  serial_number: z.string().min(1, "Le numéro de série est requis"),
  device_role: z.string().min(1, "Le rôle du device est requis").default("tablet"),
  status: z.string().default("active"),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  port_attribue: z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => (typeof v === "string" && v.trim() !== "" ? Number(v) : typeof v === "number" ? v : undefined))
    .refine((v) => v === undefined || Number.isFinite(v), "Port invalide"),
});

export type DeviceFormData = z.infer<typeof deviceSchema>;

export const deviceCreateSchema = deviceSchema;

export const deviceUpdateSchema = deviceSchema.partial().extend({
  id: z.string().uuid("ID invalide"),
});

export type DeviceUpdateFormData = DeviceFormData & { id: string };
