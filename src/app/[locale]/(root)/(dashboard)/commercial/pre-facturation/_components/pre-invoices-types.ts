export interface CrmPreInvoice {
  id: string;
  quote_id: string | null;
  lead_id: string | null;
  org_id: string | null;
  pre_invoice_number: string;
  status: "draft" | "pending" | "partial" | "complete";
  total_ht: number;
  total_ttc: number;
  commitment_months: number;
  mrr: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted: boolean;
  leads?: { company_name: string } | null;
  organizations?: { name: string } | null;
  crm_quotes?: { quote_number: string; total_ttc: number } | null;
}

export interface CrmInstallment {
  id: string;
  pre_invoice_id: string;
  label: string;
  amount: number;
  due_date: string;
  status: "pending" | "paid";
  paid_at: string | null;
  created_at: string;
}

export const PRE_INVOICE_STATUSES = [
  { value: "draft", label: "Brouillon", color: "bg-gray-100 text-gray-700" },
  { value: "pending", label: "En attente", color: "bg-amber-100 text-amber-700" },
  { value: "partial", label: "Partiel", color: "bg-blue-100 text-blue-700" },
  { value: "complete", label: "Complet", color: "bg-green-100 text-green-700" },
] as const;

export function getPreInvoiceStatus(status: string) {
  return PRE_INVOICE_STATUSES.find((s) => s.value === status) ?? PRE_INVOICE_STATUSES[0];
}

export function fmtEurPi(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });
}

export function computePreInvoiceStatus(installments: CrmInstallment[]): CrmPreInvoice["status"] {
  if (installments.length === 0) return "draft";
  const paid = installments.filter((i) => i.status === "paid").length;
  if (paid === 0) return "pending";
  if (paid < installments.length) return "partial";
  return "complete";
}
