"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft, Building2, CheckSquare, Globe, Loader2, Mail, MapPin, Phone, User } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";

import { type Lead, LEAD_STATUSES, getStatusConfig } from "../../_components/leads-types";

import { ActivityFeed } from "./activity-feed";
import { AddActivityModal } from "./add-activity-modal";
import { AddTaskModal } from "./add-task-modal";
import { TaskList } from "./task-list";

interface LeadActivity {
  id: string;
  type: string;
  title: string | null;
  content: string | null;
  duration_minutes: number | null;
  meeting_url: string | null;
  email_to: string | null;
  email_subject: string | null;
  created_by: string | null;
  created_at: string;
  creator_profile?: { full_name: string | null } | null;
}

interface LeadTask {
  id: string;
  type: string;
  title: string;
  due_date: string | null;
  assigned_to: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  assignee_profile?: { full_name: string | null } | null;
}

interface Props {
  id: string;
  locale: string;
}

export function LeadDetail({ id, locale }: Props) {
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [tasks, setTasks] = useState<LeadTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);

  async function loadLead() {
    const supabase = createClient();
    const { data } = await supabase.from("leads").select("*").eq("id", id).eq("deleted", false).single();
    setLead(data as unknown as Lead | null);
  }

  async function loadActivities() {
    const supabase = createClient();
    const { data } = await supabase
      .from("lead_activities")
      .select("*")
      .eq("lead_id", id)
      .eq("deleted", false)
      .order("created_at", { ascending: false });
    setActivities((data ?? []) as unknown as LeadActivity[]);
  }

  async function loadTasks() {
    const supabase = createClient();
    const { data } = await supabase
      .from("lead_tasks")
      .select("*")
      .eq("lead_id", id)
      .eq("deleted", false)
      .order("due_date", { ascending: true });
    setTasks((data ?? []) as unknown as LeadTask[]);
  }

  async function loadAll() {
    await Promise.all([loadLead(), loadActivities(), loadTasks()]);
    setIsLoading(false);
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleStatusChange(status: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("leads")
      .update({ status, stage_changed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error("Impossible de changer le statut");
    } else {
      void loadLead();
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2">
        <p className="text-muted-foreground">Lead introuvable</p>
        <Button variant="ghost" size="sm" onClick={() => router.push(`/${locale}/commercial/leads`)}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Retour
        </Button>
      </div>
    );
  }

  const status = getStatusConfig(lead.status);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="mt-0.5 shrink-0"
            onClick={() => router.push(`/${locale}/commercial/leads`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{lead.company_name}</h1>
            <p className="text-muted-foreground text-sm">
              Lead créé le {format(new Date(lead.created_at), "d MMMM yyyy", { locale: fr })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={lead.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-44">
              <Badge className={`border-0 ${status.color}`}>{status.label}</Badge>
            </SelectTrigger>
            <SelectContent>
              {LEAD_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  <Badge className={`border-0 ${s.color}`}>{s.label}</Badge>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Colonne gauche : infos */}
        <div className="flex flex-col gap-4 lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {lead.contact_name && (
                <div className="flex items-center gap-2">
                  <User className="text-muted-foreground h-4 w-4 shrink-0" />
                  <span>{lead.contact_name}</span>
                </div>
              )}
              {lead.contact_email && (
                <div className="flex items-center gap-2">
                  <Mail className="text-muted-foreground h-4 w-4 shrink-0" />
                  <a href={`mailto:${lead.contact_email}`} className="text-primary hover:underline">
                    {lead.contact_email}
                  </a>
                </div>
              )}
              {lead.contact_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="text-muted-foreground h-4 w-4 shrink-0" />
                  <a href={`tel:${lead.contact_phone}`} className="hover:underline">
                    {lead.contact_phone}
                  </a>
                </div>
              )}
              {lead.city && (
                <div className="flex items-center gap-2">
                  <MapPin className="text-muted-foreground h-4 w-4 shrink-0" />
                  <span>{lead.city}</span>
                </div>
              )}
              {lead.sector && (
                <div className="flex items-center gap-2">
                  <Building2 className="text-muted-foreground h-4 w-4 shrink-0" />
                  <span>{lead.sector}</span>
                </div>
              )}
              {lead.website && (
                <div className="flex items-center gap-2">
                  <Globe className="text-muted-foreground h-4 w-4 shrink-0" />
                  <a
                    href={lead.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary truncate hover:underline"
                  >
                    {lead.website.replace(/^https?:\/\//, "")}
                  </a>
                </div>
              )}
              {lead.notes && (
                <div className="border-t pt-2">
                  <p className="text-muted-foreground text-xs whitespace-pre-wrap">{lead.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tâches */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-1.5 text-base">
                <CheckSquare className="h-4 w-4" />
                Tâches
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowAddTask(true)}>
                + Ajouter
              </Button>
            </CardHeader>
            <CardContent>
              <TaskList tasks={tasks} onRefresh={loadTasks} />
            </CardContent>
          </Card>
        </div>

        {/* Colonne droite : activités */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Historique</CardTitle>
              <Button size="sm" onClick={() => setShowAddActivity(true)}>
                + Activité
              </Button>
            </CardHeader>
            <CardContent>
              <ActivityFeed activities={activities} lead={lead} onRefresh={loadActivities} />
            </CardContent>
          </Card>
        </div>
      </div>

      <AddActivityModal
        open={showAddActivity}
        leadId={id}
        leadEmail={lead.contact_email}
        onClose={() => setShowAddActivity(false)}
        onSuccess={() => {
          setShowAddActivity(false);
          void loadActivities();
        }}
      />

      <AddTaskModal
        open={showAddTask}
        leadId={id}
        onClose={() => setShowAddTask(false)}
        onSuccess={() => {
          setShowAddTask(false);
          void loadTasks();
        }}
      />
    </div>
  );
}
