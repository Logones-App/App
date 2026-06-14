"use client";

import { useEffect, useState } from "react";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";

import { type CrmSubscription, SUBSCRIPTION_STATUSES } from "./subscriptions-types";

interface Props {
  open: boolean;
  subscription?: CrmSubscription | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface Option {
  id: string;
  name: string;
}

export function SubscriptionModal({ open, subscription, onClose, onSuccess }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [orgs, setOrgs] = useState<Option[]>([]);
  const [products, setProducts] = useState<Option[]>([]);
  const [form, setForm] = useState({
    org_id: "",
    product_id: "",
    name: "",
    amount_monthly: "",
    status: "active",
    start_date: new Date().toISOString().split("T")[0],
    next_billing_date: "",
    commitment_months: "12",
    notes: "",
  });

  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    void Promise.all([
      supabase.from("organizations").select("id, name").eq("deleted", false).order("name"),
      supabase
        .from("crm_products")
        .select("id, name, unit_price")
        .eq("is_active", true)
        .eq("deleted", false)
        .order("name"),
    ]).then(([orgsRes, prodRes]) => {
      setOrgs((orgsRes.data ?? []).map((o) => ({ id: o.id, name: o.name })));
      setProducts((prodRes.data ?? []).map((p) => ({ id: p.id, name: p.name })));
    });
    setForm({
      org_id: subscription?.org_id ?? "",
      product_id: subscription?.product_id ?? "",
      name: subscription?.name ?? "",
      amount_monthly: subscription ? String(subscription.amount_monthly) : "",
      status: subscription?.status ?? "active",
      start_date: subscription?.start_date ?? new Date().toISOString().split("T")[0],
      next_billing_date: subscription?.next_billing_date ?? "",
      commitment_months: subscription ? String(subscription.commitment_months) : "12",
      notes: subscription?.notes ?? "",
    });
  }, [open, subscription]);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    if (!form.org_id || !form.name.trim()) {
      toast.error("Organisation et nom requis");
      return;
    }
    setIsLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const payload = {
        org_id: form.org_id,
        product_id: form.product_id || null,
        name: form.name.trim(),
        amount_monthly: parseFloat(form.amount_monthly) || 0,
        status: form.status,
        start_date: form.start_date,
        next_billing_date: form.next_billing_date || null,
        commitment_months: parseInt(form.commitment_months, 10) || 12,
        notes: form.notes.trim() || null,
        updated_at: new Date().toISOString(),
      };
      const { error } = subscription
        ? await supabase.from("crm_subscriptions").update(payload).eq("id", subscription.id)
        : await supabase.from("crm_subscriptions").insert({ ...payload, created_by: user?.id ?? null });
      if (error) throw error;
      toast.success(subscription ? "Abonnement mis à jour" : "Abonnement créé");
      onSuccess();
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="flex max-h-[90vh] max-w-md flex-col gap-4 overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{subscription ? "Modifier l'abonnement" : "Nouvel abonnement"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label>Organisation *</Label>
            <Select value={form.org_id} onValueChange={(v) => set("org_id", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner…" />
              </SelectTrigger>
              <SelectContent>
                {orgs.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Produit (optionnel)</Label>
            <Select
              value={form.product_id}
              onValueChange={(v) => {
                set("product_id", v);
                const p = products.find((x) => x.id === v);
                if (p && !form.name) set("name", p.name);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Aucun" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Nom *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>MRR (€/mois)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.amount_monthly}
                onChange={(e) => set("amount_monthly", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Engagement (mois)</Label>
              <Input
                type="number"
                min="1"
                value={form.commitment_months}
                onChange={(e) => set("commitment_months", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Début</Label>
              <Input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Prochaine facture</Label>
              <Input
                type="date"
                value={form.next_billing_date}
                onChange={(e) => set("next_billing_date", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Statut</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUBSCRIPTION_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {subscription ? "Mettre à jour" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
