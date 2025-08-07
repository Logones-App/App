import { z } from "zod";

export const mobileUserPermissionSchema = z.object({
  mobile_user_id: z.string().uuid("ID utilisateur mobile invalide"),
  permission: z.string().min(1, "La permission est requise"),
  granted_by: z.string().uuid("ID utilisateur accordant invalide").optional(),
  organization_id: z.string().uuid("ID organisation invalide"),
  establishment_id: z.string().uuid("ID établissement invalide"),
});

export type MobileUserPermissionFormData = z.infer<typeof mobileUserPermissionSchema>;

export const mobileUserPermissionCreateSchema = mobileUserPermissionSchema;

export const mobileUserPermissionUpdateSchema = mobileUserPermissionSchema.partial().extend({
  id: z.string().uuid("ID invalide"),
});
