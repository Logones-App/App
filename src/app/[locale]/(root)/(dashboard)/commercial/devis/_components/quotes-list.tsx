"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { FileText, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";

import { CreateQuoteModal } from "./create-quote-modal";
import { type CrmQuote, fmtEur, getQuoteStatusConfig } from "./quotes-types";

const STATUS_TABS = [
  { value: "all", label: "Tous" },
  { value: "draft", label: "Brouillons" },
  { value: "sent", label: "Envoyés" },
  { value: "signed", label: "Signés" },
  { value: "rejected", label: "Refusés" },
];

export function QuotesList() {
  const params = useParams<{ locale: string }>();
  const [quotes, setQuotes] = useState<CrmQuote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);

  async function loadQuotes() {
    const supabase = createClient();
    let q = supabase
      .from("crm_quotes")
      .select("*, leads(company_name), organizations(name)")
      .eq("deleted", false)
      .order("created_at", { ascending: false });
    if (statusFilter !== "all") {
      q = q.eq("status", statusFilter);
    }
    const { data } = await q;
    setQuotes((data ?? []) as unknown as CrmQuote[]);
    setIsLoading(false);
  }

  useEffect(() => {
    setIsLoading(true);
    void loadQuotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function handleDelete(id: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("crm_quotes")
      .update({ deleted: true, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      toast.success("Devis supprimé");
      void loadQuotes();
    }
  }

  function getClientName(quote: CrmQuote) {
    return quote.leads?.company_name ?? quote.organizations?.name ?? "—";
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
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            {STATUS_TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Nouveau devis
        </Button>
      </div>

      {quotes.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed">
          <FileText className="text-muted-foreground h-10 w-10" />
          <p className="text-muted-foreground text-sm">Aucun devis trouvé</p>
          <Button variant="outline" size="sm" onClick={() => setShowCreate(true)}>
            Créer le premier devis
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {quotes.map((quote) => {
            const sc = getQuoteStatusConfig(quote.status);
            return (
              <Card key={quote.id}>
                <CardContent className="flex items-center justify-between gap-4 py-3">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium">{quote.quote_number}</span>
                        <Badge className={`border-0 text-xs ${sc.color}`}>{sc.label}</Badge>
                      </div>
                      <p className="text-muted-foreground truncate text-xs">{getClientName(quote)}</p>
                    </div>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="text-sm font-semibold">{fmtEur(quote.total_ttc)}</p>
                    <p className="text-muted-foreground text-xs">
                      {format(new Date(quote.created_at), "d MMM yyyy", { locale: fr })}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Link href={`/${params.locale}/commercial/devis/${quote.id}`}>
                      <Button variant="outline" size="sm" className="h-7 text-xs">
                        Ouvrir
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground h-7 text-xs hover:text-red-600"
                      onClick={() => void handleDelete(quote.id)}
                    >
                      Suppr.
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CreateQuoteModal open={showCreate} onClose={() => setShowCreate(false)} />
    </>
  );
}
