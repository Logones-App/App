"use client";

import { useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

import { EstablishmentSlotsAddForm } from "./establishment-slots-add-form";
import { EstablishmentSlotsDayGrid } from "./establishment-slots-day-grid";
import type { BookingSlot, SlotAddForm, SlotEditForm } from "./establishment-slots-types";
import { useBookingSlotsRealtime } from "./use-booking-slots-realtime";

interface EstablishmentSlotsSharedProps {
  establishmentId: string;
  organizationId: string;
}

export function EstablishmentSlotsShared({ establishmentId, organizationId }: EstablishmentSlotsSharedProps) {
  const pathname = usePathname();
  const isSystemAdmin = pathname.includes("/admin/organizations/");
  const backLink = isSystemAdmin
    ? `/admin/organizations/${organizationId}/establishments/${establishmentId}`
    : `/dashboard/establishments/${establishmentId}`;

  const {
    bookingSlots,
    loading: isLoading,
    error,
    isConnected,
    setBookingSlots,
  } = useBookingSlotsRealtime(establishmentId);

  const queryClient = useQueryClient();

  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<SlotAddForm>({
    day_of_week: 1,
    slot_name: "",
    start_time: "",
    end_time: "",
    max_capacity: 10,
    is_active: true,
  });

  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<SlotEditForm>({
    slot_name: "",
    start_time: "",
    end_time: "",
    max_capacity: 10,
    is_active: true,
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const addMutation = useMutation({
    mutationFn: async (payload: SlotAddForm) => {
      const supabase = createClient();
      const { error: insertError } = await supabase.from("booking_slots").insert({
        establishment_id: establishmentId,
        organization_id: organizationId,
        day_of_week: payload.day_of_week,
        slot_name: payload.slot_name,
        start_time: payload.start_time,
        end_time: payload.end_time,
        max_capacity: payload.max_capacity,
        is_active: payload.is_active,
        deleted: false,
      });
      if (insertError) throw insertError;
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error: delError } = await supabase.from("booking_slots").update({ deleted: true }).eq("id", id);
      if (delError) throw delError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["establishment-booking-slots", establishmentId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & SlotEditForm) => {
      const supabase = createClient();
      const { error: updError } = await supabase.from("booking_slots").update(payload).eq("id", id);
      if (updError) throw updError;
      return { id, ...payload };
    },
    onSuccess: (updated) => {
      setBookingSlots((prev: BookingSlot[]) => prev.map((h) => (h.id === updated.id ? { ...h, ...updated } : h)));
      setEditingSlotId(null);
      setErrorMsg(null);
    },
  });

  const checkOverlap = (dayOfWeek: number, startTime: string, endTime: string, excludeId?: string) => {
    const slots = bookingSlots.filter((s) => s.day_of_week === dayOfWeek && s.id !== excludeId);
    return slots.some((s) => startTime < s.end_time && endTime > s.start_time);
  };

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

  const startEdit = (slot: BookingSlot) => {
    setEditingSlotId(slot.id);
    setEditForm({
      slot_name: slot.slot_name,
      start_time: slot.start_time.slice(0, 5),
      end_time: slot.end_time.slice(0, 5),
      max_capacity: slot.max_capacity ?? 10,
      is_active: slot.is_active ?? true,
    });
  };

  const cancelEdit = () => {
    setEditingSlotId(null);
    setEditForm({ slot_name: "", start_time: "", end_time: "", max_capacity: 10, is_active: true });
  };

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

  const slotsByDay = bookingSlots.reduce(
    (acc, slot) => {
      const day = slot.day_of_week;
      if (!acc[day]) acc[day] = [];
      acc[day].push(slot);
      return acc;
    },
    {} as Record<number, BookingSlot[]>,
  );

  const backLabel = "Retour à l'établissement";

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={backLink}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {backLabel}
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
              {backLabel}
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
            {backLabel}
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

      <EstablishmentSlotsAddForm
        show={showAddForm}
        onClose={() => setShowAddForm(false)}
        addForm={addForm}
        setAddForm={setAddForm}
        onAdd={handleAdd}
        isPending={addMutation.isPending}
      />

      <EstablishmentSlotsDayGrid
        slotsByDay={slotsByDay}
        editingSlotId={editingSlotId}
        editForm={editForm}
        setEditForm={setEditForm}
        startEdit={startEdit}
        saveEdit={saveEdit}
        cancelEdit={cancelEdit}
        onDelete={(id) => deleteMutation.mutate(id)}
        deletePending={deleteMutation.isPending}
        updatePending={updateMutation.isPending}
      />
    </div>
  );
}
