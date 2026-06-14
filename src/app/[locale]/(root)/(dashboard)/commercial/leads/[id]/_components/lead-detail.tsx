"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowLeft,
  Building2,
  ExternalLink,
  FileText,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Monitor,
  Pencil,
  Phone,
  User,
  Users,
  Utensils,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";

import { type Lead, LEAD_STATUSES, getStatusConfig } from "../../_components/leads-types";

import { ActivityFeed } from "./activity-feed";
import { AddActivityModal } from "./add-activity-modal";
import { AddNoteModal } from "./add-note-modal";
import { AddTaskModal } from "./add-task-modal";
import { ConvertLeadWizard } from "./convert-lead-modal";
import { EditLeadModal } from "./edit-lead-modal";
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

function QualificationSection({ lead }: { lead: Lead }) {
  if (!lead.current_software && lead.employees_count === null && lead.covers_per_day === null) return null;
  return (
    <div className="border-t pt-3">
      <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">Qualification</p>
      {lead.current_software && (
        <div className="flex items-center gap-2">
          <Monitor className="text-muted-foreground h-4 w-4 shrink-0" />
          <span>{lead.current_software}</span>
        </div>
      )}
      {lead.employees_count !== null && (
        <div className="mt-1.5 flex items-center gap-2">
          <Users className="text-muted-foreground h-4 w-4 shrink-0" />
          <span>
            {lead.employees_count} personne{lead.employees_count > 1 ? "s" : ""}
          </span>
        </div>
      )}
      {lead.covers_per_day !== null && (
        <div className="mt-1.5 flex items-center gap-2">
          <Utensils className="text-muted-foreground h-4 w-4 shrink-0" />
          <span>{lead.covers_per_day} couverts / jour</span>
        </div>
      )}
    </div>
  );
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
  const [showAddNote, setShowAddNote] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

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

  useEffect(() => {
    async function init() {
      await Promise.all([loadLead(), loadActivities(), loadTasks()]);
      setIsLoading(false);
    }
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleStatusChange(status: string) {
    if (status === "won" && !lead?.converted_org_id) {
      setShowConvert(true);
      return;
    }
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
  const nonNoteActivities = activities.filter((a) => a.type !== "note");
  const noteActivities = activities.filter((a) => a.type === "note");

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

      {/* Onglets */}
      <Tabs defaultValue="info">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="info">Informations</TabsTrigger>
          <TabsTrigger value="activities">
            Activités {nonNoteActivities.length > 0 && `(${nonNoteActivities.length})`}
          </TabsTrigger>
          <TabsTrigger value="tasks">Tâches {tasks.length > 0 && `(${tasks.length})`}</TabsTrigger>
          <TabsTrigger value="notes">Notes {noteActivities.length > 0 && `(${noteActivities.length})`}</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        {/* Informations */}
        <TabsContent value="info" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Informations du lead</CardTitle>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowEdit(true)}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Éditer
              </Button>
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

              <QualificationSection lead={lead} />

              {lead.notes && (
                <div className="border-t pt-2">
                  <p className="text-muted-foreground text-xs whitespace-pre-wrap">{lead.notes}</p>
                </div>
              )}

              {lead.converted_org_id && (
                <div className="border-t pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-full text-xs"
                    onClick={() => router.push(`/${locale}/commercial/organizations/${lead.converted_org_id}`)}
                  >
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                    Voir l&apos;organisation
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activités */}
        <TabsContent value="activities" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Historique des activités</CardTitle>
              <Button size="sm" onClick={() => setShowAddActivity(true)}>
                + Activité
              </Button>
            </CardHeader>
            <CardContent>
              <ActivityFeed activities={nonNoteActivities} lead={lead} onRefresh={loadActivities} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tâches */}
        <TabsContent value="tasks" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Tâches</CardTitle>
              <Button size="sm" onClick={() => setShowAddTask(true)}>
                + Tâche
              </Button>
            </CardHeader>
            <CardContent>
              <TaskList tasks={tasks} onRefresh={loadTasks} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes */}
        <TabsContent value="notes" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Notes internes</CardTitle>
              <Button size="sm" onClick={() => setShowAddNote(true)}>
                + Note
              </Button>
            </CardHeader>
            <CardContent>
              <ActivityFeed activities={noteActivities} lead={lead} onRefresh={loadActivities} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents */}
        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-lg border border-dashed">
                <FileText className="text-muted-foreground h-8 w-8" />
                <p className="text-muted-foreground text-sm">Gestion des documents à venir</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modales */}
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

      <AddNoteModal
        open={showAddNote}
        leadId={id}
        onClose={() => setShowAddNote(false)}
        onSuccess={() => {
          setShowAddNote(false);
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

      <EditLeadModal
        open={showEdit}
        lead={lead}
        onClose={() => setShowEdit(false)}
        onSuccess={() => {
          setShowEdit(false);
          void loadLead();
        }}
      />

      <ConvertLeadWizard
        open={showConvert}
        leadId={id}
        lead={{
          company_name: lead.company_name,
          contact_email: lead.contact_email,
          contact_phone: lead.contact_phone,
          city: lead.city,
          website: lead.website,
        }}
        onClose={() => setShowConvert(false)}
        onSuccess={() => {
          setShowConvert(false);
          void loadLead();
          void loadActivities();
        }}
      />
    </div>
  );
}
