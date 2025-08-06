import { z } from "zod";

export const mobileUserSchema = z.object({
  firstname: z.string().min(1, "Le prénom est requis"),
  lastname: z.string().min(1, "Le nom est requis"),
  email: z.string().email("Email invalide"),
  phone: z.string().optional(),
  role: z.string().optional(),
  is_active: z.boolean(),
  password: z.string().optional(),
});

export type MobileUserFormData = z.infer<typeof mobileUserSchema>;

export const mobileUserCreateSchema = mobileUserSchema.extend({
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
});

export const mobileUserUpdateSchema = mobileUserSchema.extend({
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères").optional(),
});
