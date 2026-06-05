"use client";

import { useState } from "react";

import { Clock, Edit, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useCreateShiftTemplate,
  useDeleteShiftTemplate,
  useEmployeeShiftTemplates,
  useUpdateShiftTemplate,
  type DbShiftTemplate,
} from "@/lib/queries/planning-queries";

import { BackToEstablishmentButton } from "../back-to-establishment-button";
import { fmtHour } from "../planning-types";

const MINUTES = [0, 15, 30, 45];
const pad2 = (n: number) => String(n).padStart(2, "0");

const COLORS = [
  { value: "#3b82f6", label: "Bleu" },
  { value: "#10b981", label: "Vert" },
  { value: "#f59e0b", label: "Ambre" },
  { value: "#ef4444", label: "Rouge" },
  { value: "#8b5cf6", label: "Violet" },
  { value: "#ec4899", label: "Rose" },
  { value: "#14b8a6", label: "Cyan" },
  { value: "#f97316", label: "Orange" },
];

interface TemplateFormState {
  label: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  color: string;
}

const DEFAULT_FORM: TemplateFormState = {
  label: "",
  startHour: 9,
  startMinute: 0,
  endHour: 17,
  endMinute: 0,
  color: "#3b82f6",
};

function TemplateDialog({
  open,
  onClose,
  initial,
  onSubmit,
  isLoading,
}: {
  open: boolean;
  onClose: () => void;
  initial: TemplateFormState;
  onSubmit: (data: TemplateFormState) => void;
  isLoading: boolean;
}) {
  const [form, setForm] = useState<TemplateFormState>(initial);

  const set = (k: keyof TemplateFormState, v: string | number) => setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label.trim()) {
      toast.error("Le label est requis");
      return;
    }
    onSubmit(form);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{initial.label ? "Modifier le modèle" : "Nouveau modèle"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label>
              Label <span className="text-destructive">*</span>
            </Label>
            <Input value={form.label} onChange={(e) => set("label", e.target.value)} placeholder="Ex : Service midi" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Début</Label>
              <div className="flex gap-1">
                <Select value={String(form.startHour)} onValueChange={(v) => set("startHour", Number(v))}>
                  <SelectTrigger className="w-[72px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-48">
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {pad2(i)}h
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={String(form.startMinute)} onValueChange={(v) => set("startMinute", Number(v))}>
                  <SelectTrigger className="w-[64px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MINUTES.map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        :{pad2(m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Fin</Label>
              <div className="flex gap-1">
                <Select value={String(form.endHour)} onValueChange={(v) => set("endHour", Number(v))}>
                  <SelectTrigger className="w-[72px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-48">
                    {Array.from({ length: 27 }, (_, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {pad2(i % 24)}h{i >= 24 ? "+" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={String(form.endMinute)} onValueChange={(v) => set("endMinute", Number(v))}>
                  <SelectTrigger className="w-[64px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MINUTES.map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        :{pad2(m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Couleur</Label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  onClick={() => set("color", c.value)}
                  className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c.value,
                    borderColor: form.color === c.value ? "currentColor" : "transparent",
                  }}
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface PlanningTemplatesPageProps {
  establishmentId: string;
  organizationId: string;
}

export function PlanningTemplatesPage({ establishmentId, organizationId }: PlanningTemplatesPageProps) {
  const { data: templates = [], isLoading } = useEmployeeShiftTemplates(establishmentId, organizationId);
  const createTemplate = useCreateShiftTemplate(establishmentId, organizationId);
  const updateTemplate = useUpdateShiftTemplate(establishmentId, organizationId);
  const deleteTemplate = useDeleteShiftTemplate(establishmentId, organizationId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DbShiftTemplate | null>(null);

  const isPending = createTemplate.isPending || updateTemplate.isPending || deleteTemplate.isPending;

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (t: DbShiftTemplate) => {
    setEditing(t);
    setDialogOpen(true);
  };

  const handleSubmit = (data: TemplateFormState) => {
    if (editing) {
      updateTemplate.mutate(
        {
          id: editing.id,
          label: data.label,
          start_hour: data.startHour,
          start_minute: data.startMinute,
          end_hour: data.endHour,
          end_minute: data.endMinute,
          color: data.color,
        },
        {
          onSuccess: () => {
            toast.success("Modèle mis à jour");
            setDialogOpen(false);
          },
          onError: () => toast.error("Erreur lors de la mise à jour"),
        },
      );
    } else {
      createTemplate.mutate(
        {
          establishment_id: establishmentId,
          organization_id: organizationId,
          label: data.label,
          start_hour: data.startHour,
          start_minute: data.startMinute,
          end_hour: data.endHour,
          end_minute: data.endMinute,
          color: data.color,
        },
        {
          onSuccess: () => {
            toast.success("Modèle créé");
            setDialogOpen(false);
          },
          onError: () => toast.error("Erreur lors de la création"),
        },
      );
    }
  };

  const handleDelete = (id: string) => {
    deleteTemplate.mutate(id, {
      onSuccess: () => toast.success("Modèle supprimé"),
      onError: () => toast.error("Erreur lors de la suppression"),
    });
  };

  const duration = (t: DbShiftTemplate) => {
    const h = t.end_hour + t.end_minute / 60 - t.start_hour - t.start_minute / 60;
    return h > 0 ? `${h}h` : null;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <BackToEstablishmentButton establishmentId={establishmentId} organizationId={organizationId} />
        <h1 className="text-2xl font-bold">Modèles de créneaux</h1>
        <p className="text-muted-foreground text-sm">
          Définissez les créneaux types de votre établissement pour accélérer la création du planning.
        </p>
      </div>

      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau modèle
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Chargement...</p>
      ) : templates.length === 0 ? (
        <div className="rounded-xl border border-dashed py-12 text-center">
          <Clock className="text-muted-foreground mx-auto mb-3 h-10 w-10" />
          <p className="text-muted-foreground text-sm">Aucun modèle — créez votre premier créneau type.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: t.color ?? "#6b7280" }} />
                    <CardTitle className="text-base">{t.label}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => openEdit(t)}
                      disabled={isPending}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive h-7 w-7"
                      onClick={() => handleDelete(t.id)}
                      disabled={isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">
                    {fmtHour(t.start_hour + t.start_minute / 60)} → {fmtHour(t.end_hour + t.end_minute / 60)}
                  </span>
                  {duration(t) && (
                    <Badge variant="secondary" className="text-xs">
                      {duration(t)}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TemplateDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        initial={
          editing
            ? {
                label: editing.label,
                startHour: editing.start_hour,
                startMinute: editing.start_minute,
                endHour: editing.end_hour,
                endMinute: editing.end_minute,
                color: editing.color ?? "#3b82f6",
              }
            : DEFAULT_FORM
        }
        onSubmit={handleSubmit}
        isLoading={isPending}
      />
    </div>
  );
}
