"use client";

import { useEffect, useState } from "react";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CheckCircle2, FileText, Loader2, TrendingUp, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

interface LeadStat {
  status: string;
  count: number;
}

interface SignedQuote {
  id: string;
  quote_number: string;
  total_ttc: number;
  signed_at: string | null;
  leads: { company_name: string | null } | null;
  organizations: { name: string | null } | null;
}

interface Stats {
  totalLeads: number;
  wonLeads: number;
  lostLeads: number;
  byStatus: LeadStat[];
  signedQuotes: SignedQuote[];
  signedMrr: number;
  totalMrr: number;
}

function fmtEur(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

function convRate(won: number, lost: number) {
  const total = won + lost;
  if (total === 0) return "—";
  return `${Math.round((won / total) * 100)} %`;
}

const PIPELINE_LABELS: Record<string, string> = {
  new: "Nouveau",
  contacted: "Contacté",
  demo_scheduled: "Démo prévue",
  proposal: "Proposition",
  negotiation: "Négociation",
  won: "Gagné",
  lost: "Perdu",
};

const PIPELINE_COLORS: Record<string, string> = {
  new: "bg-slate-100 text-slate-700",
  contacted: "bg-blue-100 text-blue-700",
  demo_scheduled: "bg-violet-100 text-violet-700",
  proposal: "bg-amber-100 text-amber-700",
  negotiation: "bg-orange-100 text-orange-700",
  won: "bg-green-100 text-green-700",
  lost: "bg-red-100 text-red-700",
};

function getPipelineColor(status: string) {
  return Object.prototype.hasOwnProperty.call(PIPELINE_COLORS, status)
    ? PIPELINE_COLORS[status]
    : "bg-gray-100 text-gray-700";
}

function getPipelineLabel(status: string) {
  return Object.prototype.hasOwnProperty.call(PIPELINE_LABELS, status) ? PIPELINE_LABELS[status] : status;
}

export function RapportsContent() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [leadsRes, quotesRes, subsRes] = await Promise.all([
        supabase.from("leads").select("status").eq("deleted", false),
        supabase
          .from("crm_quotes")
          .select("id, quote_number, total_ttc, signed_at, leads(company_name), organizations(name)")
          .eq("status", "signed")
          .eq("deleted", false)
          .order("signed_at", { ascending: false })
          .limit(10),
        supabase.from("crm_subscriptions").select("amount_monthly, status").eq("deleted", false),
      ]);

      const leads = (leadsRes.data ?? []) as { status: string }[];
      const byStatus = Object.entries(
        leads.reduce<Record<string, number>>((acc, l) => ({ ...acc, [l.status]: (acc[l.status] ?? 0) + 1 }), {}),
      ).map(([status, count]) => ({ status, count }));

      const quotes = (quotesRes.data ?? []) as unknown as SignedQuote[];
      const signedTotal = quotes.reduce((s, q) => s + Number(q.total_ttc), 0);
      const subs = (subsRes.data ?? []) as { amount_monthly: number; status: string }[];
      const totalMrr = subs.filter((s) => s.status === "active").reduce((s, sub) => s + Number(sub.amount_monthly), 0);

      setStats({
        totalLeads: leads.length,
        wonLeads: leads.filter((l) => l.status === "won").length,
        lostLeads: leads.filter((l) => l.status === "lost").length,
        byStatus,
        signedQuotes: quotes,
        signedMrr: signedTotal,
        totalMrr,
      });
      setIsLoading(false);
    }
    void load();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Users className="text-muted-foreground h-4 w-4" />
              <p className="text-muted-foreground text-xs">Total leads</p>
            </div>
            <p className="mt-1 text-2xl font-bold">{stats.totalLeads}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <p className="text-muted-foreground text-xs">Convertis</p>
            </div>
            <p className="mt-1 text-2xl font-bold text-green-600">{stats.wonLeads}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <p className="text-muted-foreground text-xs">Taux de conversion</p>
            </div>
            <p className="mt-1 text-2xl font-bold">{convRate(stats.wonLeads, stats.lostLeads)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-500" />
              <p className="text-muted-foreground text-xs">MRR actif</p>
            </div>
            <p className="mt-1 text-2xl font-bold text-purple-600">{fmtEur(stats.totalMrr)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pipeline par statut</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.byStatus
              .sort((a, b) => b.count - a.count)
              .map(({ status, count }) => (
                <div key={status} className="flex items-center justify-between">
                  <Badge className={`border-0 text-xs ${getPipelineColor(status)}`}>{getPipelineLabel(status)}</Badge>
                  <span className="text-sm font-medium">{count}</span>
                </div>
              ))}
            {stats.byStatus.length === 0 && (
              <p className="text-muted-foreground py-4 text-center text-sm">Aucune donnée</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Devis signés récents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.signedQuotes.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-sm">Aucun devis signé</p>
            ) : (
              stats.signedQuotes.map((q) => (
                <div key={q.id} className="flex items-center justify-between py-1">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs">{q.quote_number}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {q.leads?.company_name ?? q.organizations?.name ?? "—"}
                    </p>
                  </div>
                  <div className="ml-3 shrink-0 text-right">
                    <p className="text-sm font-semibold text-green-600">{fmtEur(q.total_ttc)}</p>
                    {q.signed_at && (
                      <p className="text-muted-foreground text-xs">
                        {format(new Date(q.signed_at), "d MMM", { locale: fr })}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
