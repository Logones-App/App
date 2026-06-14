export interface CrmQuote {
  id: string;
  lead_id: string | null;
  org_id: string | null;
  quote_number: string;
  status: "draft" | "sent" | "signed" | "rejected";
  vat_rate: number;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  notes: string | null;
  sent_at: string | null;
  signed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted: boolean;
  leads?: { company_name: string } | null;
  organizations?: { name: string } | null;
}

export interface CrmQuoteItem {
  id: string;
  quote_id: string;
  product_id: string | null;
  designation: string;
  quantity: number;
  unit_price: number;
  price_type: "monthly" | "one_time";
  total_ht: number;
  position: number;
}

export interface QuoteLineDraft {
  tempId: string;
  id?: string;
  product_id: string | null;
  designation: string;
  quantity: number;
  unit_price: number;
  price_type: "monthly" | "one_time";
  total_ht: number;
  position: number;
}

export const QUOTE_STATUSES = [
  { value: "draft", label: "Brouillon", color: "bg-gray-100 text-gray-700" },
  { value: "sent", label: "Envoyé", color: "bg-blue-100 text-blue-700" },
  { value: "signed", label: "Signé", color: "bg-green-100 text-green-700" },
  { value: "rejected", label: "Refusé", color: "bg-red-100 text-red-700" },
] as const;

export function getQuoteStatusConfig(status: string) {
  return QUOTE_STATUSES.find((s) => s.value === status) ?? QUOTE_STATUSES[0];
}

export const VAT_RATES = [
  { value: "0", label: "0%" },
  { value: "5.5", label: "5,5%" },
  { value: "10", label: "10%" },
  { value: "20", label: "20%" },
];

export function computeTotals(items: QuoteLineDraft[], vatRate: number) {
  const totalHt = items.reduce((s, i) => s + i.total_ht, 0);
  const totalTva = totalHt * (vatRate / 100);
  return { totalHt, totalTva, totalTtc: totalHt + totalTva };
}

export function fmtEur(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });
}
