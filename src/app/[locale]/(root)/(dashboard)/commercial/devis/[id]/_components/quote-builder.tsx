"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { ArrowLeft, Loader2, Package } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";

import { type CrmProduct } from "../../../produits/_components/products-types";
import {
  type CrmQuote,
  type CrmQuoteItem,
  type QuoteLineDraft,
  VAT_RATES,
  computeTotals,
  fmtEur,
  getQuoteStatusConfig,
} from "../../_components/quotes-types";

import { QuoteLineItems } from "./quote-line-items";

interface Props {
  id: string;
  locale: string;
}

export function QuoteBuilder({ id, locale }: Props) {
  const router = useRouter();
  const [quote, setQuote] = useState<CrmQuote | null>(null);
  const [lines, setLines] = useState<QuoteLineDraft[]>([]);
  const [products, setProducts] = useState<CrmProduct[]>([]);
  const [notes, setNotes] = useState("");
  const [vatRate, setVatRate] = useState("20");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [quoteRes, itemsRes, productsRes] = await Promise.all([
        supabase
          .from("crm_quotes")
          .select("*, leads(company_name), organizations(name)")
          .eq("id", id)
          .eq("deleted", false)
          .single(),
        supabase.from("crm_quote_items").select("*").eq("quote_id", id).order("position"),
        supabase.from("crm_products").select("*").eq("is_active", true).eq("deleted", false).order("name"),
      ]);
      const q = quoteRes.data as unknown as CrmQuote | null;
      if (!q) {
        router.push(`/${locale}/commercial/devis`);
        return;
      }
      setQuote(q);
      setNotes(q.notes ?? "");
      setVatRate(String(q.vat_rate));
      const dbItems = (itemsRes.data ?? []) as unknown as CrmQuoteItem[];
      setLines(dbItems.map((i) => ({ ...i, tempId: i.id })));
      setProducts((productsRes.data ?? []) as unknown as CrmProduct[]);
      setIsLoading(false);
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function addFromProduct(product: CrmProduct) {
    const newLine: QuoteLineDraft = {
      tempId: crypto.randomUUID(),
      product_id: product.id,
      designation: product.name,
      quantity: 1,
      unit_price: product.unit_price,
      purchase_price: product.purchase_price,
      price_type: product.price_type,
      total_ht: product.unit_price,
      position: lines.length,
    };
    setLines((prev) => [...prev, newLine]);
  }

  async function handleSendPennylane() {
    if (!quote) return;
    setIsSending(true);
    try {
      const res = await fetch(`/api/quotes/${id}/send`, { method: "POST" });
      const json = (await res.json()) as { error?: string; pennylane_quote_id?: number };
      if (!res.ok) {
        toast.error(json.error ?? "Erreur Pennylane");
        return;
      }
      setQuote((prev) => (prev ? { ...prev, status: "sent" as CrmQuote["status"] } : prev));
      toast.success("Devis créé dans Pennylane");
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setIsSending(false);
    }
  }

  async function handleSave(newStatus?: string) {
    if (!quote) return;
    setIsSaving(true);
    try {
      const supabase = createClient();
      const vat = parseFloat(vatRate);
      const { totalHt, totalTva, totalTtc } = computeTotals(lines, vat);
      const statusToSave = newStatus ?? quote.status;
      const extraFields: Record<string, string> = {};
      if (newStatus === "sent") extraFields.sent_at = new Date().toISOString();
      if (newStatus === "signed") extraFields.signed_at = new Date().toISOString();

      const { error: qErr } = await supabase
        .from("crm_quotes")
        .update({
          status: statusToSave,
          vat_rate: vat,
          total_ht: totalHt,
          total_tva: totalTva,
          total_ttc: totalTtc,
          notes: notes.trim() || null,
          updated_at: new Date().toISOString(),
          ...extraFields,
        })
        .eq("id", id);
      if (qErr) throw qErr;

      await supabase.from("crm_quote_items").delete().eq("quote_id", id);
      if (lines.length > 0) {
        const { error: iErr } = await supabase.from("crm_quote_items").insert(
          lines.map((l, idx) => ({
            quote_id: id,
            product_id: l.product_id,
            designation: l.designation,
            quantity: l.quantity,
            unit_price: l.unit_price,
            purchase_price: l.purchase_price,
            price_type: l.price_type,
            total_ht: l.total_ht,
            position: idx,
          })),
        );
        if (iErr) throw iErr;
      }
      setQuote((prev) =>
        prev ? { ...prev, status: statusToSave as CrmQuote["status"], total_ht: totalHt, total_ttc: totalTtc } : prev,
      );
      toast.success(newStatus ? "Statut mis à jour" : "Devis sauvegardé");
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!quote) return null;

  const sc = getQuoteStatusConfig(quote.status);
  const clientName = quote.leads?.company_name ?? quote.organizations?.name ?? "—";
  const { totalHt, totalTva, totalTtc } = computeTotals(lines, parseFloat(vatRate));

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="mt-0.5 shrink-0"
            onClick={() => router.push(`/${locale}/commercial/devis`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-xl font-bold">{quote.quote_number}</h1>
              <Badge className={`border-0 ${sc.color}`}>{sc.label}</Badge>
            </div>
            <p className="text-muted-foreground text-sm">{clientName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {quote.status === "draft" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleSave("pending_validation")}
              disabled={isSaving}
            >
              Demander validation
            </Button>
          )}
          {quote.status === "validated" && (
            <Button variant="outline" size="sm" onClick={() => void handleSendPennylane()} disabled={isSending}>
              {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Envoyer via Pennylane
            </Button>
          )}
          {quote.status === "sent" && (
            <>
              <Button variant="outline" size="sm" onClick={() => void handleSave("signed")} disabled={isSaving}>
                Signé
              </Button>
              <Button variant="outline" size="sm" onClick={() => void handleSave("rejected")} disabled={isSaving}>
                Refusé
              </Button>
            </>
          )}
          {(quote.status === "draft" || quote.status === "pending_validation") && (
            <Button size="sm" onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sauvegarder
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Lignes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Lignes du devis</CardTitle>
            </CardHeader>
            <CardContent>
              <QuoteLineItems items={lines} onChange={setLines} />
            </CardContent>
          </Card>

          {/* Catalogue rapide */}
          {products.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Package className="h-4 w-4" />
                  Ajouter depuis le catalogue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {products.map((p) => (
                    <Button
                      key={p.id}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => addFromProduct(p)}
                    >
                      + {p.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Panneau droit */}
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-3 pt-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Taux TVA</Label>
                <Select value={vatRate} onValueChange={setVatRate}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VAT_RATES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Conditions, remarques…"
                />
              </div>
            </CardContent>
          </Card>

          {/* Totaux */}
          <Card>
            <CardContent className="space-y-2 pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sous-total HT</span>
                <span className="font-medium">{fmtEur(totalHt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">TVA ({vatRate}%)</span>
                <span className="font-medium">{fmtEur(totalTva)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Total TTC</span>
                <span className="text-lg">{fmtEur(totalTtc)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
