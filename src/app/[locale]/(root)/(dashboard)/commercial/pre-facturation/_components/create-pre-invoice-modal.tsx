"use client";

import { useEffect, useState } from "react";

import { useParams, useRouter } from "next/navigation";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface QuoteLine {
  price_type: "monthly" | "one_time";
  total_ht: number;
}

interface QuoteOption {
  id: string;
  label: string;
  vatRate: number;
  leadId: string | null;
  orgId: string | null;
  lines: QuoteLine[];
}

function fmtEur(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });
}

function computeTotals(lines: QuoteLine[], months: number, vatRate: number) {
  const mrr = lines.filter((l) => l.price_type === "monthly").reduce((s, l) => s + l.total_ht, 0);
  const oneTime = lines.filter((l) => l.price_type === "one_time").reduce((s, l) => s + l.total_ht, 0);
  const totalHt = Math.round((mrr * months + oneTime) * 100) / 100;
  const totalTtc = Math.round(totalHt * (1 + vatRate / 100) * 100) / 100;
  return { mrr, oneTime, totalHt, totalTtc };
}

export function CreatePreInvoiceModal({ open, onClose }: Props) {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const [quotes, setQuotes] = useState<QuoteOption[]>([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState("");
  const [commitmentMonths, setCommitmentMonths] = useState("12");
  const [manualMrr, setManualMrr] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedQuoteId("");
    setManualMrr("");
    setCommitmentMonths("12");
    setIsLoading(true);
    const supabase = createClient();
    void supabase
      .from("crm_quotes")
      .select("id, quote_number, vat_rate, lead_id, org_id")
      .eq("status", "signed")
      .eq("deleted", false)
      .order("signed_at", { ascending: false })
      .then(({ data }) => {
        setQuotes(
          (data ?? []).map((q) => ({
            id: q.id,
            label: q.quote_number,
            vatRate: q.vat_rate,
            leadId: q.lead_id,
            orgId: q.org_id,
            lines: [],
          })),
        );
        setIsLoading(false);
      });
  }, [open]);

  useEffect(() => {
    if (!selectedQuoteId) return;
    const supabase = createClient();
    void supabase
      .from("crm_quote_items")
      .select("price_type, total_ht")
      .eq("quote_id", selectedQuoteId)
      .then(({ data }) => {
        setQuotes((prev) =>
          prev.map((q) => (q.id === selectedQuoteId ? { ...q, lines: (data ?? []) as QuoteLine[] } : q)),
        );
      });
  }, [selectedQuoteId]);

  const months = parseInt(commitmentMonths, 10) || 0;
  const selectedQuote = quotes.find((q) => q.id === selectedQuoteId);
  const computed = selectedQuote ? computeTotals(selectedQuote.lines, months, selectedQuote.vatRate) : null;
  const mrrDisplay = computed ? computed.mrr : parseFloat(manualMrr) || 0;
  const totalHt = computed ? computed.totalHt : Math.round(mrrDisplay * months * 100) / 100;
  const totalTtc = computed ? computed.totalTtc : Math.round(totalHt * 1.2 * 100) / 100;

  async function handleCreate() {
    if (!months || months < 1) {
      toast.error("Durée d'engagement invalide");
      return;
    }
    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("crm_pre_invoices")
        .insert({
          quote_id: selectedQuoteId || null,
          lead_id: selectedQuote?.leadId ?? null,
          org_id: selectedQuote?.orgId ?? null,
          status: "pending",
          total_ht: totalHt,
          total_ttc: totalTtc,
          commitment_months: months,
          mrr: mrrDisplay,
          created_by: user?.id ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      toast.success("Pré-facture créée");
      onClose();
      router.push(`/${params.locale}/commercial/pre-facturation/${data.id}`);
    } catch {
      toast.error("Erreur lors de la création");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle pré-facture</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label>Devis signé (optionnel)</Label>
            {isLoading ? (
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement…
              </div>
            ) : (
              <Select value={selectedQuoteId} onValueChange={setSelectedQuoteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un devis…" />
                </SelectTrigger>
                <SelectContent>
                  {quotes.map((q) => (
                    <SelectItem key={q.id} value={q.id}>
                      {q.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Durée d&apos;engagement (mois)</Label>
            <Input
              type="number"
              min="1"
              value={commitmentMonths}
              onChange={(e) => setCommitmentMonths(e.target.value)}
            />
          </div>

          {!selectedQuoteId && (
            <div className="space-y-1.5">
              <Label>MRR mensuel (€)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={manualMrr}
                onChange={(e) => setManualMrr(e.target.value)}
                placeholder="0.00"
              />
            </div>
          )}

          {/* Récap calcul */}
          <div className="bg-muted/40 rounded-lg border p-3 text-sm">
            {computed && computed.mrr > 0 && (
              <div className="text-muted-foreground mb-2 space-y-1">
                <div className="flex justify-between">
                  <span>
                    MRR ({fmtEur(computed.mrr)}/mois × {months} mois)
                  </span>
                  <span>{fmtEur(computed.mrr * months)}</span>
                </div>
                {computed.oneTime > 0 && (
                  <div className="flex justify-between">
                    <span>Frais uniques</span>
                    <span>{fmtEur(computed.oneTime)}</span>
                  </div>
                )}
                <Separator className="my-1" />
              </div>
            )}
            <div className="flex justify-between font-medium">
              <span>Total HT</span>
              <span>{fmtEur(totalHt)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Total TTC</span>
              <span>{fmtEur(totalTtc)}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button onClick={handleCreate} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
