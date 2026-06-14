"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, Mail, MessageSquare, Monitor, Phone } from "lucide-react";

import { type Lead } from "../../_components/leads-types";

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

interface Props {
  activities: LeadActivity[];
  lead: Lead;
  onRefresh: () => void;
}

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  call: <Phone className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  demo: <Monitor className="h-4 w-4" />,
  meeting: <Calendar className="h-4 w-4" />,
  note: <MessageSquare className="h-4 w-4" />,
};

const ACTIVITY_LABELS: Record<string, string> = {
  call: "Appel",
  email: "Email",
  demo: "Démo",
  meeting: "Réunion",
  note: "Note",
};

const ACTIVITY_COLORS: Record<string, string> = {
  call: "bg-blue-100 text-blue-600",
  email: "bg-violet-100 text-violet-600",
  demo: "bg-indigo-100 text-indigo-600",
  meeting: "bg-amber-100 text-amber-600",
  note: "bg-slate-100 text-slate-600",
};

export function ActivityFeed({ activities }: Props) {
  if (activities.length === 0) {
    return (
      <p className="text-muted-foreground py-6 text-center text-sm">
        Aucune activité — commencez par ajouter un appel ou une note
      </p>
    );
  }

  return (
    <div className="relative flex flex-col gap-4">
      {/* Ligne verticale */}
      <div className="bg-border absolute top-0 left-5 h-full w-px" />

      {activities.map((activity) => {
        const iconColor = ACTIVITY_COLORS[activity.type] ?? "bg-slate-100 text-slate-600";

        return (
          <div key={activity.id} className="relative flex gap-3 pl-1">
            <div
              className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconColor}`}
            >
              {ACTIVITY_ICONS[activity.type] ?? <MessageSquare className="h-4 w-4" />}
            </div>

            <div className="dark:bg-card min-w-0 flex-1 rounded-lg border bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{ACTIVITY_LABELS[activity.type] ?? activity.type}</span>
                  {activity.title && <span className="text-muted-foreground text-sm">— {activity.title}</span>}
                </div>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {format(new Date(activity.created_at), "d MMM, HH:mm", { locale: fr })}
                </span>
              </div>

              {activity.type === "email" && activity.email_subject && (
                <p className="mt-1 text-sm font-medium text-violet-600">{activity.email_subject}</p>
              )}

              {activity.content && (
                <p className="text-muted-foreground mt-1 text-sm whitespace-pre-wrap">{activity.content}</p>
              )}

              {activity.duration_minutes && (
                <p className="text-muted-foreground mt-1 text-xs">Durée : {activity.duration_minutes} min</p>
              )}

              {activity.meeting_url && (
                <a
                  href={activity.meeting_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary mt-1 block text-xs hover:underline"
                >
                  {activity.meeting_url}
                </a>
              )}

              {activity.creator_profile?.full_name && (
                <p className="text-muted-foreground mt-1.5 text-xs">par {activity.creator_profile.full_name}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
