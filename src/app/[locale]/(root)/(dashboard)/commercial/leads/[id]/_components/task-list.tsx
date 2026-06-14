"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";

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
  tasks: LeadTask[];
  onRefresh: () => void;
}

const TASK_LABELS: Record<string, string> = {
  call: "Rappeler",
  email: "Email",
  demo: "Démo",
  meeting: "Réunion",
  proposal: "Proposition",
  other: "Tâche",
};

export function TaskList({ tasks, onRefresh }: Props) {
  async function toggleComplete(task: LeadTask) {
    const supabase = createClient();
    const { error } = await supabase
      .from("lead_tasks")
      .update({
        completed: !task.completed,
        completed_at: !task.completed ? new Date().toISOString() : null,
      })
      .eq("id", task.id);

    if (error) {
      toast.error("Impossible de mettre à jour la tâche");
    } else {
      onRefresh();
    }
  }

  if (tasks.length === 0) {
    return <p className="text-muted-foreground py-2 text-center text-sm">Aucune tâche</p>;
  }

  const pending = tasks.filter((t) => !t.completed);
  const done = tasks.filter((t) => t.completed);

  return (
    <div className="space-y-1">
      {pending.map((task) => (
        <TaskRow key={task.id} task={task} onToggle={() => void toggleComplete(task)} />
      ))}
      {done.length > 0 && pending.length > 0 && <div className="my-2 border-t" />}
      {done.map((task) => (
        <TaskRow key={task.id} task={task} onToggle={() => void toggleComplete(task)} />
      ))}
    </div>
  );
}

function TaskRow({ task, onToggle }: { task: LeadTask; onToggle: () => void }) {
  const isOverdue = !task.completed && task.due_date && new Date(task.due_date) < new Date();

  return (
    <div
      className={`hover:bg-muted/50 flex items-start gap-2 rounded-md p-1.5 transition-colors ${task.completed ? "opacity-50" : ""}`}
    >
      <button
        onClick={onToggle}
        className="hover:text-primary mt-0.5 shrink-0 transition-colors"
        aria-label={task.completed ? "Marquer non complétée" : "Marquer complétée"}
      >
        {task.completed ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <Circle className="text-muted-foreground h-4 w-4" />
        )}
      </button>

      <div className="min-w-0 flex-1 text-sm">
        <p className={`truncate ${task.completed ? "line-through" : ""}`}>
          <span className="text-muted-foreground mr-1 text-xs">{TASK_LABELS[task.type] ?? "Tâche"} —</span>
          {task.title}
        </p>
        {task.due_date && (
          <p className={`flex items-center gap-1 text-xs ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
            <Clock className="h-3 w-3" />
            {format(new Date(task.due_date), "d MMM, HH:mm", { locale: fr })}
          </p>
        )}
      </div>
    </div>
  );
}
