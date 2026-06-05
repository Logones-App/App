import { z } from "zod";

export const DEVICE_MODS = ["pos", "kds", "haccp", "hr", "booking"] as const;
export type DeviceMod = (typeof DEVICE_MODS)[number];

export const DEVICE_ROLES = ["master", "slave"] as const;
export type DeviceRole = (typeof DEVICE_ROLES)[number];

export const DEVICE_DISPLAYS = ["landscape", "portrait"] as const;
export type DeviceDisplay = (typeof DEVICE_DISPLAYS)[number];

export const deviceSchema = z.object({
  establishment_id: z.string().uuid("ID établissement invalide"),
  serial_number: z.string().min(1, "Le numéro de série est requis"),
  device_role: z.enum(DEVICE_ROLES).default("slave"),
  display: z.enum(DEVICE_DISPLAYS).default("portrait"),
  status: z.string().default("active"),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  port_attribue: z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => (typeof v === "string" && v.trim() !== "" ? Number(v) : typeof v === "number" ? v : undefined))
    .refine((v) => v === undefined || Number.isFinite(v), "Port invalide"),
  mods: z.array(z.enum(DEVICE_MODS)).default([]),
});

export type DeviceFormData = z.infer<typeof deviceSchema>;

export const deviceUpdateSchema = deviceSchema.partial().extend({
  id: z.string().uuid("ID invalide"),
});

export type DeviceUpdateFormData = z.infer<typeof deviceUpdateSchema> & { id: string };
