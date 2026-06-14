"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2, Plus, Receipt } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

import { CreatePreInvoiceModal } from "./create-pre-invoice-modal";
import { type CrmPreInvoice, fmtEurPi, getPreInvoiceStatus } from "./pre-invoices-types";

export function PreInvoicesList() {
  const params = useParams<{ locale: string }>();
  const [preInvoices, setPreInvoices] = useState<CrmPreInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  async function loadPreInvoices() {
    const supabase = createClient();
    const { data } = await supabase
      .from("crm_pre_invoices")
      .select("*, leads(company_name), organizations(name)")
      .eq("deleted", false)
      .order("created_at", { ascending: false });
    setPreInvoices((data ?? []) as unknown as CrmPreInvoice[]);
    setIsLoading(false);
  }

  useEffect(() => {
    void loadPreInvoices();
  }, []);

  function getClientName(pi: CrmPreInvoice) {
    return pi.leads?.company_name ?? pi.organizations?.name ?? "—";
  }

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {preInvoices.length} pré-facture{preInvoices.length > 1 ? "s" : ""}
        </p>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Nouvelle pré-facture
        </Button>
      </div>

      {preInvoices.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed">
          <Receipt className="text-muted-foreground h-10 w-10" />
          <p className="text-muted-foreground text-sm">Aucune pré-facture</p>
          <Button variant="outline" size="sm" onClick={() => setShowCreate(true)}>
            Créer la première pré-facture
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {preInvoices.map((pi) => {
            const sc = getPreInvoiceStatus(pi.status);
            return (
              <Card key={pi.id}>
                <CardContent className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">{pi.pre_invoice_number}</span>
                      <Badge className={`border-0 text-xs ${sc.color}`}>{sc.label}</Badge>
                    </div>
                    <p className="text-muted-foreground truncate text-xs">{getClientName(pi)}</p>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="text-sm font-semibold">{fmtEurPi(pi.total_ttc)}</p>
                    <p className="text-muted-foreground text-xs">
                      MRR : {fmtEurPi(pi.mrr)} · {pi.commitment_months} mois
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {format(new Date(pi.created_at), "d MMM yyyy", { locale: fr })}
                    </p>
                  </div>
                  <Link href={`/${params.locale}/commercial/pre-facturation/${pi.id}`}>
                    <Button variant="outline" size="sm" className="h-7 shrink-0 text-xs">
                      Ouvrir
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CreatePreInvoiceModal open={showCreate} onClose={() => setShowCreate(false)} />
    </>
  );
}
