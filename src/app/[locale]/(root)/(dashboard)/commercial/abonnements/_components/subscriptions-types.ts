export interface CrmSubscription {
  id: string;
  org_id: string;
  product_id: string | null;
  name: string;
  amount_monthly: number;
  status: "active" | "paused" | "cancelled";
  start_date: string;
  next_billing_date: string | null;
  commitment_months: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted: boolean;
  organizations?: { name: string } | null;
  crm_products?: { name: string } | null;
}

export const SUBSCRIPTION_STATUSES = [
  { value: "active", label: "Actif", color: "bg-green-100 text-green-700" },
  { value: "paused", label: "Pausé", color: "bg-amber-100 text-amber-700" },
  { value: "cancelled", label: "Annulé", color: "bg-red-100 text-red-700" },
] as const;

export function getSubscriptionStatus(status: string) {
  return SUBSCRIPTION_STATUSES.find((s) => s.value === status) ?? SUBSCRIPTION_STATUSES[0];
}

export function fmtMrr(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}
