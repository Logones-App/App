"use client";

import { useEffect, useState } from "react";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";

import { QuoteLineItems } from "../../../commercial/devis/[id]/_components/quote-line-items";
import {
  type CrmQuote,
  type CrmQuoteItem,
  type QuoteLineDraft,
  fmtEur,
} from "../../../commercial/devis/_components/quotes-types";

interface QuoteWithItems extends CrmQuote {
  lines: QuoteLineDraft[];
  depositInput: string;
}

export function AdminQuotesValidation() {
  const [quotes, setQuotes] = useState<QuoteWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [validating, setValidating] = useState<string | null>(null);

  async function loadQuotes() {
    const supabase = createClient();
    const { data: quotesData } = await supabase
      .from("crm_quotes")
      .select("*, leads(company_name), organizations(name)")
      .eq("status", "pending_validation")
      .eq("deleted", false)
      .order("updated_at", { ascending: false });

    if (!quotesData || quotesData.length === 0) {
      setQuotes([]);
      setIsLoading(false);
      return;
    }

    const ids = quotesData.map((q) => q.id);
    const { data: itemsData } = await supabase
      .from("crm_quote_items")
      .select("*")
      .in("quote_id", ids)
      .order("position");

    const allItems = (itemsData ?? []) as unknown as CrmQuoteItem[];
    setQuotes(
      (quotesData as unknown as CrmQuote[]).map((q) => ({
        ...q,
        lines: allItems.filter((i) => i.quote_id === q.id).map((i) => ({ ...i, tempId: i.id })),
        depositInput: "",
      })),
    );
    setIsLoading(false);
  }

  useEffect(() => {
    void loadQuotes();
  }, []);

  function setDeposit(quoteId: string, value: string) {
    setQuotes((prev) => prev.map((q) => (q.id === quoteId ? { ...q, depositInput: value } : q)));
  }

  async function handleValidate(q: QuoteWithItems) {
    setValidating(q.id);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const depositAmount = parseFloat(q.depositInput) || null;
      const { error } = await supabase
        .from("crm_quotes")
        .update({
          status: "validated",
          deposit_amount: depositAmount,
          validated_at: new Date().toISOString(),
          validated_by: user?.id ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", q.id);
      if (error) throw error;
      toast.success(`Devis ${q.quote_number} validé`);
      setQuotes((prev) => prev.filter((item) => item.id !== q.id));
    } catch {
      toast.error("Erreur lors de la validation");
    } finally {
      setValidating(null);
    }
  }

  async function handleReject(q: QuoteWithItems) {
    setValidating(q.id);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("crm_quotes")
        .update({ status: "draft", updated_at: new Date().toISOString() })
        .eq("id", q.id);
      if (error) throw error;
      toast.success(`Devis ${q.quote_number} renvoyé en brouillon`);
      setQuotes((prev) => prev.filter((item) => item.id !== q.id));
    } catch {
      toast.error("Erreur lors du rejet");
    } finally {
      setValidating(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (quotes.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed">
        <CheckCircle2 className="text-muted-foreground h-10 w-10" />
        <p className="text-muted-foreground text-sm">Aucun devis en attente de validation</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {quotes.map((q) => {
        const clientName = q.leads?.company_name ?? q.organizations?.name ?? "—";
        const isValidating = validating === q.id;
        const totalPurchase = q.lines.reduce((s, l) => s + l.purchase_price * l.quantity, 0);

        return (
          <Card key={q.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span className="font-mono">{q.quote_number}</span>
                    <Badge className="border-0 bg-amber-100 text-xs text-amber-700">En attente</Badge>
                  </CardTitle>
                  <p className="text-muted-foreground mt-0.5 text-sm">
                    {clientName} · demandé le {format(new Date(q.updated_at), "d MMM yyyy", { locale: fr })}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="text-muted-foreground text-xs">Total TTC</p>
                  <p className="text-lg font-bold">{fmtEur(q.total_ttc)}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Lignes en lecture seule */}
              <QuoteLineItems items={q.lines} onChange={() => undefined} readonly />

              <Separator />

              {/* Résumé financier + acompte */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="bg-muted/40 rounded-lg p-3 text-sm">
                  <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                    Récap financier
                  </p>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">HT</span>
                    <span>{fmtEur(q.total_ht)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">TVA ({q.vat_rate}%)</span>
                    <span>{fmtEur(q.total_tva)}</span>
                  </div>
                  <div className="mt-1 flex justify-between font-semibold">
                    <span>TTC</span>
                    <span>{fmtEur(q.total_ttc)}</span>
                  </div>
                  {totalPurchase > 0 && (
                    <div className="mt-2 border-t pt-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Coût achat matériel</span>
                        <span className="font-medium text-orange-600">{fmtEur(totalPurchase)}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Acompte à facturer (€ TTC)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={q.depositInput}
                      onChange={(e) => setDeposit(q.id, e.target.value)}
                      placeholder={totalPurchase > 0 ? `Coût achat : ${fmtEur(totalPurchase)}` : "Montant libre…"}
                      className="text-sm"
                    />
                    <p className="text-muted-foreground text-xs">Laisser vide = pas d&apos;acompte</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      disabled={isValidating}
                      onClick={() => void handleReject(q)}
                    >
                      Renvoyer en brouillon
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 text-xs"
                      disabled={isValidating}
                      onClick={() => void handleValidate(q)}
                    >
                      {isValidating ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Valider
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
