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
import { createClient } from "@/lib/supabase/client";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Option {
  id: string;
  label: string;
  totalTtc?: number;
  leadId?: string | null;
  orgId?: string | null;
}

export function CreatePreInvoiceModal({ open, onClose }: Props) {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const [quotes, setQuotes] = useState<Option[]>([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState("");
  const [commitmentMonths, setCommitmentMonths] = useState("12");
  const [mrr, setMrr] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedQuoteId("");
    setMrr("");
    setCommitmentMonths("12");
    setIsLoading(true);
    const supabase = createClient();
    void supabase
      .from("crm_quotes")
      .select("id, quote_number, total_ttc, lead_id, org_id")
      .eq("status", "signed")
      .eq("deleted", false)
      .order("signed_at", { ascending: false })
      .then(({ data }) => {
        setQuotes(
          (data ?? []).map((q) => ({
            id: q.id,
            label: `${q.quote_number} — ${Number(q.total_ttc).toLocaleString("fr-FR")} € TTC`,
            totalTtc: Number(q.total_ttc),
            leadId: q.lead_id,
            orgId: q.org_id,
          })),
        );
        setIsLoading(false);
      });
  }, [open]);

  async function handleCreate() {
    const months = parseInt(commitmentMonths, 10);
    const mrrVal = mrr ? parseFloat(mrr) : 0;
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
      const selectedQuote = quotes.find((q) => q.id === selectedQuoteId);
      const totalTtc = selectedQuote?.totalTtc ?? 0;
      const totalHt = Math.round((totalTtc / 1.2) * 100) / 100;
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
          mrr: mrrVal,
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Durée d&apos;engagement (mois)</Label>
              <Input
                type="number"
                min="1"
                value={commitmentMonths}
                onChange={(e) => setCommitmentMonths(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>MRR mensuel (€)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={mrr}
                onChange={(e) => setMrr(e.target.value)}
                placeholder="0.00"
              />
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
