"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import { differenceInCalendarDays, format, isAfter, isBefore, isToday, parseISO, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

interface Task {
  id: string;
  lead_id: string;
  title: string;
  due_date: string | null;
  completed: boolean;
  leads: { company_name: string | null; id: string } | null;
}

type Bucket = "overdue" | "today" | "week" | "later";

function bucket(task: Task): Bucket {
  if (!task.due_date) return "later";
  const d = parseISO(task.due_date);
  const today = startOfDay(new Date());
  if (isBefore(d, today)) return "overdue";
  if (isToday(d)) return "today";
  const diff = differenceInCalendarDays(d, today);
  if (diff <= 7) return "week";
  return "later";
}

const BUCKET_CONFIG: Record<Bucket, { label: string; badgeClass: string }> = {
  overdue: { label: "En retard", badgeClass: "bg-red-100 text-red-700" },
  today: { label: "Aujourd'hui", badgeClass: "bg-blue-100 text-blue-700" },
  week: { label: "Cette semaine", badgeClass: "bg-amber-100 text-amber-700" },
  later: { label: "Plus tard", badgeClass: "bg-gray-100 text-gray-600" },
};

const BUCKET_ORDER: Bucket[] = ["overdue", "today", "week", "later"];

export function CalendrierContent() {
  const params = useParams<{ locale: string }>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadTasks() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("lead_tasks")
      .select("id, lead_id, title, due_date, completed, leads(id, company_name)")
      .eq("completed", false)
      .eq("deleted", false)
      .order("due_date", { ascending: true, nullsFirst: false });
    if (error) {
      toast.error("Erreur de chargement");
      return;
    }
    setTasks((data ?? []) as unknown as Task[]);
    setIsLoading(false);
  }

  useEffect(() => {
    void loadTasks();
  }, []);

  async function handleComplete(task: Task) {
    const supabase = createClient();
    const { error } = await supabase
      .from("lead_tasks")
      .update({ completed: true, updated_at: new Date().toISOString() })
      .eq("id", task.id);
    if (error) {
      toast.error("Erreur");
      return;
    }
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    toast.success("Tâche marquée comme terminée");
  }

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-lg border border-dashed">
        <Calendar className="text-muted-foreground h-10 w-10" />
        <p className="text-muted-foreground text-sm">Aucune tâche en attente</p>
      </div>
    );
  }

  const grouped = BUCKET_ORDER.reduce<Record<Bucket, Task[]>>(
    (acc, b) => {
      acc[b] = tasks.filter((t) => bucket(t) === b);
      return acc;
    },
    { overdue: [], today: [], week: [], later: [] },
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Clock className="text-muted-foreground h-4 w-4" />
        <p className="text-muted-foreground text-sm">
          {tasks.length} tâche{tasks.length > 1 ? "s" : ""} en attente
        </p>
      </div>

      {BUCKET_ORDER.filter((b) => grouped[b].length > 0).map((b) => {
        const cfg = BUCKET_CONFIG[b];
        return (
          <div key={b}>
            <div className="mb-2 flex items-center gap-2">
              <Badge className={`border-0 text-xs ${cfg.badgeClass}`}>{cfg.label}</Badge>
              <span className="text-muted-foreground text-xs">{grouped[b].length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {grouped[b].map((task) => {
                const overdue = b === "overdue";
                return (
                  <Card key={task.id} className={overdue ? "border-red-200" : ""}>
                    <CardContent className="flex items-center gap-3 py-3">
                      <button
                        onClick={() => void handleComplete(task)}
                        className="shrink-0 text-green-500 hover:text-green-600"
                        title="Marquer terminée"
                      >
                        <CheckCircle2 className="h-5 w-5" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{task.title}</p>
                        {task.leads && (
                          <Link
                            href={`/${params.locale}/commercial/leads/${task.leads.id}`}
                            className="text-muted-foreground truncate text-xs hover:underline"
                          >
                            {task.leads.company_name ?? "—"}
                          </Link>
                        )}
                      </div>
                      {task.due_date && (
                        <p
                          className={`shrink-0 text-xs ${overdue ? "font-medium text-red-600" : "text-muted-foreground"}`}
                        >
                          {isToday(parseISO(task.due_date))
                            ? "Aujourd'hui"
                            : isAfter(parseISO(task.due_date), new Date())
                              ? format(parseISO(task.due_date), "d MMM", { locale: fr })
                              : format(parseISO(task.due_date), "d MMM", { locale: fr })}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
