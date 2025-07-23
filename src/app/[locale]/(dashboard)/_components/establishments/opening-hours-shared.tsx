"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Edit, Trash2, Save, X } from "lucide-react";
import { useEstablishmentOpeningHours } from "@/lib/queries/establishments";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback, useRef } from "react";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Type pour les horaires d'ouverture
interface OpeningHour {
  id: string;
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_active: boolean | null;
  deleted: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  valid_from: string | null;
  valid_until: string | null;
  establishment_id: string;
  organization_id: string;
  name: string | null;
  created_by: string | null;
}

// Hook realtime pour opening_hours d'un établissement
function useOpeningHoursRealtime(establishmentId: string) {
  const [openingHours, setOpeningHours] = useState<OpeningHour[]>([]);
  // Permet d'exposer le setter pour l'optimistic update
  const setOpeningHoursRef = useRef(setOpeningHours);
  setOpeningHoursRef.current = setOpeningHours;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const supabase = createClient();
  const channelRef = useRef<any>(null);

  // Chargement initial
  const loadOpeningHours = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("opening_hours")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("deleted", false)
        .order("day_of_week", { ascending: true })
        .order("open_time", { ascending: true });
      if (error) {
        setError(error.message);
        return;
      }
      setOpeningHours(data || []);
    } catch (err) {
      setError("Erreur lors du chargement des horaires");
    } finally {
      setLoading(false);
    }
  }, [supabase, establishmentId]);

  // Abonnement realtime
  useEffect(() => {
    if (!establishmentId) return;
    loadOpeningHours();
    const channel = supabase
      .channel(`opening_hours_realtime_${establishmentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "opening_hours",
          filter: `establishment_id=eq.${establishmentId}`,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          if (payload.eventType === "INSERT") {
            setOpeningHours((prev) => [...prev, payload.new]);
          } else if (payload.eventType === "UPDATE") {
            setOpeningHours((prev) => prev.map((h) => (h.id === payload.new.id ? payload.new : h)));
          } else if (payload.eventType === "DELETE") {
            setOpeningHours((prev) => prev.filter((h) => h.id !== payload.old.id));
          }
        },
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });
    channelRef.current = channel;
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [loadOpeningHours, supabase, establishmentId]);

  return { openingHours, loading, error, isConnected, setOpeningHours };
}

// Noms des jours de la semaine
const DAYS_OF_WEEK = [
  { value: 0, label: "Dimanche" },
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
];

export function OpeningHoursShared({
  establishmentId,
  organizationId,
}: {
  establishmentId: string;
  organizationId: string;
}) {
  const pathname = usePathname();
  const isSystemAdmin = pathname.includes("/admin/organizations/");

  const backLink = isSystemAdmin
    ? `/admin/organizations/${organizationId}/establishments/${establishmentId}`
    : `/dashboard/establishments/${establishmentId}`;

  const t = useTranslations("establishments");
  const {
    openingHours,
    loading: isLoading,
    error,
    isConnected,
    setOpeningHours,
  } = useOpeningHoursRealtime(establishmentId);

  const queryClient = useQueryClient();

  // State pour l'ajout d'un nouveau créneau
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    day_of_week: 1,
    open_time: "",
    close_time: "",
    is_active: true,
  });

  // State pour l'édition inline
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    open_time: string;
    close_time: string;
    is_active: boolean;
  }>({ open_time: "", close_time: "", is_active: true });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Mutation pour ajouter une plage horaire
  const addMutation = useMutation({
    mutationFn: async (payload: typeof addForm) => {
      const supabase = createClient();
      const { error } = await supabase.from("opening_hours").insert({
        establishment_id: establishmentId,
        organization_id: organizationId,
        day_of_week: payload.day_of_week,
        open_time: payload.open_time,
        close_time: payload.close_time,
        is_active: payload.is_active,
        deleted: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["establishment-opening-hours", establishmentId] });
      setShowAddForm(false);
      setAddForm({
        day_of_week: 1,
        open_time: "",
        close_time: "",
        is_active: true,
      });
    },
  });

  // Mutation pour supprimer une plage horaire
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("opening_hours").update({ deleted: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["establishment-opening-hours", establishmentId] });
    },
  });

  // Mutation pour modifier une plage horaire
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      open_time,
      close_time,
      is_active,
    }: {
      id: string;
      open_time: string;
      close_time: string;
      is_active: boolean;
    }) => {
      const supabase = createClient();
      const { error } = await supabase.from("opening_hours").update({ open_time, close_time, is_active }).eq("id", id);
      if (error) throw error;
      return { id, open_time, close_time, is_active };
    },
    onSuccess: (updated) => {
      // Optimistic update : on met à jour le state local immédiatement
      setOpeningHours((prev: OpeningHour[]) =>
        prev.map((h) =>
          h.id === updated.id
            ? { ...h, open_time: updated.open_time, close_time: updated.close_time, is_active: updated.is_active }
            : h,
        ),
      );
      setEditingSlotId(null);
      setErrorMsg(null);
    },
  });

  // Validation anti-chevauchement
  const checkOverlap = (dayOfWeek: number, openTime: string, closeTime: string, excludeId?: string) => {
    const slots = openingHours.filter((s) => s.day_of_week === dayOfWeek && s.id !== excludeId);
    return slots.some((s) => openTime < s.close_time && closeTime > s.open_time);
  };

  // Gestion de l'ajout
  const handleAdd = () => {
    if (!addForm.open_time || !addForm.close_time || addForm.open_time >= addForm.close_time) {
      setErrorMsg("Veuillez remplir tous les champs et vérifier les horaires.");
      return;
    }

    if (checkOverlap(addForm.day_of_week, addForm.open_time, addForm.close_time)) {
      setErrorMsg("Cette plage horaire chevauche une plage existante.");
      return;
    }

    setErrorMsg(null);
    addMutation.mutate(addForm);
  };

  // Démarrer l'édition
  const startEdit = (slot: OpeningHour) => {
    setEditingSlotId(slot.id);
    setEditForm({
      open_time: slot.open_time.slice(0, 5),
      close_time: slot.close_time.slice(0, 5),
      is_active: slot.is_active ?? true,
    });
  };

  // Annuler l'édition
  const cancelEdit = () => {
    setEditingSlotId(null);
    setEditForm({ open_time: "", close_time: "", is_active: true });
  };

  // Enregistrer la modification
  const saveEdit = (slot: OpeningHour) => {
    if (!editForm.open_time || !editForm.close_time || editForm.open_time >= editForm.close_time) {
      setErrorMsg("Veuillez remplir tous les champs et vérifier les horaires.");
      return;
    }

    if (checkOverlap(slot.day_of_week, editForm.open_time, editForm.close_time, slot.id)) {
      setErrorMsg("Cette plage horaire chevauche une plage existante.");
      return;
    }

    setErrorMsg(null);
    updateMutation.mutate({ id: slot.id, ...editForm });
  };

  // Grouper les horaires par jour
  const hoursByDay = openingHours.reduce(
    (acc, hour) => {
      const day = hour.day_of_week;
      if (!acc[day]) acc[day] = [];
      acc[day].push(hour);
      return acc;
    },
    {} as Record<number, OpeningHour[]>,
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={backLink}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à l'établissement
            </Button>
          </Link>
        </div>
        <div className="text-center">Chargement des horaires...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={backLink}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à l'établissement
            </Button>
          </Link>
        </div>
        <Alert variant="destructive">
          <AlertDescription>Erreur : {error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={backLink}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à l'établissement
          </Button>
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Horaires d'ouverture</h2>
          <p className="text-muted-foreground">Gérez les horaires d'ouverture de l'établissement</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? "default" : "secondary"}>{isConnected ? "Connecté" : "Déconnecté"}</Badge>
          <Button onClick={() => setShowAddForm(true)} disabled={showAddForm}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un horaire
          </Button>
        </div>
      </div>

      {errorMsg && (
        <Alert variant="destructive">
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      {/* Formulaire d'ajout */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Nouvel horaire d'ouverture</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="day_of_week">Jour de la semaine</Label>
                <Select
                  value={addForm.day_of_week.toString()}
                  onValueChange={(value) => setAddForm({ ...addForm, day_of_week: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((day) => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="open_time">Heure d'ouverture</Label>
                <Input
                  id="open_time"
                  type="time"
                  value={addForm.open_time}
                  onChange={(e) => setAddForm({ ...addForm, open_time: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="close_time">Heure de fermeture</Label>
                <Input
                  id="close_time"
                  type="time"
                  value={addForm.close_time}
                  onChange={(e) => setAddForm({ ...addForm, close_time: e.target.value })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  id="is_active"
                  type="checkbox"
                  checked={addForm.is_active}
                  onChange={(e) => setAddForm({ ...addForm, is_active: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="is_active">Actif</Label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAdd} disabled={addMutation.isPending}>
                {addMutation.isPending ? "Ajout..." : "Ajouter"}
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Affichage des horaires par jour */}
      <div className="space-y-6">
        {DAYS_OF_WEEK.map((day) => {
          const dayHours = hoursByDay[day.value] || [];
          return (
            <Card key={day.value}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{day.label}</span>
                  <Badge variant="outline">{dayHours.length} plage(s) horaire(s)</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dayHours.length === 0 ? (
                  <p className="text-muted-foreground">Aucun horaire configuré</p>
                ) : (
                  <div className="space-y-3">
                    {dayHours.map((hour) => (
                      <div key={hour.id} className="flex items-center justify-between rounded-lg border p-3">
                        {editingSlotId === hour.id ? (
                          <div className="flex-1 space-y-3">
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                              <Input
                                type="time"
                                value={editForm.open_time}
                                onChange={(e) => setEditForm({ ...editForm, open_time: e.target.value })}
                              />
                              <Input
                                type="time"
                                value={editForm.close_time}
                                onChange={(e) => setEditForm({ ...editForm, close_time: e.target.value })}
                              />
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={editForm.is_active}
                                  onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                                  className="h-4 w-4"
                                />
                                <Label>Actif</Label>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => saveEdit(hour)} disabled={updateMutation.isPending}>
                                <Save className="mr-1 h-3 w-3" />
                                {updateMutation.isPending ? "Sauvegarde..." : "Sauvegarder"}
                              </Button>
                              <Button size="sm" variant="outline" onClick={cancelEdit}>
                                <X className="mr-1 h-3 w-3" />
                                Annuler
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {hour.open_time.slice(0, 5)} - {hour.close_time.slice(0, 5)}
                                </span>
                                <Badge variant={hour.is_active ? "default" : "secondary"}>
                                  {hour.is_active ? "Actif" : "Inactif"}
                                </Badge>
                              </div>
                              <div className="text-muted-foreground text-sm">Plage horaire d'ouverture</div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => startEdit(hour)}>
                                <Edit className="mr-1 h-3 w-3" />
                                Modifier
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteMutation.mutate(hour.id)}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="mr-1 h-3 w-3" />
                                Supprimer
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
