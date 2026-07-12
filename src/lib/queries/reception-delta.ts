"use client";

import { createClient } from "@/lib/supabase/client";

/** `doc_type` des doc_imports synthétiques créés par une réception/ajustement SaaS en `'pos'` — filtré hors inbox OCR. */
export const SAAS_RECEPTION_DOC_TYPE = "saas_reception";

/**
 * Réception en mode `'pos'` : le SaaS n'écrit PAS `current_stock`. Il pose le PRIX immédiatement
 * (snapshot owned SaaS, lié à la livraison via `source_doc_import_id`) et émet le STOCK en delta via
 * un `doc_import` synthétique que le POS applique (`apply_stock=true`, `applied_at=NULL`). Le facteur
 * n'est PAS appliqué ici : le POS le tient depuis la référence. Voir SPEC_CURRENT_STOCK_OWNERSHIP.md.
 */
export async function createReceptionAsDelta(
  supabase: ReturnType<typeof createClient>,
  args: {
    productId: string;
    organizationId: string;
    establishmentId: string;
    supplierRefId: string;
    supplierId: string;
    orderQty: number;
    unitPrice: number;
    factor: number;
    notes: string;
  },
): Promise<void> {
  const { productId, organizationId, establishmentId, supplierRefId, supplierId, orderQty, unitPrice, factor, notes } =
    args;
  const today = new Date().toISOString().slice(0, 10);
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user.id ?? null;

  const { data: ref } = await supabase
    .from("supplier_references")
    .select("order_unit")
    .eq("id", supplierRefId)
    .single();
  const orderUnit = ref?.order_unit ?? null;

  // 1) doc_import parent finalisé (hors inbox OCR via doc_type ; le POS ne filtre pas sur le statut).
  const { data: imp, error: impErr } = await supabase
    .from("doc_imports")
    .insert({
      organization_id: organizationId,
      establishment_id: establishmentId,
      supplier_id: supplierId,
      doc_type: SAAS_RECEPTION_DOC_TYPE,
      source_type: "saas_manual",
      status: "validated",
      date_livraison: today,
      validated_at: new Date().toISOString(),
      validated_by: userId,
    })
    .select("id")
    .single();
  if (impErr) throw new Error(`doc_import: ${impErr.message}`);

  // 2) Prix immédiat (owned SaaS) : snapshot lié à la livraison + MAJ prix catalogue.
  const unitCost = Math.round((unitPrice / factor) * 100000) / 100000;
  const { error: snapErr } = await supabase.from("supplier_price_snapshots").insert({
    product_id: productId,
    organization_id: organizationId,
    supplier_reference_id: supplierRefId,
    supplier_id: supplierId,
    unit_cost: unitCost,
    unit_price: unitPrice,
    order_unit: orderUnit,
    currency: "EUR",
    effective_from: today,
    source_doc_import_id: imp.id,
    created_by: userId,
  });
  if (snapErr) throw new Error(`snapshot prix: ${snapErr.message}`);
  await supabase.from("supplier_references").update({ unit_price: unitPrice }).eq("id", supplierRefId);

  // 3) Stock en delta : ligne appliquée par le POS (quantite en unité de commande, facteur = réf).
  const { error: lineErr } = await supabase.from("doc_import_lines").insert({
    import_id: imp.id,
    product_id: productId,
    supplier_reference_id: supplierRefId,
    quantite: orderQty,
    unite: orderUnit,
    prix_unitaire: unitPrice,
    apply_stock: true,
    apply_price: false,
    automation_status: "matched",
    automation_note: notes.trim() !== "" ? notes.trim() : null,
  });
  if (lineErr) throw new Error(`doc_import_line: ${lineErr.message}`);
}
