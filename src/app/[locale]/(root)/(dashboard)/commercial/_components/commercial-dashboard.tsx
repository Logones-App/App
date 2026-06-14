"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import { format, startOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertCircle, Building2, CheckSquare, Loader2, Target, TrendingUp } from "lucide-react";

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

interface DashboardData {
  actifs: number;
  gagneCeMois: number;
  clients: number;
  tasks: Task[];
  recentLeads: Lead[];
}

async function loadData(userId: string): Promise<DashboardData> {
  const supabase = createClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const monthStart = startOfMonth(new Date()).toISOString();

  const [leadsRes, tasksRes, orgsRes, recentRes] = await Promise.all([
    supabase.from("leads").select("status, converted_at").eq("assigned_to", userId).eq("deleted", false),
    supabase
      .from("lead_tasks")
      .select("id, title, type, due_date, lead_id, leads(company_name)")
      .eq("assigned_to", userId)
      .eq("completed", false)
      .eq("deleted", false)
      .lte("due_date", today)
      .order("due_date", { ascending: true })
      .limit(10),
    supabase.from("users_organizations").select("id").eq("user_id", userId).eq("deleted", false),
    supabase
      .from("leads")
      .select("id, company_name, contact_name, status, stage_changed_at")
      .eq("assigned_to", userId)
      .eq("deleted", false)
      .in("status", [...ACTIVE_STATUSES])
      .order("stage_changed_at", { ascending: false, nullsFirst: false })
      .limit(5),
  ]);

  const leads = leadsRes.data ?? [];
  const actifs = leads.filter((l) => (ACTIVE_STATUSES as readonly string[]).includes(l.status)).length;
  const gagneCeMois = leads.filter((l) => l.status === "won" && l.converted_at && l.converted_at >= monthStart).length;

  return {
    actifs,
    gagneCeMois,
    clients: (orgsRes.data ?? []).length,
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
      <CardContent className="flex items-center gap-4 pt-6">
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

function isOverdue(dueDate: string | null) {
  if (!dueDate) return false;
  return dueDate < format(new Date(), "yyyy-MM-dd");
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
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Target} label="Leads actifs" value={data.actifs} color="bg-blue-100 text-blue-700" />
        <KpiCard
          icon={TrendingUp}
          label="Gagnés ce mois"
          value={data.gagneCeMois}
          color="bg-green-100 text-green-700"
        />
        <KpiCard icon={Building2} label="Clients assignés" value={data.clients} color="bg-violet-100 text-violet-700" />
        <KpiCard
          icon={AlertCircle}
          label="Tâches en attente"
          value={data.tasks.length}
          color="bg-amber-100 text-amber-700"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tâches en retard / du jour */}
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
              <p className="text-muted-foreground py-4 text-center text-sm">Aucune tâche en attente</p>
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
                          {overdue ? "En retard · " : ""}
                          {format(new Date(`${task.due_date}T00:00:00`), "d MMM", { locale: fr })}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Leads actifs récents */}
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
    </div>
  );
}
