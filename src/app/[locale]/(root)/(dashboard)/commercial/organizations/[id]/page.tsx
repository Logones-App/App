"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft, Building2, ExternalLink, Loader2, MessageSquare, Phone, Trophy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/supabase/database.types";

import { type Lead, getStatusConfig } from "../../leads/_components/leads-types";

type OrgWithEstablishments = Tables<"organizations"> & {
  establishments: Tables<"establishments">[];
};

interface Activity {
  id: string;
  type: string;
  title: string | null;
  content: string | null;
  created_at: string;
  lead_id: string;
  lead_company: string;
}

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  call: Phone,
  email: MessageSquare,
  meeting: Building2,
  note: MessageSquare,
};

function ActivityIcon({ type }: { type: string }) {
  // eslint-disable-next-line security/detect-object-injection
  const Icon = ACTIVITY_ICONS[type] ?? MessageSquare;
  return <Icon className="text-muted-foreground mt-0.5 h-3.5 w-3.5 shrink-0" />;
}

async function loadOrgData(id: string) {
  const supabase = createClient();
  const [orgRes, leadsRes] = await Promise.all([
    supabase.from("organizations").select("*, establishments(*)").eq("id", id).eq("deleted", false).maybeSingle(),
    supabase
      .from("leads")
      .select("id, company_name, contact_name, status, converted_at")
      .eq("converted_org_id", id)
      .eq("deleted", false)
      .order("converted_at", { ascending: false }),
  ]);

  const linkedLeads = (leadsRes.data ?? []) as unknown as Lead[];

  let activities: Activity[] = [];
  if (linkedLeads.length > 0) {
    const leadIds = linkedLeads.map((l) => l.id);
    const { data: acts } = await supabase
      .from("lead_activities")
      .select("id, type, title, content, created_at, lead_id")
      .in("lead_id", leadIds)
      .eq("deleted", false)
      .order("created_at", { ascending: false })
      .limit(10);

    const leadMap = new Map(linkedLeads.map((l) => [l.id, l.company_name]));
    activities = (
      (acts ?? []) as {
        id: string;
        type: string;
        title: string | null;
        content: string | null;
        created_at: string;
        lead_id: string;
      }[]
    ).map((a) => ({
      ...a,
      lead_company: leadMap.get(a.lead_id) ?? "",
    }));
  }

  return {
    org: orgRes.data as OrgWithEstablishments | null,
    linkedLeads,
    activities,
  };
}

export default function CommercialOrganizationDetailPage() {
  const params = useParams<{ locale: string; id: string }>();
  const { locale, id } = params;
  const [org, setOrg] = useState<OrgWithEstablishments | null>(null);
  const [linkedLeads, setLinkedLeads] = useState<Lead[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const result = await loadOrgData(id);
      setOrg(result.org);
      setLinkedLeads(result.linkedLeads);
      setActivities(result.activities);
      setIsLoading(false);
    }
    void init();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2">
        <p className="text-muted-foreground text-sm">Organisation introuvable</p>
        <Link href={`/${locale}/commercial/organizations`}>
          <Button variant="outline" size="sm">
            Retour
          </Button>
        </Link>
      </div>
    );
  }

  const activeEstablishments = org.establishments.filter((e) => !e.deleted);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/${locale}/commercial/organizations`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{org.name}</h1>
          <p className="text-muted-foreground text-sm">
            Client depuis {org.created_at ? format(new Date(org.created_at), "MMMM yyyy", { locale: fr }) : "—"}
          </p>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Informations</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="text-muted-foreground">{org.description ?? "Aucune description"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Résumé</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Établissements actifs</span>
              <span className="font-medium">{activeEstablishments.length}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Leads liés</span>
              <span className="font-medium">{linkedLeads.length}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Créée le</span>
              <span className="font-medium">
                {org.created_at ? format(new Date(org.created_at), "dd/MM/yyyy", { locale: fr }) : "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Administration</CardTitle>
            <CardDescription className="text-xs">Accès complet à la gestion</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/${locale}/admin/organizations/${org.id}/establishments`} target="_blank">
              <Button variant="outline" size="sm" className="w-full">
                <ExternalLink className="mr-2 h-4 w-4" />
                Ouvrir dans l&apos;admin
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Établissements */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Établissements ({activeEstablishments.length})</h2>
        {activeEstablishments.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aucun établissement</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeEstablishments.map((est) => (
              <Card key={est.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 shrink-0" />
                    {est.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground space-y-1 text-xs">
                  {est.address && <p>{est.address}</p>}
                  {est.phone && <p>{est.phone}</p>}
                  {est.email && <p>{est.email}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Leads liés + Activités */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Leads */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-green-600" />
              Leads convertis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {linkedLeads.length === 0 ? (
              <p className="text-muted-foreground py-2 text-sm">Aucun lead lié</p>
            ) : (
              <ul className="divide-y">
                {linkedLeads.map((lead) => {
                  const status = getStatusConfig(lead.status);
                  return (
                    <li key={lead.id} className="py-2.5">
                      <Link
                        href={`/${locale}/commercial/leads/${lead.id}`}
                        className="hover:text-primary flex items-center justify-between gap-2 transition-colors"
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

        {/* Activités récentes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4" />
              Activités récentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <p className="text-muted-foreground py-2 text-sm">Aucune activité</p>
            ) : (
              <ul className="space-y-3">
                {activities.map((act) => (
                  <li key={act.id} className="flex items-start gap-2 text-sm">
                    <ActivityIcon type={act.type} />
                    <div className="min-w-0 flex-1">
                      <p className="leading-tight font-medium">{act.title ?? act.type}</p>
                      {act.content && (
                        <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">{act.content}</p>
                      )}
                      <p className="text-muted-foreground mt-1 text-xs">
                        {act.lead_company} · {format(new Date(act.created_at), "d MMM yyyy", { locale: fr })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
