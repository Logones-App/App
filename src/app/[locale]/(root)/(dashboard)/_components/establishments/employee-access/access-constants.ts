// Catalogue plat des droits employé (clés `can_*` snake_case, source de vérité partagée avec le POS).
// Un seul niveau : accès module + actions, tout dans employee_permissions. Presets par rôle, modifiables individuellement.

export type PermissionGroupId = "modules" | "caisse" | "gestion";

export interface PermissionDef {
  key: string;
  label: string;
  /** N° JET NF525 (audit JET 130 à venir). */
  jet?: string;
}

export interface PermissionGroup {
  id: PermissionGroupId;
  label: string;
  permissions: PermissionDef[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: "modules",
    label: "Accès aux modules",
    permissions: [
      { key: "can_access_module_pos", label: "Caisse (POS)" },
      { key: "can_access_module_kds", label: "Écran cuisine (KDS)" },
      { key: "can_access_module_hr", label: "RH & Planning" },
      { key: "can_access_module_haccp", label: "HACCP" },
      { key: "can_access_module_booking", label: "Réservations" },
      { key: "can_access_module_clients", label: "Clients / CRM" },
    ],
  },
  {
    id: "caisse",
    label: "Opérations de caisse",
    permissions: [
      { key: "can_refund", label: "Rembourser / émettre un avoir", jet: "326" },
      { key: "can_offer_note", label: "Offrir une note entière", jet: "327" },
      { key: "can_offer_item", label: "Offrir un article", jet: "328" },
      { key: "can_apply_discount", label: "Appliquer une remise" },
      { key: "can_cancel_after_fire", label: "Annuler un article après envoi cuisine", jet: "325" },
      { key: "can_abort_validated_note", label: "Abandonner une note validée", jet: "324" },
      { key: "can_reprint_receipt", label: "Réimprimer un duplicata", jet: "156" },
      { key: "can_cancel_before_fire", label: "Annuler une ligne avant envoi cuisine", jet: "323" },
      { key: "can_override_price", label: "Saisir / modifier un prix libre", jet: "270" },
    ],
  },
  {
    id: "gestion",
    label: "Gestion / administration",
    permissions: [
      { key: "can_close_day", label: "Clôture journalière (Z)", jet: "50/901" },
      { key: "can_close_period", label: "Clôture mensuelle / annuelle", jet: "50/60" },
      { key: "can_access_training_mode", label: "Accès mode formation", jet: "100/105" },
      { key: "can_change_compliance_settings", label: "Modifier un paramètre de conformité", jet: "270" },
      { key: "can_purge_archive", label: "Purger / archiver", jet: "200/205" },
      { key: "can_export_accounting", label: "Export comptable / FEC", jet: "110/180/290" },
      { key: "can_edit_establishment", label: "Modifier données établissement", jet: "410" },
      { key: "can_change_signing_key", label: "Changer la clé de signature", jet: "450" },
      { key: "can_manage_permissions", label: "Gérer les droits des employés", jet: "130" },
      { key: "can_manage_employees", label: "Créer / modifier des employés" },
    ],
  },
];

export const ALL_PERMISSION_KEYS: string[] = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key));

// ─── Rôles (alignés sur la contrainte CHECK employees.role) ─────────────────────
export type EmployeeRole = "server" | "manager";

export const ROLE_LABELS: Record<EmployeeRole, string> = {
  server: "Serveur",
  manager: "Manager",
};

// Presets : droits par défaut appliqués au choix du rôle (puis modifiables individuellement).
export const ROLE_PRESETS: Record<EmployeeRole, string[]> = {
  server: ["can_access_module_pos", "can_cancel_before_fire", "can_reprint_receipt"],
  manager: [
    "can_access_module_pos",
    "can_access_module_kds",
    "can_access_module_hr",
    "can_access_module_haccp",
    "can_access_module_booking",
    "can_access_module_clients",
    "can_refund",
    "can_offer_note",
    "can_offer_item",
    "can_apply_discount",
    "can_cancel_after_fire",
    "can_abort_validated_note",
    "can_reprint_receipt",
    "can_cancel_before_fire",
    "can_override_price",
    "can_close_day",
    "can_close_period",
    "can_access_training_mode",
    "can_manage_employees",
  ],
};

export function presetForRole(role: string | null | undefined): string[] {
  return role && role in ROLE_PRESETS ? ROLE_PRESETS[role as EmployeeRole] : [];
}
