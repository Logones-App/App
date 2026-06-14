"use client";

import { useState } from "react";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";

type TaskType = "call" | "email" | "demo" | "meeting" | "proposal" | "other";

const TASK_TYPES: { value: TaskType; label: string }[] = [
  { value: "call", label: "Rappeler" },
  { value: "email", label: "Envoyer un email" },
  { value: "demo", label: "Planifier une démo" },
  { value: "meeting", label: "Réunion" },
  { value: "proposal", label: "Envoyer une proposition" },
  { value: "other", label: "Autre" },
];

interface Props {
  open: boolean;
  leadId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddTaskModal({ open, leadId, onClose, onSuccess }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [type, setType] = useState<TaskType>("call");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");

  async function handleSubmit() {
    if (!title.trim()) {
      toast.error("Le titre est requis");
      return;
    }
    setIsLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase.from("lead_tasks").insert({
        lead_id: leadId,
        type,
        title: title.trim(),
        due_date: dueDate || null,
        assigned_to: user?.id ?? null,
        created_by: user?.id ?? null,
      });

      if (error) throw error;

      toast.success("Tâche créée");
      setTitle("");
      setDueDate("");
      setType("call");
      onSuccess();
    } catch {
      toast.error("Erreur lors de la création");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Nouvelle tâche</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as TaskType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>
              Titre <span className="text-destructive">*</span>
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Rappeler M. Martin vendredi"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Échéance</Label>
            <Input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
