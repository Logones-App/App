// Ré-export de la vérité domaine des droits employé (catalogue, rôles, presets).
// La source unique vit dans @/lib/permissions/employee-permissions afin que la couche
// données (seeding) puisse la partager sans dépendre de la couche composants.
export * from "@/lib/permissions/employee-permissions";
