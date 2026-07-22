"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import { format, startOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import {
  CalendarDays,
  CheckSquare,
  ClipboardCheck,
  Euro,
  Flag,
  Loader2,
  Percent,
  Receipt,
  RefreshCw,
  Send,
  Target,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

import { type Lead, getStatusConfig } from "../leads/_components/leads-types";

const ACTIVE_STATUSES = ["new", "contacted", "demo_scheduled", "demo_done", "proposal", "negotiation"] as const;

interface Task {
  id: string;
  title: string;
  type: string;
  due_date: string | null;
  lead_id: string | null;
  leads: { company_name: string } | null;
}

interface ObjData {
  target: number;
  achieved: number;
}

interface DashboardData {
  leadsATraiter: number;
  demosPrevu: number;
  propositions: number;
  signatures: number;
  objective: ObjData | null;
  mrrTotal: number;
  caSigne: number;
  tauxConversion: number;
  panierMoyen: number;
  tasks: Task[];
  recentLeads: Lead[];
}

async function loadData(userId: string): Promise<DashboardData> {
  const supabase = createClient();
  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  const monthStart = startOfMonth(now).toISOString();
  const currentMonthStr = format(now, "yyyy-MM");

  const [leadsRes, tasksRes, recentRes, objRes, subsRes, quotesRes] = await Promise.all([
    supabase.from("leads").select("id, status").eq("assigned_to", userId).eq("deleted", false),
    supabase
      .from("lead_tasks")
      .select("id, title, type, due_date, lead_id, leads(company_name)")
      .eq("assigned_to", userId)
      .eq("completed", false)
      .eq("deleted", false)
      .lte("due_date", today)
      .order("due_date", { ascending: true })
      .limit(10),
    supabase
      .from("leads")
      .select("id, company_name, contact_name, status, stage_changed_at")
      .eq("assigned_to", userId)
      .eq("deleted", false)
      .in("status", [...ACTIVE_STATUSES])
      .order("stage_changed_at", { ascending: false, nullsFirst: false })
      .limit(5),
    supabase
      .from("crm_commercial_objectives")
      .select("target_amount, achieved_amount")
      .eq("user_id", userId)
      .filter("month", "eq", currentMonthStr)
      .maybeSingle(),
    supabase.from("crm_subscriptions").select("amount_monthly").eq("status", "active").eq("deleted", false),
    supabase
      .from("crm_quotes")
      .select("total_ttc")
      .eq("status", "signed")
      .eq("created_by", userId)
      .gte("signed_at", monthStart)
      .eq("deleted", false),
  ]);

  const leads = leadsRes.data ?? [];
  const won = leads.filter((l) => l.status === "won").length;
  const lost = leads.filter((l) => l.status === "lost").length;
  const rawQuotes = quotesRes.data ?? [];
  const caSigne = rawQuotes.reduce((s, q) => s + Number(q.total_ttc), 0);
  const obj = objRes.data;

  return {
    leadsATraiter: leads.filter((l) => l.status === "new" || l.status === "contacted").length,
    demosPrevu: leads.filter((l) => l.status === "demo_scheduled").length,
    propositions: leads.filter((l) => l.status === "proposal").length,
    signatures: leads.filter((l) => l.status === "negotiation").length,
    objective: obj ? { target: Number(obj.target_amount), achieved: Number(obj.achieved_amount) } : null,
    mrrTotal: (subsRes.data ?? []).reduce((s, sub) => s + Number(sub.amount_monthly), 0),
    caSigne,
    tauxConversion: won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0,
    panierMoyen: rawQuotes.length > 0 ? Math.round(caSigne / rawQuotes.length) : 0,
    tasks: (tasksRes.data ?? []) as unknown as Task[],
    recentLeads: (recentRes.data ?? []) as unknown as Lead[],
  };
}

function KpiCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-5">
        <div className={`rounded-lg p-2 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-muted-foreground text-sm">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ObjectiveCard({ objective }: { objective: ObjData | null }) {
  const target = objective?.target ?? 0;
  const achieved = objective?.achieved ?? 0;
  const pct = target > 0 ? Math.min(100, Math.round((achieved / target) * 100)) : 0;
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="mb-3 flex items-center gap-3">
          <div className="rounded-lg bg-purple-100 p-2 text-purple-700">
            <Flag className="h-5 w-5" />
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Objectif mensuel</p>
            <p className="text-2xl font-bold">{pct}%</p>
          </div>
        </div>
        <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
          <div className="h-full rounded-full bg-purple-500 transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-muted-foreground mt-1 text-xs">
          {target > 0
            ? `${achieved.toLocaleString("fr-FR")} € / ${target.toLocaleString("fr-FR")} €`
            : "Aucun objectif fixé"}
        </p>
      </CardContent>
    </Card>
  );
}

function IndicatorCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 pt-5">
        <div className="bg-muted rounded-lg p-2">
          <Icon className="text-muted-foreground h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs">{label}</p>
          <p className="text-lg font-bold">{value}</p>
          {sub && <p className="text-muted-foreground text-xs">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function isOverdue(dueDate: string | null) {
  if (!dueDate) return false;
  // `due_date` est un timestamptz (ISO complet) : comparer la partie date, sans concaténer d'heure.
  return dueDate.slice(0, 10) < format(new Date(), "yyyy-MM-dd");
}

/** `due_date` peut être un timestamptz complet OU une date : `new Date()` gère les deux. Garde-fou anti-crash. */
function fmtDueDate(dueDate: string): string {
  const d = new Date(dueDate);
  return Number.isNaN(d.getTime()) ? "" : format(d, "d MMM", { locale: fr });
}

function fmtEur(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

export function CommercialDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const params = useParams<{ locale: string }>();
  const locale = params.locale;

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }
      const result = await loadData(user.id);
      setData(result);
      setIsLoading(false);
    }
    void init();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex flex-col gap-6">
      {/* KPI — pipeline statuts + objectif */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard icon={Target} label="Leads à traiter" value={data.leadsATraiter} color="bg-blue-100 text-blue-700" />
        <KpiCard
          icon={CalendarDays}
          label="Démos prévues"
          value={data.demosPrevu}
          color="bg-violet-100 text-violet-700"
        />
        <KpiCard icon={Send} label="Propositions" value={data.propositions} color="bg-amber-100 text-amber-700" />
        <KpiCard
          icon={ClipboardCheck}
          label="Signatures att."
          value={data.signatures}
          color="bg-orange-100 text-orange-700"
        />
        <ObjectiveCard objective={data.objective} />
      </div>

      {/* Tâches en retard + Pipeline */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckSquare className="h-4 w-4" />
              Tâches à traiter
            </CardTitle>
            <Link href={`/${locale}/commercial/leads`}>
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                Voir les leads
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {data.tasks.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-sm">Aucune tâche en retard</p>
            ) : (
              <ul className="divide-y">
                {data.tasks.map((task) => {
                  const overdue = isOverdue(task.due_date);
                  return (
                    <li key={task.id} className="flex items-center justify-between gap-2 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{task.title}</p>
                        {task.leads && (
                          <p className="text-muted-foreground truncate text-xs">{task.leads.company_name}</p>
                        )}
                      </div>
                      {task.due_date && (
                        <span
                          className={`shrink-0 text-xs font-medium ${overdue ? "text-red-600" : "text-muted-foreground"}`}
                        >
                          {overdue ? "Retard · " : ""}
                          {fmtDueDate(task.due_date)}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4" />
              Pipeline actif
            </CardTitle>
            <Link href={`/${locale}/commercial/leads`}>
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                Voir tout
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentLeads.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-sm">Aucun lead actif</p>
            ) : (
              <ul className="divide-y">
                {data.recentLeads.map((lead) => {
                  const status = getStatusConfig(lead.status);
                  return (
                    <li key={lead.id}>
                      <Link
                        href={`/${locale}/commercial/leads/${lead.id}`}
                        className="hover:bg-muted/50 flex items-center justify-between gap-2 rounded py-2.5 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{lead.company_name}</p>
                          {lead.contact_name && (
                            <p className="text-muted-foreground truncate text-xs">{lead.contact_name}</p>
                          )}
                        </div>
                        <Badge className={`shrink-0 border-0 text-xs ${status.color}`}>{status.label}</Badge>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Indicateurs financiers */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Indicateurs du mois</h2>
          <Link href={`/${locale}/commercial/rapports`}>
            <Button variant="ghost" size="sm" className="h-7 text-xs">
              Voir les rapports →
            </Button>
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <IndicatorCard icon={Euro} label="CA signé ce mois" value={fmtEur(data.caSigne)} />
          <IndicatorCard
            icon={RefreshCw}
            label="MRR prévisionnel"
            value={fmtEur(data.mrrTotal)}
            sub="abonnements actifs"
          />
          <IndicatorCard
            icon={Percent}
            label="Taux de conversion"
            value={`${data.tauxConversion}%`}
            sub="leads won / total closés"
          />
          <IndicatorCard icon={Receipt} label="Panier moyen" value={fmtEur(data.panierMoyen)} sub="devis signés" />
        </div>
      </div>
    </div>
  );
}
