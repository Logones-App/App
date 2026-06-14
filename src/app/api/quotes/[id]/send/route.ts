import { NextRequest, NextResponse } from "next/server";

import { addDays, format } from "date-fns";

import { pennylanePost, vatCode } from "@/lib/pennylane/client";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

async function assertCommercial() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const role = (data.user.app_metadata as Record<string, unknown> | null)?.role as string | undefined;
  const allowed = ["commercial", "account_manager", "system_admin"];
  return allowed.includes(role ?? "") ? data.user : null;
}

interface PennylaneCustomer {
  id: number;
}

interface PennylaneQuote {
  id: number;
}

interface QuoteItem {
  designation: string;
  quantity: number;
  unit_price: number;
  price_type: string;
}

interface Lead {
  id: string;
  company_name: string;
  contact_email: string | null;
  city: string | null;
  address: string | null;
  zip_code: string | null;
  country: string | null;
  pennylane_contact_id: string | null;
}

interface Org {
  id: string;
  name: string;
  pennylane_id: string | null;
}

function buildBillingAddress(city: string | null, address: string | null, zip: string | null) {
  return {
    address: address ?? "",
    city: city ?? "",
    postal_code: zip ?? "",
    country_alpha2: "FR",
  };
}

async function getOrCreateCustomer(
  service: ReturnType<typeof createServiceClient>,
  lead: Lead | null,
  org: Org | null,
): Promise<number> {
  if (lead) {
    if (lead.pennylane_contact_id) return parseInt(lead.pennylane_contact_id, 10);
    const customer = await pennylanePost<PennylaneCustomer>("/company_customers", {
      name: lead.company_name,
      billing_address: buildBillingAddress(lead.city, lead.address, lead.zip_code),
      emails: lead.contact_email ? [lead.contact_email] : [],
      external_reference: lead.id,
    });
    await service
      .from("leads")
      .update({ pennylane_contact_id: String(customer.id) })
      .eq("id", lead.id);
    return customer.id;
  }
  if (org) {
    if (org.pennylane_id) return parseInt(org.pennylane_id, 10);
    const customer = await pennylanePost<PennylaneCustomer>("/company_customers", {
      name: org.name,
      billing_address: buildBillingAddress(null, null, null),
      external_reference: org.id,
    });
    await service
      .from("organizations")
      .update({ pennylane_id: String(customer.id) })
      .eq("id", org.id);
    return customer.id;
  }
  throw new Error("Devis sans lead ni organisation associée");
}

function buildInvoiceLines(items: QuoteItem[], vatRate: number) {
  return items.map((item) => ({
    label: item.designation,
    quantity: item.quantity,
    raw_currency_unit_price: String(item.unit_price),
    unit: item.price_type === "monthly" ? "mois" : "unité",
    vat_rate: vatCode(vatRate),
  }));
}

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const caller = await assertCommercial();
    if (!caller) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const { id } = await params;
    const service = createServiceClient();

    const { data: quoteData, error: quoteErr } = await service
      .from("crm_quotes")
      .select(
        "*, leads(id, company_name, contact_email, city, address, zip_code, country, pennylane_contact_id), organizations(id, name, pennylane_id)",
      )
      .eq("id", id)
      .eq("deleted", false)
      .single();

    if (quoteErr || !quoteData) return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });
    if (quoteData.status !== "validated") {
      return NextResponse.json({ error: "Le devis doit être validé avant d'être envoyé" }, { status: 400 });
    }

    const { data: itemsData } = await service
      .from("crm_quote_items")
      .select("designation, quantity, unit_price, price_type")
      .eq("quote_id", id)
      .order("position");

    const items = (itemsData ?? []) as QuoteItem[];
    if (items.length === 0) return NextResponse.json({ error: "Le devis n'a aucune ligne" }, { status: 400 });

    const lead = quoteData.leads as unknown as Lead | null;
    const org = quoteData.organizations as unknown as Org | null;

    const customerId = await getOrCreateCustomer(service, lead, org);

    const today = new Date();
    const pennylaneQuote = await pennylanePost<PennylaneQuote>("/quotes", {
      date: format(today, "yyyy-MM-dd"),
      deadline: format(addDays(today, 30), "yyyy-MM-dd"),
      customer_id: customerId,
      currency: "EUR",
      language: "fr_FR",
      invoice_lines: buildInvoiceLines(items, quoteData.vat_rate),
    });

    await service
      .from("crm_quotes")
      .update({
        pennylane_quote_id: String(pennylaneQuote.id),
        status: "sent",
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    return NextResponse.json({ pennylane_quote_id: pennylaneQuote.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
