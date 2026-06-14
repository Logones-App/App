"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { addMonths, format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft, CheckCircle2, Clock, Loader2, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";

import {
  type CrmInstallment,
  type CrmPreInvoice,
  computePreInvoiceStatus,
  fmtEurPi,
  getPreInvoiceStatus,
} from "../../_components/pre-invoices-types";

interface Props {
  id: string;
  locale: string;
}

function InstallmentRow({ inst, onMarkPaid }: { inst: CrmInstallment; onMarkPaid: (id: string) => void }) {
  const isPaid = inst.status === "paid";
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{inst.label}</p>
        <p className="text-muted-foreground text-xs">
          Échéance : {format(new Date(`${inst.due_date}T00:00:00`), "d MMM yyyy", { locale: fr })}
          {isPaid && inst.paid_at && (
            <span className="ml-2 text-green-600">
              · Payé le {format(new Date(inst.paid_at), "d MMM yyyy", { locale: fr })}
            </span>
          )}
        </p>
      </div>
      <span className="shrink-0 text-sm font-semibold">{fmtEurPi(inst.amount)}</span>
      <div className="shrink-0">
        {isPaid ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : (
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onMarkPaid(inst.id)}>
            <Clock className="mr-1 h-3 w-3" />
            Marquer payé
          </Button>
        )}
      </div>
    </div>
  );
}

export function PreInvoiceDetail({ id, locale }: Props) {
  const router = useRouter();
  const [pi, setPi] = useState<CrmPreInvoice | null>(null);
  const [installments, setInstallments] = useState<CrmInstallment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newLabel, setNewLabel] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDate, setNewDate] = useState("");

  async function loadData() {
    const supabase = createClient();
    const [piRes, instRes] = await Promise.all([
      supabase
        .from("crm_pre_invoices")
        .select("*, leads(company_name), organizations(name)")
        .eq("id", id)
        .eq("deleted", false)
        .single(),
      supabase.from("crm_pre_invoice_installments").select("*").eq("pre_invoice_id", id).order("due_date"),
    ]);
    const p = piRes.data as unknown as CrmPreInvoice | null;
    if (!p) {
      router.push(`/${locale}/commercial/pre-facturation`);
      return;
    }
    setPi(p);
    setInstallments((instRes.data ?? []) as unknown as CrmInstallment[]);
    setIsLoading(false);
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleMarkPaid(instId: string) {
    const supabase = createClient();
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("crm_pre_invoice_installments")
      .update({ status: "paid", paid_at: now })
      .eq("id", instId);
    if (error) {
      toast.error("Erreur lors de la mise à jour");
      return;
    }
    const updated = installments.map((i) => (i.id === instId ? { ...i, status: "paid" as const, paid_at: now } : i));
    setInstallments(updated);
    const newStatus = computePreInvoiceStatus(updated);
    await supabase.from("crm_pre_invoices").update({ status: newStatus }).eq("id", id);
    setPi((prev) => (prev ? { ...prev, status: newStatus } : prev));
  }

  async function handleAddInstallment() {
    const amount = parseFloat(newAmount);
    if (!newLabel.trim() || isNaN(amount) || !newDate) {
      toast.error("Libellé, montant et date requis");
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.from("crm_pre_invoice_installments").insert({
      pre_invoice_id: id,
      label: newLabel.trim(),
      amount,
      due_date: newDate,
      status: "pending",
    });
    if (error) {
      toast.error("Erreur lors de l'ajout");
      return;
    }
    setNewLabel("");
    setNewAmount("");
    setNewDate("");
    void loadData();
  }

  async function handleGenerateInstallments() {
    if (!pi) return;
    const supabase = createClient();
    await supabase.from("crm_pre_invoice_installments").delete().eq("pre_invoice_id", id);
    const today = new Date();
    const acompte = pi.deposit_amount ?? 0;
    const rows: { pre_invoice_id: string; label: string; amount: number; due_date: string; status: string }[] = [];
    if (acompte > 0) {
      rows.push({
        pre_invoice_id: id,
        label: "Acompte",
        amount: acompte,
        due_date: format(today, "yyyy-MM-dd"),
        status: "pending",
      });
    }
    for (let m = 1; m <= pi.commitment_months; m++) {
      rows.push({
        pre_invoice_id: id,
        label: `Mensualité M+${m}`,
        amount: pi.mrr > 0 ? pi.mrr : Math.round(((pi.total_ttc - acompte) / pi.commitment_months) * 100) / 100,
        due_date: format(addMonths(today, m), "yyyy-MM-dd"),
        status: "pending",
      });
    }
    const { error } = await supabase.from("crm_pre_invoice_installments").insert(rows);
    if (error) {
      toast.error("Erreur lors de la génération");
      return;
    }
    toast.success("Échéancier généré");
    void loadData();
  }

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!pi) return null;

  const sc = getPreInvoiceStatus(pi.status);
  const clientName = pi.leads?.company_name ?? pi.organizations?.name ?? "—";
  const paid = installments.filter((i) => i.status === "paid").length;
  const pct = installments.length > 0 ? Math.round((paid / installments.length) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="mt-0.5 shrink-0"
          onClick={() => router.push(`/${locale}/commercial/pre-facturation`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-mono text-xl font-bold">{pi.pre_invoice_number}</h1>
            <Badge className={`border-0 ${sc.color}`}>{sc.label}</Badge>
          </div>
          <p className="text-muted-foreground text-sm">{clientName}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Échéancier */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Échéancier</CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => void handleGenerateInstallments()}
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Générer auto
              </Button>
            </CardHeader>
            <CardContent>
              {installments.length === 0 ? (
                <p className="text-muted-foreground py-4 text-center text-sm">
                  Aucune échéance — cliquez sur &quot;Générer auto&quot;
                </p>
              ) : (
                <div className="divide-y">
                  {installments.map((inst) => (
                    <InstallmentRow key={inst.id} inst={inst} onMarkPaid={(instId) => void handleMarkPaid(instId)} />
                  ))}
                </div>
              )}

              {/* Ajouter manuellement */}
              <div className="mt-4 grid grid-cols-[1fr_80px_120px_auto] gap-2 border-t pt-3">
                <Input
                  placeholder="Libellé"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="text-sm"
                />
                <Input
                  type="number"
                  placeholder="Montant"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="text-sm"
                />
                <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="text-sm" />
                <Button size="sm" onClick={() => void handleAddInstallment()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panneau droit */}
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-3 pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total TTC</span>
                <span className="font-semibold">{fmtEurPi(pi.total_ttc)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">MRR mensuel</span>
                <span className="font-semibold">{fmtEurPi(pi.mrr)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Engagement</span>
                <span className="font-semibold">{pi.commitment_months} mois</span>
              </div>
              <Separator />
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-muted-foreground">Encaissements</span>
                  <span>
                    {paid}/{installments.length} ({pct}%)
                  </span>
                </div>
                <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                  <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
