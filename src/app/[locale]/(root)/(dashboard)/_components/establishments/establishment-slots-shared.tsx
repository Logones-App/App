"use client";
import { useEffect, useState, useCallback, useRef } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Edit, Trash2, Save, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEstablishmentBookingSlots } from "@/lib/queries/establishments";
import { createClient } from "@/lib/supabase/client";

interface EstablishmentSlotsSharedProps {
  establishmentId: string;
  organizationId: string;
}

// Type pour les créneaux de réservation
interface BookingSlot {
  id: string;
  day_of_week: number;
  slot_name: string;
  start_time: string;
  end_time: string;
  max_capacity: number | null;
  is_active: boolean | null;
  deleted: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  valid_from: string | null;
  valid_until: string | null;
  establishment_id: string;
}

// Hook realtime pour booking_slots d'un établissement
function useBookingSlotsRealtime(establishmentId: string) {
  const [bookingSlots, setBookingSlots] = useState<BookingSlot[]>([]);
  // Permet d'exposer le setter pour l'optimistic update
  const setBookingSlotsRef = useRef(setBookingSlots);
  setBookingSlotsRef.current = setBookingSlots;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const supabase = createClient();
  const channelRef = useRef<any>(null);

  // Chargement initial
  const loadBookingSlots = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("booking_slots")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("deleted", false)
        .order("day_of_week", { ascending: true })
        .order("start_time", { ascending: true });
      if (error) {
        setError(error.message);
        return;
      }
      setBookingSlots(data || []);
    } catch (err) {
      setError("Erreur lors du chargement des créneaux");
    } finally {
      setLoading(false);
    }
  }, [supabase, establishmentId]);

  // Abonnement realtime
  useEffect(() => {
    if (!establishmentId) return;
    loadBookingSlots();
    const channel = supabase
      .channel(`booking_slots_realtime_${establishmentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "booking_slots",
          filter: `establishment_id=eq.${establishmentId}`,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          if (payload.eventType === "INSERT") {
            setBookingSlots((prev) => [...prev, payload.new]);
          } else if (payload.eventType === "UPDATE") {
            setBookingSlots((prev) => prev.map((h) => (h.id === payload.new.id ? payload.new : h)));
          } else if (payload.eventType === "DELETE") {
            setBookingSlots((prev) => prev.filter((h) => h.id !== payload.old.id));
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
  }, [loadBookingSlots, supabase, establishmentId]);

  return { bookingSlots, loading, error, isConnected, setBookingSlots };
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

export function EstablishmentSlotsShared({ establishmentId, organizationId }: EstablishmentSlotsSharedProps) {
  const pathname = usePathname();
  const isSystemAdmin = pathname.includes("/admin/organizations/");
  const backLink = isSystemAdmin
    ? `/admin/organizations/${organizationId}/establishments/${establishmentId}`
    : `/dashboard/establishments/${establishmentId}`;

  const t = useTranslations("establishments");
  const {
    bookingSlots,
    loading: isLoading,
    error,
    isConnected,
    setBookingSlots,
  } = useBookingSlotsRealtime(establishmentId);

  const queryClient = useQueryClient();

  // State pour l'ajout d'un nouveau créneau
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    day_of_week: 1,
    slot_name: "",
    start_time: "",
    end_time: "",
    max_capacity: 10,
    is_active: true,
  });

  // State pour l'édition inline
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    slot_name: string;
    start_time: string;
    end_time: string;
    max_capacity: number;
    is_active: boolean;
  }>({ slot_name: "", start_time: "", end_time: "", max_capacity: 10, is_active: true });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Mutation pour ajouter un créneau
  const addMutation = useMutation({
    mutationFn: async (payload: typeof addForm) => {
      const supabase = createClient();
      const { error } = await supabase.from("booking_slots").insert({
        establishment_id: establishmentId,
        day_of_week: payload.day_of_week,
        slot_name: payload.slot_name,
        start_time: payload.start_time,
        end_time: payload.end_time,
        max_capacity: payload.max_capacity,
        is_active: payload.is_active,
        deleted: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["establishment-booking-slots", establishmentId] });
      setShowAddForm(false);
      setAddForm({
        day_of_week: 1,
        slot_name: "",
        start_time: "",
        end_time: "",
        max_capacity: 10,
        is_active: true,
      });
    },
  });

  // Mutation pour supprimer un créneau
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("booking_slots").update({ deleted: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["establishment-booking-slots", establishmentId] });
    },
  });

  // Mutation pour modifier un créneau
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & typeof editForm) => {
      const supabase = createClient();
      const { error } = await supabase.from("booking_slots").update(payload).eq("id", id);
      if (error) throw error;
      return { id, ...payload };
    },
    onSuccess: (updated) => {
      // Optimistic update
      setBookingSlots((prev: BookingSlot[]) => prev.map((h) => (h.id === updated.id ? { ...h, ...updated } : h)));
      setEditingSlotId(null);
      setErrorMsg(null);
    },
  });

  // Validation anti-chevauchement
  const checkOverlap = (dayOfWeek: number, startTime: string, endTime: string, excludeId?: string) => {
    const slots = bookingSlots.filter((s) => s.day_of_week === dayOfWeek && s.id !== excludeId);
    return slots.some((s) => startTime < s.end_time && endTime > s.start_time);
  };

  // Gestion de l'ajout
  const handleAdd = () => {
    if (!addForm.slot_name || !addForm.start_time || !addForm.end_time || addForm.start_time >= addForm.end_time) {
      setErrorMsg("Veuillez remplir tous les champs et vérifier les horaires.");
      return;
    }

    if (checkOverlap(addForm.day_of_week, addForm.start_time, addForm.end_time)) {
      setErrorMsg("Ce créneau chevauche un créneau existant.");
      return;
    }

    setErrorMsg(null);
    addMutation.mutate(addForm);
  };

  // Démarrer l'édition
  const startEdit = (slot: BookingSlot) => {
    setEditingSlotId(slot.id);
    setEditForm({
      slot_name: slot.slot_name,
      start_time: slot.start_time.slice(0, 5),
      end_time: slot.end_time.slice(0, 5),
      max_capacity: slot.max_capacity || 10,
      is_active: slot.is_active ?? true,
    });
  };

  // Annuler l'édition
  const cancelEdit = () => {
    setEditingSlotId(null);
    setEditForm({ slot_name: "", start_time: "", end_time: "", max_capacity: 10, is_active: true });
  };

  // Enregistrer la modification
  const saveEdit = (slot: BookingSlot) => {
    if (!editForm.slot_name || !editForm.start_time || !editForm.end_time || editForm.start_time >= editForm.end_time) {
      setErrorMsg("Veuillez remplir tous les champs et vérifier les horaires.");
      return;
    }

    if (checkOverlap(slot.day_of_week, editForm.start_time, editForm.end_time, slot.id)) {
      setErrorMsg("Ce créneau chevauche un créneau existant.");
      return;
    }

    setErrorMsg(null);
    updateMutation.mutate({ id: slot.id, ...editForm });
  };

  // Grouper les créneaux par jour
  const slotsByDay = bookingSlots.reduce(
    (acc, slot) => {
      const day = slot.day_of_week;
      if (!acc[day]) acc[day] = [];
      acc[day].push(slot);
      return acc;
    },
    {} as Record<number, BookingSlot[]>,
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
        <div className="text-center">Chargement des créneaux...</div>
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
          <h2 className="text-2xl font-bold">Créneaux de réservation</h2>
          <p className="text-muted-foreground">Gérez les créneaux disponibles pour les réservations</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? "default" : "secondary"}>{isConnected ? "Connecté" : "Déconnecté"}</Badge>
          <Button onClick={() => setShowAddForm(true)} disabled={showAddForm}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un créneau
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
            <CardTitle>Nouveau créneau</CardTitle>
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
                <Label htmlFor="slot_name">Nom du créneau</Label>
                <Input
                  id="slot_name"
                  value={addForm.slot_name}
                  onChange={(e) => setAddForm({ ...addForm, slot_name: e.target.value })}
                  placeholder="ex: Déjeuner, Dîner"
                />
              </div>
              <div>
                <Label htmlFor="start_time">Heure de début</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={addForm.start_time}
                  onChange={(e) => setAddForm({ ...addForm, start_time: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="end_time">Heure de fin</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={addForm.end_time}
                  onChange={(e) => setAddForm({ ...addForm, end_time: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="max_capacity">Capacité maximale</Label>
                <Input
                  id="max_capacity"
                  type="number"
                  min="1"
                  value={addForm.max_capacity}
                  onChange={(e) => setAddForm({ ...addForm, max_capacity: parseInt(e.target.value) })}
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

      {/* Affichage des créneaux par jour */}
      <div className="space-y-6">
        {DAYS_OF_WEEK.map((day) => {
          const daySlots = slotsByDay[day.value] || [];
          return (
            <Card key={day.value}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{day.label}</span>
                  <Badge variant="outline">{daySlots.length} créneau(s)</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {daySlots.length === 0 ? (
                  <p className="text-muted-foreground">Aucun créneau configuré</p>
                ) : (
                  <div className="space-y-3">
                    {daySlots.map((slot) => (
                      <div key={slot.id} className="flex items-center justify-between rounded-lg border p-3">
                        {editingSlotId === slot.id ? (
                          <div className="flex-1 space-y-3">
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                              <Input
                                value={editForm.slot_name}
                                onChange={(e) => setEditForm({ ...editForm, slot_name: e.target.value })}
                                placeholder="Nom du créneau"
                              />
                              <Input
                                type="time"
                                value={editForm.start_time}
                                onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
                              />
                              <Input
                                type="time"
                                value={editForm.end_time}
                                onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })}
                              />
                              <Input
                                type="number"
                                min="1"
                                value={editForm.max_capacity}
                                onChange={(e) => setEditForm({ ...editForm, max_capacity: parseInt(e.target.value) })}
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={editForm.is_active}
                                onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                                className="h-4 w-4"
                              />
                              <Label>Actif</Label>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => saveEdit(slot)} disabled={updateMutation.isPending}>
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
                                <span className="font-medium">{slot.slot_name}</span>
                                <Badge variant={slot.is_active ? "default" : "secondary"}>
                                  {slot.is_active ? "Actif" : "Inactif"}
                                </Badge>
                              </div>
                              <div className="text-muted-foreground text-sm">
                                {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)} • Capacité:{" "}
                                {slot.max_capacity}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => startEdit(slot)}>
                                <Edit className="mr-1 h-3 w-3" />
                                Modifier
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteMutation.mutate(slot.id)}
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
