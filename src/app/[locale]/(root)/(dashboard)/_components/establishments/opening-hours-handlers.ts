"use client";

import { useState } from "react";

import type { OpeningHour } from "./_components";

// Hook pour les fonctions de gestion des horaires d'ouverture
export function useOpeningHoursHandlers(openingHours: OpeningHour[]) {
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

  // Fonction pour vérifier les chevauchements
  const checkOverlap = (dayOfWeek: number, openTime: string, closeTime: string, excludeId?: string) => {
    return openingHours.some(
      (slot) =>
        slot.day_of_week === dayOfWeek &&
        slot.id !== excludeId &&
        ((openTime >= slot.open_time && openTime < slot.close_time) ||
          (closeTime > slot.open_time && closeTime <= slot.close_time) ||
          (openTime <= slot.open_time && closeTime >= slot.close_time)),
    );
  };

  // Fonction pour commencer l'édition
  const startEdit = (slot: OpeningHour) => {
    setEditingSlotId(slot.id);
    setEditForm({
      open_time: slot.open_time,
      close_time: slot.close_time,
      is_active: slot.is_active ?? true,
    });
  };

  // Fonction pour annuler l'édition
  const cancelEdit = () => {
    setEditingSlotId(null);
    setEditForm({ open_time: "", close_time: "", is_active: true });
  };

  return {
    showAddForm,
    setShowAddForm,
    addForm,
    setAddForm,
    editingSlotId,
    setEditingSlotId,
    editForm,
    setEditForm,
    errorMsg,
    setErrorMsg,
    checkOverlap,
    startEdit,
    cancelEdit,
  };
}
