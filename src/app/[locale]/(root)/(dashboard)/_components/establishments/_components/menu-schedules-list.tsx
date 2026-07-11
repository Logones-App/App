"use client";

import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

type Schedule = Tables<"menu_schedules">;

const ALL_DAYS = "all";
// day_of_week : 1=lundi … 7=dimanche (aligné sur le calendrier des menus).
const DAY_OPTIONS = [
  { value: "1", label: "Lundi" },
  { value: "2", label: "Mardi" },
  { value: "3", label: "Mercredi" },
  { value: "4", label: "Jeudi" },
  { value: "5", label: "Vendredi" },
  { value: "6", label: "Samedi" },
  { value: "7", label: "Dimanche" },
];

const dayLabel = (n: number | null): string =>
  n == null ? "Tous les jours" : (DAY_OPTIONS.find((d) => d.value === String(n))?.label ?? `Jour ${n}`);

export function MenuSchedulesList({ menuId, organizationId }: { menuId: string; organizationId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [day, setDay] = useState<string>(ALL_DAYS);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const { data: schedules = [] } = useQuery({
    queryKey: ["menu-schedules", menuId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("menu_schedules")
        .select("*")
        .eq("menu_id", menuId)
        .eq("deleted", false)
        .order("day_of_week", { ascending: true, nullsFirst: true });
      if (error) throw error;
      return data;
    },
  });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["menu-schedules", menuId] });

  const openAdd = () => {
    setEditing(null);
    setDay(ALL_DAYS);
    setStart("");
    setEnd("");
    setOpen(true);
  };

  const openEdit = (s: Schedule) => {
    setEditing(s);
    setDay(s.day_of_week == null ? ALL_DAYS : String(s.day_of_week));
    setStart(s.start_time ?? "");
    setEnd(s.end_time ?? "");
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const payload = {
        day_of_week: day === ALL_DAYS ? null : Number(day),
        start_time: start || null,
        end_time: end || null,
      };
      if (editing) {
        const { error } = await supabase.from("menu_schedules").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("menu_schedules")
          .insert({ ...payload, menu_id: menuId, organization_id: organizationId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidate();
      setOpen(false);
    },
    onError: () => toast.error("Impossible d'enregistrer la plage horaire."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("menu_schedules").update({ deleted: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: () => toast.error("Impossible de supprimer la plage horaire."),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Plages horaires du menu</h3>
        <Button size="sm" onClick={openAdd}>
          + Ajouter une plage
        </Button>
      </div>

      {schedules.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Aucune plage. Sans plage, ce menu n&apos;est pas sélectionné automatiquement selon l&apos;heure (commande QR).
        </p>
      )}

      {schedules.map((s) => (
        <Card key={s.id}>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 py-3">
            <CardTitle className="text-sm font-medium">
              {dayLabel(s.day_of_week)}
              {s.start_time || s.end_time ? ` · ${s.start_time ?? "…"} → ${s.end_time ?? "…"}` : " · toute la journée"}
            </CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => openEdit(s)}>
                Modifier
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(s.id)}
              >
                Supprimer
              </Button>
            </div>
          </CardHeader>
        </Card>
      ))}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier la plage" : "Ajouter une plage"}</DialogTitle>
            <DialogDescription>
              Jour et heures où ce menu s&apos;applique (sélection automatique Midi/Soir sur la commande QR).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Jour</Label>
              <Select value={day} onValueChange={setDay}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_DAYS}>Tous les jours</SelectItem>
                  {DAY_OPTIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Heure de début</Label>
                <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Heure de fin</Label>
                <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Enregistrement…" : editing ? "Modifier" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
