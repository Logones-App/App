"use client";

import React, { useState } from "react";

import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import { format } from "date-fns";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBookingExceptionsRealtime } from "@/hooks/use-booking-exceptions-crud";

import {
  useServicesAndSlots,
  useCalendarEvents,
  useExceptionsByDate,
  useExceptionTypes,
  BookingExceptionsModal,
  BookingExceptionsList,
} from "./booking-exceptions";

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
  const { bookingSlots, slotsLoading, slotsError } = useServicesAndSlots(establishmentId);

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
  const formatDate = (date: Date) => format(date, "dd/MM/yyyy");

  // Fonction pour créer une exception
  const handleCreateException = () => {
    setIsModalOpen(true);
  };

  // Fonction pour gérer le clic sur une date dans FullCalendar
  const handleDateClick = (clickInfo: any) => {
    setSelectedCalendarDate(clickInfo.date);
  };

  // Fonction pour gérer le clic sur un événement dans FullCalendar
  const handleEventClick = (clickInfo: any) => {
    const clickedDate = clickInfo.event.start;
    setSelectedCalendarDate(clickedDate);
  };

  // Fonction pour gérer la suppression d'une exception
  const handleDeleteClick = (exception: any) => {
    setExceptionToDelete(exception);
    if (exception.exception_type === "time_slots") {
      setIsTimeSlotsEditMode(true);
      setEditedTimeSlots(exception.closed_slots ?? []);
    } else {
      setIsTimeSlotsEditMode(false);
      setEditedTimeSlots([]);
    }
    setIsDeleteModalOpen(true);
  };

  // Fonction pour fermer la modale de suppression
  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setExceptionToDelete(null);
    setIsTimeSlotsEditMode(false);
    setEditedTimeSlots([]);
  };

  // Fonction pour confirmer la suppression
  const handleConfirmDelete = () => {
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
  };

  // Fonction pour basculer un créneau dans le mode édition
  const handleTimeSlotEditToggle = (slotId: number) => {
    setEditedTimeSlots((prev) => (prev.includes(slotId) ? prev.filter((id) => id !== slotId) : [...prev, slotId]));
  };

  // Affichage des états de chargement et d'erreur
  if (loading || slotsLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p>Chargement des exceptions...</p>
      </div>
    );
  }

  if (error || slotsError) {
    const errorMessage =
      typeof error === "object" && error !== null && "message" in error
        ? String((error as { message?: string }).message)
        : String(error ?? slotsError ?? "Erreur inconnue");
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-red-500">Erreur : {errorMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec bouton de création */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestion des exceptions de réservation</h1>
          <p className="text-muted-foreground">
            Gérez les périodes de fermeture et les exceptions pour votre établissement
          </p>
        </div>
        <Button onClick={handleCreateException} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Créer l&apos;exception
        </Button>
      </div>

      {/* Interface principale */}
      <div className="grid grid-cols-3 gap-6">
        {/* Calendrier à gauche (2/3) */}
        <div className="col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Calendrier des exceptions</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Légende */}
              <div className="mb-4 flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-red-500"></div>
                  <span>Période</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-orange-500"></div>
                  <span>Jour unique</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-purple-500"></div>
                  <span>Service</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-blue-500"></div>
                  <span>Créneaux</span>
                </div>
              </div>

              {/* FullCalendar */}
              <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                events={getCalendarEvents()}
                dateClick={handleDateClick}
                eventClick={handleEventClick}
                headerToolbar={{
                  left: "prev,next today",
                  center: "title",
                  right: "dayGridMonth,dayGridWeek",
                }}
                height="auto"
                locale="fr"
                dayMaxEvents={true}
                weekends={true}
              />
            </CardContent>
          </Card>
        </div>

        {/* Liste des exceptions à droite (1/3) */}
        <div>
          <BookingExceptionsList
            selectedCalendarDate={selectedCalendarDate}
            getExceptionsForDate={getExceptionsForDate}
            onDeleteClick={handleDeleteClick}
            establishmentId={establishmentId}
          />
        </div>
      </div>

      {/* Modale de création d'exception */}
      <BookingExceptionsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={create}
        establishmentId={establishmentId}
        organizationId={organizationId}
      />

      {/* Modale de suppression */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer cette exception ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCloseDeleteModal}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Supprimer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
