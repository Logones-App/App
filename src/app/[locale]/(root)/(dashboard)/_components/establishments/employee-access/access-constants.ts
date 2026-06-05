export type ModuleId = "pos" | "kds" | "haccp" | "hr" | "booking";

export interface ModulePermission {
  id: string;
  label: string;
}

export interface ModuleDefinition {
  id: ModuleId;
  label: string;
  description: string;
  permissions: ModulePermission[];
}

export const MODULES: ModuleDefinition[] = [
  {
    id: "pos",
    label: "Caisse (POS)",
    description: "Gestion des commandes et encaissements",
    permissions: [
      { id: "open_session", label: "Ouvrir une session" },
      { id: "close_session", label: "Fermer une session" },
      { id: "apply_discount", label: "Appliquer une remise" },
      { id: "void_order", label: "Annuler une commande" },
      { id: "process_refund", label: "Effectuer un remboursement" },
      { id: "open_drawer", label: "Ouvrir le tiroir-caisse" },
    ],
  },
  {
    id: "hr",
    label: "RH & Planning",
    description: "Gestion des ressources humaines",
    permissions: [
      { id: "view_salaries", label: "Voir les salaires" },
      { id: "manage_absences", label: "Gérer les absences" },
      { id: "manage_planning", label: "Gérer le planning" },
      { id: "view_documents", label: "Voir les documents RH" },
    ],
  },
  {
    id: "haccp",
    label: "HACCP",
    description: "Traçabilité et sécurité alimentaire",
    permissions: [
      { id: "record_temperatures", label: "Enregistrer les températures" },
      { id: "manage_plans", label: "Gérer les plans de nettoyage" },
      { id: "view_reports", label: "Consulter les rapports" },
    ],
  },
  {
    id: "kds",
    label: "Écran cuisine (KDS)",
    description: "Affichage et gestion des commandes en cuisine",
    permissions: [
      { id: "view_orders", label: "Voir les commandes" },
      { id: "update_order_status", label: "Mettre à jour le statut" },
      { id: "manage_kds_config", label: "Configurer l'écran" },
    ],
  },
  {
    id: "booking",
    label: "Réservations",
    description: "Gestion des réservations clients",
    permissions: [
      { id: "view_bookings", label: "Voir les réservations" },
      { id: "manage_bookings", label: "Créer / modifier des réservations" },
      { id: "manage_slots", label: "Gérer les créneaux" },
    ],
  },
];
