"use client";

import React, { useState, useCallback } from "react";

import { format } from "date-fns";

import { useBookingExceptionsRealtime } from "@/hooks/use-booking-exceptions-crud";

import {
  useServicesAndSlots,
  useCalendarEvents,
  useExceptionsByDate,
  useExceptionTypes,
  BookingExceptionsModal,
  BookingExceptionsList,
} from "./booking-exceptions";
import {
  LoadingState,
  ErrorState,
  Header,
  CalendarSection,
  DeleteEditModal,
} from "./booking-exceptions/booking-exceptions-ui";

type ExceptionType = "period" | "single_day" | "service" | "time_slots";

interface BookingExceptionsSharedProps {
  establishmentId: string;
  organizationId: string;
}

export function BookingExceptionsShared({ establishmentId, organizationId }: BookingExceptionsSharedProps) {
  // Hook realtime
  const {
    exceptions,
    loading,
    error,
    isConnected,
    create,
    update,
    delete: deleteException,
    refresh,
  } = useBookingExceptionsRealtime({
    establishmentId,
    organizationId,
  });

  // Hook pour les services et créneaux
  const { bookingSlots, slotsLoading, slotsError, getServiceName, getTimeSlotsForService } =
    useServicesAndSlots(establishmentId);

  // Hook pour les événements du calendrier
  const { getCalendarEvents } = useCalendarEvents(exceptions);

  // Hook pour les exceptions par date
  const { getExceptionsForDate } = useExceptionsByDate(exceptions);

  // Hook pour les types d'exceptions
  const { getTypeIcon, getTypeLabel } = useExceptionTypes();

  // États pour les types d'exceptions (sous-onglets)
  const [activeExceptionType, setActiveExceptionType] = useState<ExceptionType>("period");

  // États pour la modale
  const [isModalOpen, setIsModalOpen] = useState(false);

  // États pour l'affichage principal
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);

  // États pour la suppression
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [exceptionToDelete, setExceptionToDelete] = useState<any>(null);
  const [isTimeSlotsEditMode, setIsTimeSlotsEditMode] = useState(false);
  const [editedTimeSlots, setEditedTimeSlots] = useState<number[]>([]);

  // Fonction pour formater la date
  const formatDate = useCallback((date: Date) => format(date, "dd/MM/yyyy"), []);

  // Fonction pour créer une exception
  const handleCreateException = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  // Fonction pour gérer le clic sur une date dans FullCalendar
  const handleDateClick = useCallback((clickInfo: any) => {
    setSelectedCalendarDate(clickInfo.date);
  }, []);

  // Fonction pour gérer le clic sur un événement dans FullCalendar
  const handleEventClick = useCallback((clickInfo: any) => {
    const clickedDate = clickInfo.event.start;
    setSelectedCalendarDate(clickedDate);
  }, []);

  // Fonction pour gérer la suppression d'une exception
  const handleDeleteClick = useCallback((exception: any) => {
    setExceptionToDelete(exception);
    if (exception.exception_type === "time_slots") {
      setIsTimeSlotsEditMode(true);
      setEditedTimeSlots(exception.closed_slots ?? []);
    } else {
      setIsTimeSlotsEditMode(false);
      setEditedTimeSlots([]);
    }
    setIsDeleteModalOpen(true);
  }, []);

  // Fonction pour gérer l'édition d'une exception
  const handleEditClick = useCallback((exception: any) => {
    if (exception.exception_type === "time_slots") {
      setExceptionToDelete(exception);
      setIsTimeSlotsEditMode(true);
      setEditedTimeSlots(exception.closed_slots ?? []);
      setIsDeleteModalOpen(true);
    }
  }, []);

  // Fonction pour fermer la modale de suppression
  const handleCloseDeleteModal = useCallback(() => {
    setIsDeleteModalOpen(false);
    setExceptionToDelete(null);
    setIsTimeSlotsEditMode(false);
    setEditedTimeSlots([]);
  }, []);

  // Fonction pour confirmer la suppression
  const handleConfirmDelete = useCallback(() => {
    if (!exceptionToDelete) return;

    if (exceptionToDelete.exception_type === "time_slots" && isTimeSlotsEditMode) {
      if (editedTimeSlots.length === 0) {
        // Supprimer l'exception si aucun créneau n'est sélectionné
        deleteException(exceptionToDelete.id);
      } else {
        // Mettre à jour l'exception avec les nouveaux créneaux
        update({
          id: exceptionToDelete.id,
          closed_slots: editedTimeSlots,
        });
      }
    } else {
      // Suppression directe pour les autres types
      deleteException(exceptionToDelete.id);
    }

    handleCloseDeleteModal();
  }, [exceptionToDelete, isTimeSlotsEditMode, editedTimeSlots, deleteException, update, handleCloseDeleteModal]);

  // Fonction pour basculer un créneau dans le mode édition
  const handleTimeSlotEditToggle = useCallback((slotId: number) => {
    setEditedTimeSlots((prev) => (prev.includes(slotId) ? prev.filter((id) => id !== slotId) : [...prev, slotId]));
  }, []);

  // Affichage des états de chargement et d'erreur
  if (loading || slotsLoading) {
    return <LoadingState />;
  }

  if (error || slotsError) {
    return <ErrorState error={error} slotsError={slotsError} />;
  }

  return (
    <div className="space-y-6">
      <Header onCreateException={handleCreateException} />

      <div className="grid grid-cols-3 gap-6">
        <CalendarSection
          getCalendarEvents={getCalendarEvents}
          handleDateClick={handleDateClick}
          handleEventClick={handleEventClick}
          onCreateException={handleCreateException}
        />

        <div>
          <BookingExceptionsList
            selectedCalendarDate={selectedCalendarDate}
            getExceptionsForDate={getExceptionsForDate}
            onDeleteClick={handleDeleteClick}
            onEditClick={handleEditClick}
            establishmentId={establishmentId}
          />
        </div>
      </div>

      <BookingExceptionsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={create}
        establishmentId={establishmentId}
        organizationId={organizationId}
      />

      <DeleteEditModal
        isOpen={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        exceptionToDelete={exceptionToDelete}
        isTimeSlotsEditMode={isTimeSlotsEditMode}
        editedTimeSlots={editedTimeSlots}
        handleCloseDeleteModal={handleCloseDeleteModal}
        handleConfirmDelete={handleConfirmDelete}
        handleTimeSlotEditToggle={handleTimeSlotEditToggle}
        getServiceName={getServiceName}
        getTimeSlotsForService={getTimeSlotsForService}
      />
    </div>
  );
}
