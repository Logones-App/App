"use client";

import React from "react";

import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Composant pour l'état de chargement
export function LoadingState() {
  return (
    <div className="flex h-64 items-center justify-center">
      <p>Chargement des exceptions...</p>
    </div>
  );
}

// Composant pour l'état d'erreur
export function ErrorState({ error, slotsError }: { error: any; slotsError: any }) {
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

// Composant pour l'en-tête
export function Header({ onCreateException }: { onCreateException: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">Gestion des fermetures de réservation</h1>
        <p className="text-muted-foreground">
          Gérez les périodes de fermeture et les indisponibilités pour votre établissement
        </p>
      </div>
      <Button onClick={onCreateException} className="flex items-center gap-2">
        <Plus className="h-4 w-4" />
        Créer une fermeture
      </Button>
    </div>
  );
}

// Composant pour la légende du calendrier
export function CalendarLegend() {
  return (
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
  );
}

// Composant pour le calendrier
export function CalendarSection({
  getCalendarEvents,
  handleDateClick,
  handleEventClick,
  onCreateException,
}: {
  getCalendarEvents: () => any[];
  handleDateClick: (clickInfo: any) => void;
  handleEventClick: (clickInfo: any) => void;
  onCreateException: () => void;
}) {
  return (
    <div className="col-span-2">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Calendrier des fermetures</CardTitle>
            <Button onClick={onCreateException} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Créer une fermeture
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <CalendarLegend />
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
  );
}

// Composant pour l'interface d'édition des créneaux
export function TimeSlotsEditInterface({
  exceptionToDelete,
  editedTimeSlots,
  handleTimeSlotEditToggle,
  getServiceName,
  getTimeSlotsForService,
}: {
  exceptionToDelete: any;
  editedTimeSlots: number[];
  handleTimeSlotEditToggle: (slotId: number) => void;
  getServiceName: (id: string) => string;
  getTimeSlotsForService: (id: string) => any[];
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h4 className="font-semibold">Service concerné</h4>
        <p className="text-muted-foreground text-sm">{getServiceName(exceptionToDelete.booking_slot_id)}</p>
      </div>
      <div className="space-y-2">
        <h4 className="font-semibold">Créneaux à fermer</h4>
        <div className="grid grid-cols-4 gap-2">
          {getTimeSlotsForService(exceptionToDelete.booking_slot_id).map((slot) => (
            <button
              key={`${slot.slotId}-${slot.slotNumber}`}
              type="button"
              onClick={() => handleTimeSlotEditToggle(slot.slotNumber)}
              className={`rounded border p-2 text-sm ${
                editedTimeSlots.includes(slot.slotNumber) ? "bg-red-500 text-white" : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              {slot.time}
            </button>
          ))}
        </div>
        <p className="text-muted-foreground text-xs">Créneaux sélectionnés : {editedTimeSlots.length}</p>
      </div>
    </div>
  );
}

// Composant pour la modale de suppression/édition
export function DeleteEditModal({
  isOpen,
  onOpenChange,
  exceptionToDelete,
  isTimeSlotsEditMode,
  editedTimeSlots,
  handleCloseDeleteModal,
  handleConfirmDelete,
  handleTimeSlotEditToggle,
  getServiceName,
  getTimeSlotsForService,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  exceptionToDelete: any;
  isTimeSlotsEditMode: boolean;
  editedTimeSlots: number[];
  handleCloseDeleteModal: () => void;
  handleConfirmDelete: () => void;
  handleTimeSlotEditToggle: (slotId: number) => void;
  getServiceName: (id: string) => string;
  getTimeSlotsForService: (id: string) => any[];
}) {
  const isEditMode = exceptionToDelete?.exception_type === "time_slots" && isTimeSlotsEditMode;
  const buttonText = isEditMode
    ? editedTimeSlots.length > 0
      ? "Modifier la fermeture"
      : "Supprimer la fermeture"
    : "Supprimer";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Modifier les créneaux fermés" : "Confirmer la suppression"}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Modifiez les créneaux fermés pour cette fermeture. Si aucun créneau n'est sélectionné, la fermeture sera supprimée."
              : "Êtes-vous sûr de vouloir supprimer cette fermeture ? Cette action est irréversible."}
          </DialogDescription>
        </DialogHeader>

        {isEditMode && (
          <TimeSlotsEditInterface
            exceptionToDelete={exceptionToDelete}
            editedTimeSlots={editedTimeSlots}
            handleTimeSlotEditToggle={handleTimeSlotEditToggle}
            getServiceName={getServiceName}
            getTimeSlotsForService={getTimeSlotsForService}
          />
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleCloseDeleteModal}>
            Annuler
          </Button>
          <Button variant={isEditMode ? "default" : "destructive"} onClick={handleConfirmDelete}>
            {buttonText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
