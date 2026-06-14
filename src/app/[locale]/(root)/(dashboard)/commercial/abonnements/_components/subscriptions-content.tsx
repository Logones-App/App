"use client";

import { useEffect, useState } from "react";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2, Pencil, Plus, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

import { SubscriptionModal } from "./subscription-modal";
import { type CrmSubscription, fmtMrr, getSubscriptionStatus } from "./subscriptions-types";

export function SubscriptionsContent() {
  const [subscriptions, setSubscriptions] = useState<CrmSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<CrmSubscription | null>(null);

  async function loadSubscriptions() {
    const supabase = createClient();
    const { data } = await supabase
      .from("crm_subscriptions")
      .select("*, organizations(name), crm_products(name)")
      .eq("deleted", false)
      .order("status")
      .order("amount_monthly", { ascending: false });
    setSubscriptions((data ?? []) as unknown as CrmSubscription[]);
    setIsLoading(false);
  }

  useEffect(() => {
    void loadSubscriptions();
  }, []);

  function openCreate() {
    setSelected(null);
    setShowModal(true);
  }
  function openEdit(sub: CrmSubscription) {
    setSelected(sub);
    setShowModal(true);
  }

  const activeSubs = subscriptions.filter((s) => s.status === "active");
  const mrrTotal = activeSubs.reduce((sum, s) => sum + Number(s.amount_monthly), 0);

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* MRR résumé */}
      <div className="rounded-lg border bg-gradient-to-r from-green-50 to-emerald-50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm">MRR total (abonnements actifs)</p>
            <p className="text-3xl font-bold text-green-700">{fmtMrr(mrrTotal)}</p>
            <p className="text-muted-foreground text-xs">
              {activeSubs.length} abonnement{activeSubs.length > 1 ? "s" : ""} actif{activeSubs.length > 1 ? "s" : ""}
            </p>
          </div>
          <RefreshCw className="h-8 w-8 text-green-300" />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {subscriptions.length} abonnement{subscriptions.length > 1 ? "s" : ""} au total
        </p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          Nouvel abonnement
        </Button>
      </div>

      {subscriptions.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed">
          <RefreshCw className="text-muted-foreground h-10 w-10" />
          <p className="text-muted-foreground text-sm">Aucun abonnement enregistré</p>
          <Button variant="outline" size="sm" onClick={openCreate}>
            Créer le premier abonnement
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {subscriptions.map((sub) => {
            const sc = getSubscriptionStatus(sub.status);
            return (
              <Card key={sub.id}>
                <CardContent className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{sub.name}</p>
                      <Badge className={`border-0 text-xs ${sc.color}`}>{sc.label}</Badge>
                    </div>
                    <p className="text-muted-foreground truncate text-xs">
                      {sub.organizations?.name ?? "—"} · {sub.commitment_months} mois
                    </p>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="font-semibold text-green-700">{fmtMrr(sub.amount_monthly)}/mois</p>
                    {sub.next_billing_date && (
                      <p className="text-muted-foreground text-xs">
                        Prochaine :{" "}
                        {format(new Date(`${sub.next_billing_date}T00:00:00`), "d MMM yyyy", { locale: fr })}
                      </p>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => openEdit(sub)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <SubscriptionModal
        open={showModal}
        subscription={selected}
        onClose={() => setShowModal(false)}
        onSuccess={() => {
          setShowModal(false);
          void loadSubscriptions();
        }}
      />
    </>
  );
}
