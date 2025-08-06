"use client";

import type { OpeningHour } from "./_components";

// Fonction pour ajouter une plage horaire
export function handleAddOpeningHour({
  addForm,
  organizationId,
  checkOverlap,
  addMutation,
  setShowAddForm,
  setAddForm,
  setErrorMsg,
}: {
  addForm: any;
  organizationId: string;
  checkOverlap: (dayOfWeek: number, openTime: string, closeTime: string, excludeId?: string) => boolean;
  addMutation: any;
  setShowAddForm: (show: boolean) => void;
  setAddForm: (form: any) => void;
  setErrorMsg: (msg: string | null) => void;
}) {
  if (!addForm.open_time || !addForm.close_time) {
    setErrorMsg("Veuillez remplir tous les champs");
    return;
  }

  if (addForm.open_time >= addForm.close_time) {
    setErrorMsg("L&apos;heure de fermeture doit être après l&apos;heure d&apos;ouverture");
    return;
  }

  if (checkOverlap(addForm.day_of_week, addForm.open_time, addForm.close_time)) {
    setErrorMsg("Il y a un chevauchement avec une autre plage horaire");
    return;
  }

  addMutation.mutate(
    {
      ...addForm,
      organization_id: organizationId,
    },
    {
      onSuccess: () => {
        setShowAddForm(false);
        setAddForm({
          day_of_week: 1,
          open_time: "",
          close_time: "",
          is_active: true,
        });
      },
      onError: (error: any) => {
        setErrorMsg(error.message);
      },
    },
  );
}

// Fonction pour sauvegarder l'édition
export function handleSaveOpeningHour({
  editForm,
  slot,
  checkOverlap,
  updateMutation,
  setEditingSlotId,
  setEditForm,
  setErrorMsg,
}: {
  editForm: any;
  slot: OpeningHour;
  checkOverlap: (dayOfWeek: number, openTime: string, closeTime: string, excludeId?: string) => boolean;
  updateMutation: any;
  setEditingSlotId: (id: string | null) => void;
  setEditForm: (form: any) => void;
  setErrorMsg: (msg: string | null) => void;
}) {
  if (!editForm.open_time || !editForm.close_time) {
    setErrorMsg("Veuillez remplir tous les champs");
    return;
  }

  if (editForm.open_time >= editForm.close_time) {
    setErrorMsg("L&apos;heure de fermeture doit être après l&apos;heure d&apos;ouverture");
    return;
  }

  if (checkOverlap(slot.day_of_week, editForm.open_time, editForm.close_time, slot.id)) {
    setErrorMsg("Il y a un chevauchement avec une autre plage horaire");
    return;
  }

  updateMutation.mutate(
    { id: slot.id, payload: editForm },
    {
      onSuccess: () => {
        setEditingSlotId(null);
        setEditForm({ open_time: "", close_time: "", is_active: true });
      },
      onError: (error: any) => {
        setErrorMsg(error.message);
      },
    },
  );
}

// Fonction pour supprimer une plage horaire
export function handleDeleteOpeningHour({
  id,
  deleteMutation,
  setErrorMsg,
}: {
  id: string;
  deleteMutation: any;
  setErrorMsg: (msg: string | null) => void;
}) {
  deleteMutation.mutate(id, {
    onError: (error: any) => {
      setErrorMsg(error.message);
    },
  });
}
