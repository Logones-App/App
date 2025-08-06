"use client";

import { usePathname } from "next/navigation";

import { useTranslations } from "next-intl";

import { useOpeningHoursRealtime, type OpeningHour } from "./_components";
import { handleAddOpeningHour, handleSaveOpeningHour, handleDeleteOpeningHour } from "./opening-hours-actions";
import { AddForm } from "./opening-hours-add-form";
import { EmptyState } from "./opening-hours-empty-state";
import { ErrorAlert } from "./opening-hours-error-alert";
import { useOpeningHoursHandlers } from "./opening-hours-handlers";
import { OpeningHoursList } from "./opening-hours-list";
import { useOpeningHoursMutations } from "./opening-hours-mutations";
import { PageHeader } from "./opening-hours-page-header";
import { SectionHeader } from "./opening-hours-section-header";
import { OpeningHoursLoading, OpeningHoursError, OpeningHoursDisconnected } from "./opening-hours-states";

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
  const { openingHours, loading: isLoading, error, isConnected } = useOpeningHoursRealtime(establishmentId);

  const { addMutation, deleteMutation, updateMutation } = useOpeningHoursMutations(establishmentId);
  const {
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
  } = useOpeningHoursHandlers(openingHours);

  // Fonction pour ajouter une plage horaire
  const handleAdd = () => {
    handleAddOpeningHour({
      addForm,
      organizationId,
      checkOverlap,
      addMutation,
      setShowAddForm,
      setAddForm,
      setErrorMsg,
    });
  };

  // Fonction pour sauvegarder l'édition
  const saveEdit = (slot: OpeningHour) => {
    handleSaveOpeningHour({
      editForm,
      slot,
      checkOverlap,
      updateMutation,
      setEditingSlotId,
      setEditForm,
      setErrorMsg,
    });
  };

  // Fonction pour supprimer une plage horaire
  const deleteSlot = (id: string) => {
    handleDeleteOpeningHour({
      id,
      deleteMutation,
      setErrorMsg,
    });
  };

  if (isLoading) return <OpeningHoursLoading />;
  if (error) return <OpeningHoursError error={error} />;

  return (
    <div className="space-y-6">
      <PageHeader backLink={backLink} t={t} />

      <ErrorAlert errorMsg={errorMsg} />

      {!isConnected && <OpeningHoursDisconnected />}

      <SectionHeader setShowAddForm={setShowAddForm} showAddForm={showAddForm} />

      {showAddForm && (
        <AddForm
          addForm={addForm}
          setAddForm={setAddForm}
          handleAdd={handleAdd}
          setShowAddForm={setShowAddForm}
          t={t}
        />
      )}

      {openingHours.length === 0 ? (
        <EmptyState setShowAddForm={setShowAddForm} />
      ) : (
        <OpeningHoursList
          openingHours={openingHours}
          editingSlotId={editingSlotId}
          editForm={editForm}
          setEditForm={setEditForm}
          startEdit={startEdit}
          cancelEdit={cancelEdit}
          saveEdit={saveEdit}
          deleteSlot={deleteSlot}
          t={t}
        />
      )}
    </div>
  );
}
