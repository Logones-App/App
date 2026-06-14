"use client";

import { useState } from "react";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";

type ActivityType = "call" | "email" | "demo" | "meeting" | "note";

const ACTIVITY_TYPES: { value: ActivityType; label: string }[] = [
  { value: "call", label: "Appel téléphonique" },
  { value: "email", label: "Email" },
  { value: "demo", label: "Démonstration" },
  { value: "meeting", label: "Réunion" },
  { value: "note", label: "Note" },
];

interface Props {
  open: boolean;
  leadId: string;
  leadEmail: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddActivityModal({ open, leadId, leadEmail, onClose, onSuccess }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [type, setType] = useState<ActivityType>("call");
  const [form, setForm] = useState({
    title: "",
    content: "",
    duration_minutes: "",
    meeting_url: "",
    email_to: leadEmail ?? "",
    email_subject: "",
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (type === "email") {
        if (!form.email_to.trim()) {
          toast.error("Destinataire requis");
          setIsLoading(false);
          return;
        }
        const res = await fetch(`/api/leads/${leadId}/email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: form.email_to.trim(),
            subject: form.email_subject.trim() || "(sans objet)",
            content: form.content.trim(),
          }),
        });
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          throw new Error(data.error ?? "Erreur envoi email");
        }
        toast.success("Email envoyé et enregistré");
      } else {
        const { error } = await supabase.from("lead_activities").insert({
          lead_id: leadId,
          type,
          title: form.title.trim() || null,
          content: form.content.trim() || null,
          created_by: user?.id ?? null,
          duration_minutes:
            (type === "call" || type === "demo" || type === "meeting") && form.duration_minutes
              ? parseInt(form.duration_minutes, 10)
              : null,
          meeting_url: type === "demo" || type === "meeting" ? form.meeting_url.trim() || null : null,
        });
        if (error) throw error;
        toast.success("Activité enregistrée");
      }
      setForm({
        title: "",
        content: "",
        duration_minutes: "",
        meeting_url: "",
        email_to: leadEmail ?? "",
        email_subject: "",
      });
      setType("call");
      onSuccess();
    } catch {
      toast.error("Erreur lors de l'enregistrement");
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter une activité</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as ActivityType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type === "email" && (
            <>
              <div className="space-y-1.5">
                <Label>Destinataire</Label>
                <Input
                  type="email"
                  value={form.email_to}
                  onChange={(e) => set("email_to", e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Objet</Label>
                <Input value={form.email_subject} onChange={(e) => set("email_subject", e.target.value)} />
              </div>
            </>
          )}

          {type !== "email" && (
            <div className="space-y-1.5">
              <Label>Titre / Résumé</Label>
              <Input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Résumé de l'activité"
              />
            </div>
          )}

          {(type === "call" || type === "demo" || type === "meeting") && (
            <div className="space-y-1.5">
              <Label>Durée (minutes)</Label>
              <Input
                type="number"
                value={form.duration_minutes}
                onChange={(e) => set("duration_minutes", e.target.value)}
                placeholder="30"
              />
            </div>
          )}

          {(type === "demo" || type === "meeting") && (
            <div className="space-y-1.5">
              <Label>Lien visio / lieu</Label>
              <Input
                value={form.meeting_url}
                onChange={(e) => set("meeting_url", e.target.value)}
                placeholder="https://meet.google.com/…"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>{type === "email" ? "Corps du message" : "Notes"}</Label>
            <Textarea
              value={form.content}
              onChange={(e) => set("content", e.target.value)}
              rows={4}
              placeholder={type === "note" ? "Votre note…" : "Résumé, points abordés…"}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
