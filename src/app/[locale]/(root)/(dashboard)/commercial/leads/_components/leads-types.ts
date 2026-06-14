export type LeadStatus =
  | "new"
  | "contacted"
  | "demo_scheduled"
  | "demo_done"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

export type LeadSource = "manual" | "csv_import" | "web_form" | "inbound_email" | "referral" | "webhook";

export interface Lead {
  id: string;
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  city: string | null;
  sector: string | null;
  website: string | null;
  notes: string | null;
  status: LeadStatus;
  source: LeadSource;
  source_details: string | null;
  assigned_to: string | null;
  stage_changed_at: string | null;
  converted_org_id: string | null;
  converted_at: string | null;
  lost_reason: string | null;
  pennylane_contact_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted: boolean;
  assigned_profile?: { full_name: string | null } | null;
}

export const LEAD_STATUSES: { value: LeadStatus; label: string; color: string }[] = [
  { value: "new", label: "Nouveau", color: "bg-slate-100 text-slate-700" },
  { value: "contacted", label: "Contacté", color: "bg-blue-100 text-blue-700" },
  { value: "demo_scheduled", label: "Démo planifiée", color: "bg-violet-100 text-violet-700" },
  { value: "demo_done", label: "Démo faite", color: "bg-indigo-100 text-indigo-700" },
  { value: "proposal", label: "Proposition", color: "bg-amber-100 text-amber-700" },
  { value: "negotiation", label: "Négociation", color: "bg-orange-100 text-orange-700" },
  { value: "won", label: "Gagné", color: "bg-green-100 text-green-700" },
  { value: "lost", label: "Perdu", color: "bg-red-100 text-red-700" },
];

export const LEAD_SOURCES: { value: LeadSource; label: string }[] = [
  { value: "manual", label: "Saisie manuelle" },
  { value: "csv_import", label: "Import CSV" },
  { value: "web_form", label: "Formulaire web" },
  { value: "inbound_email", label: "Email entrant" },
  { value: "referral", label: "Référence client" },
  { value: "webhook", label: "API / Webhook" },
];

export const LEAD_SECTORS = [
  "Restaurant",
  "Bar / Café",
  "Traiteur",
  "Hôtel-Restaurant",
  "Restauration rapide",
  "Boulangerie / Pâtisserie",
  "Autre",
];

export function getStatusConfig(status: LeadStatus) {
  return LEAD_STATUSES.find((s) => s.value === status) ?? LEAD_STATUSES[0];
}
