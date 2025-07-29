"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarRange, CalendarDays, Clock, Plus, X, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// FullCalendar imports
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";

interface BookingExceptionsSharedProps {
  establishmentId: string;
  organizationId: string;
}

type ExceptionType = "period" | "single_day" | "service" | "time_slots";

export function BookingExceptionsShared({ establishmentId, organizationId }: BookingExceptionsSharedProps) {
  // États pour les types d'exceptions (sous-onglets)
  const [activeExceptionType, setActiveExceptionType] = useState<ExceptionType>("period");

  // États pour la modale
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExceptionType, setSelectedExceptionType] = useState<ExceptionType>("period");

  // États pour les sélections dans la modale
  const [periodStartDate, setPeriodStartDate] = useState<Date>();
  const [periodEndDate, setPeriodEndDate] = useState<Date>();
  const [singleDate, setSingleDate] = useState<Date>();
  const [serviceDate, setServiceDate] = useState<Date>();
  const [selectedService, setSelectedService] = useState<string>("");
  const [timeSlotsDate, setTimeSlotsDate] = useState<Date>();
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<number[]>([]);

  // États pour l'affichage principal
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);

  // États pour la suppression
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [exceptionToDelete, setExceptionToDelete] = useState<any>(null);
  const [isTimeSlotsEditMode, setIsTimeSlotsEditMode] = useState(false);
  const [editedTimeSlots, setEditedTimeSlots] = useState<number[]>([]);

  // États pour le formulaire latéral
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");

  // Données mockées pour les tests
  const mockServices = [
    { id: "1", name: "Déjeuner" },
    { id: "2", name: "Dîner" },
    { id: "3", name: "Brunch" },
  ];

  const mockTimeSlots = [
    { id: 0, time: "12:00", label: "12h00" },
    { id: 1, time: "12:30", label: "12h30" },
    { id: 2, time: "13:00", label: "13h00" },
    { id: 3, time: "13:30", label: "13h30" },
    { id: 4, time: "19:00", label: "19h00" },
    { id: 5, time: "19:30", label: "19h30" },
    { id: 6, time: "20:00", label: "20h00" },
    { id: 7, time: "20:30", label: "20h30" },
  ];

  // Exceptions existantes (mock)
  const existingExceptions = [
    {
      id: "1",
      type: "period",
      name: "Fermeture estivale",
      start_date: "2025-07-15",
      end_date: "2025-08-15",
      status: "active",
      reason: "Congés d'été",
    },
    {
      id: "2",
      type: "single_day",
      name: "Jour férié",
      date: "2025-07-14",
      status: "active",
      reason: "14 juillet",
    },
    {
      id: "3",
      type: "service",
      name: "Fermeture exceptionnelle",
      date: "2025-07-03",
      service: "Dîner",
      status: "inactive",
      reason: "Événement privé",
    },
    {
      id: "4",
      type: "time_slots",
      name: "Fermeture créneaux",
      date: "2025-07-01",
      time_slots: ["12:00", "12:30", "13:00"],
      status: "active",
      reason: "Maintenance",
    },
    {
      id: "5",
      type: "period",
      name: "Fermeture inter-mois",
      start_date: "2025-07-30",
      end_date: "2025-08-02",
      status: "active",
      reason: "Fermeture exceptionnelle",
    },
    {
      id: "6",
      type: "service",
      name: "Service fermé",
      date: "2025-07-20",
      service: "Déjeuner",
      status: "active",
      reason: "Événement privé",
    },
    {
      id: "7",
      type: "time_slots",
      name: "Créneaux fermés",
      date: "2025-07-25",
      time_slots: ["19:00", "19:30", "20:00"],
      status: "active",
      reason: "Maintenance",
    },
    {
      id: "8",
      type: "single_day",
      name: "Jour spécial",
      date: "2025-07-10",
      status: "active",
      reason: "Événement spécial",
    },
  ];

  // Fonction pour formater la date
  const formatDate = (date: Date) => format(date, "dd/MM/yyyy");

  // Fonction pour créer une exception (mock)
  const handleCreateException = () => {
    setIsModalOpen(true);
  };

  // Fonction pour fermer la modale
  const handleCloseModal = () => {
    setIsModalOpen(false);
    // Reset des sélections
    setSelectedExceptionType("period");
    setPeriodStartDate(undefined);
    setPeriodEndDate(undefined);
    setSingleDate(undefined);
    setServiceDate(undefined);
    setSelectedService("");
    setTimeSlotsDate(undefined);
    setSelectedTimeSlots([]);
    setReason("");
    setStatus("active");
  };

  // Fonction pour basculer un créneau horaire
  const handleTimeSlotToggle = (slotId: number) => {
    setSelectedTimeSlots((prev) => (prev.includes(slotId) ? prev.filter((id) => id !== slotId) : [...prev, slotId]));
  };

  // Fonction pour valider la création
  const handleValidateCreation = () => {
    handleCloseModal();
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

  // Fonction pour obtenir les événements FullCalendar
  const getCalendarEvents = () => {
    return existingExceptions.map((exception) => {
      let event = {
        id: exception.id,
        title: exception.name,
        backgroundColor: "",
        borderColor: "",
        textColor: "#ffffff",
        className: "cursor-pointer hover:opacity-80",
      };

      switch (exception.type) {
        case "period":
          event.backgroundColor = "#ef4444";
          event.borderColor = "#dc2626";
          event.title = `${exception.name} (${exception.start_date} - ${exception.end_date})`;
          return {
            ...event,
            start: exception.start_date,
            end: exception.end_date,
          };
        case "single_day":
          event.backgroundColor = "#f59e0b";
          event.borderColor = "#d97706";
          event.title = `${exception.name} (${exception.date})`;
          return {
            ...event,
            start: exception.date,
            end: exception.date,
          };
        case "service":
          event.backgroundColor = "#8b5cf6";
          event.borderColor = "#7c3aed";
          event.title = `${exception.name} - ${exception.service} (${exception.date})`;
          return {
            ...event,
            start: exception.date,
            end: exception.date,
          };
        case "time_slots":
          event.backgroundColor = "#3b82f6";
          event.borderColor = "#2563eb";
          event.title = `${exception.name} - Créneaux (${exception.date})`;
          return {
            ...event,
            start: exception.date,
            end: exception.date,
          };
        default:
          return event;
      }
    });
  };

  // Fonction pour obtenir les exceptions de la date sélectionnée
  const getExceptionsForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const filteredExceptions = existingExceptions.filter((exception) => {
      let isIncluded = false;

      switch (exception.type) {
        case "period":
          // Pour les périodes, vérifier si la date est dans la plage (inclusive)
          isIncluded = dateStr >= exception.start_date && dateStr <= exception.end_date;
          return isIncluded;
        case "single_day":
          // Pour les jours uniques, vérifier si la date correspond exactement
          isIncluded = dateStr === exception.date;
          return isIncluded;
        case "service":
          // Pour les services, vérifier si la date correspond
          isIncluded = dateStr === exception.date;
          return isIncluded;
        case "time_slots":
          // Pour les créneaux, vérifier si la date correspond
          isIncluded = dateStr === exception.date;
          return isIncluded;
        default:
          return false;
      }
    });

    return filteredExceptions;
  };

  // Fonction pour ouvrir la modale de suppression
  const handleDeleteClick = (exception: any) => {
    setExceptionToDelete(exception);
    if (exception.type === "time_slots") {
      setIsTimeSlotsEditMode(true);
      setEditedTimeSlots(
        exception.time_slots
          ?.map((time: string) => {
            const slot = mockTimeSlots.find((s) => s.time === time);
            return slot ? slot.id : -1;
          })
          .filter((id: number) => id !== -1) || [],
      );
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

    if (exceptionToDelete.type === "time_slots" && isTimeSlotsEditMode) {
      if (editedTimeSlots.length === 0) {
        // Supprimer l'exception si aucun créneau n'est sélectionné
      } else {
        // Mettre à jour l'exception avec les nouveaux créneaux
      }
    } else {
      // Suppression directe pour les autres types
    }

    handleCloseDeleteModal();
  };

  // Fonction pour basculer un créneau dans le mode édition
  const handleTimeSlotEditToggle = (slotId: number) => {
    setEditedTimeSlots((prev) => (prev.includes(slotId) ? prev.filter((id) => id !== slotId) : [...prev, slotId]));
  };

  // Fonction pour obtenir l'icône selon le type
  const getTypeIcon = (type: ExceptionType) => {
    switch (type) {
      case "period":
        return <CalendarRange className="h-4 w-4" />;
      case "single_day":
        return <CalendarDays className="h-4 w-4" />;
      case "service":
        return <Clock className="h-4 w-4" />;
      case "time_slots":
        return <Clock className="h-4 w-4" />;
      default:
        return <CalendarRange className="h-4 w-4" />;
    }
  };

  // Fonction pour obtenir le label du type
  const getTypeLabel = (type: ExceptionType) => {
    switch (type) {
      case "period":
        return "Période";
      case "single_day":
        return "Jour unique";
      case "service":
        return "Service";
      case "time_slots":
        return "Créneaux";
      default:
        return "Période";
    }
  };

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestion des exceptions</h1>
          <p className="text-muted-foreground">Gérez les fermetures et modifications d'horaires pour l'établissement</p>
        </div>
        <Button onClick={handleCreateException} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Créer l'exception
        </Button>
      </div>

      {/* Contenu principal */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* FullCalendar à gauche (2/3) */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Calendrier des exceptions</CardTitle>
              <CardDescription>Cliquez sur une journée ou un événement pour voir les exceptions</CardDescription>
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
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedCalendarDate
                  ? `Exceptions du ${format(selectedCalendarDate, "dd/MM/yyyy")}`
                  : "Sélectionnez une date"}
              </CardTitle>
              <CardDescription>
                {selectedCalendarDate
                  ? `${getExceptionsForDate(selectedCalendarDate).length} exception(s) trouvée(s)`
                  : "Cliquez sur une journée dans le calendrier"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedCalendarDate ? (
                  getExceptionsForDate(selectedCalendarDate).map((exception) => (
                    <div key={exception.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{exception.name}</h4>
                          <Badge variant={exception.status === "active" ? "default" : "secondary"}>
                            {exception.status === "active" ? "Actif" : "Inactif"}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(exception)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-muted-foreground text-sm">{exception.reason}</p>
                      <div className="text-muted-foreground mt-2 text-xs">
                        {exception.type === "period" && (
                          <span>
                            Période : {exception.start_date} → {exception.end_date}
                          </span>
                        )}
                        {exception.type === "single_day" && <span>Jour unique : {exception.date}</span>}
                        {exception.type === "service" && (
                          <span>
                            Service {exception.service} désactivé : {exception.date}
                          </span>
                        )}
                        {exception.type === "time_slots" && (
                          <span>
                            Service - Créneaux {exception.time_slots?.join(", ")} fermés : {exception.date}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-muted-foreground py-8 text-center">
                    <p>Sélectionnez une date dans le calendrier</p>
                    <p className="text-sm">pour voir les exceptions de cette journée</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modale de création d'exception */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Créer une nouvelle exception</DialogTitle>
            <DialogDescription>Configurez les paramètres de votre exception de réservation</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-6">
            {/* Interface principale */}
            <div>
              {/* Configuration de l'exception */}
              <div className="space-y-6">
                {/* Menu déroulant pour le type */}
                <div className="space-y-2">
                  <Label htmlFor="exception-type">Type d'exception</Label>
                  <Select
                    value={selectedExceptionType}
                    onValueChange={(value: ExceptionType) => setSelectedExceptionType(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="period">Période</SelectItem>
                      <SelectItem value="single_day">Jour unique</SelectItem>
                      <SelectItem value="service">Service</SelectItem>
                      <SelectItem value="time_slots">Créneaux horaires</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Interface conditionnelle selon le type */}
                {selectedExceptionType === "period" && (
                  <div className="space-y-4">
                    <Label>Sélection de la période</Label>
                    <div className="flex justify-center">
                      <Calendar
                        mode="range"
                        selected={{
                          from: periodStartDate,
                          to: periodEndDate,
                        }}
                        onSelect={(range) => {
                          setPeriodStartDate(range?.from);
                          setPeriodEndDate(range?.to);
                        }}
                        className="rounded-md border bg-white"
                        numberOfMonths={1}
                      />
                    </div>
                  </div>
                )}

                {selectedExceptionType === "single_day" && (
                  <div className="space-y-4">
                    <Label>Sélection de la date</Label>
                    <div className="flex justify-center">
                      <Calendar
                        mode="single"
                        selected={singleDate}
                        onSelect={setSingleDate}
                        className="rounded-md border bg-white"
                        numberOfMonths={1}
                      />
                    </div>
                  </div>
                )}

                {selectedExceptionType === "service" && (
                  <div className="space-y-6">
                    {/* Sélection de date */}
                    <div className="space-y-4">
                      <Label>Date de l'exception</Label>
                      <div className="flex justify-center">
                        <Calendar
                          mode="single"
                          selected={serviceDate}
                          onSelect={setServiceDate}
                          className="rounded-md border bg-white"
                          numberOfMonths={1}
                        />
                      </div>
                    </div>

                    {/* Sélection de service */}
                    {serviceDate && (
                      <div className="space-y-4">
                        <Label>Service à désactiver</Label>
                        <div className="grid grid-cols-1 gap-2">
                          {mockServices.map((service) => (
                            <Button
                              key={service.id}
                              variant={selectedService === service.id ? "default" : "outline"}
                              className="justify-start"
                              onClick={() => setSelectedService(service.id)}
                            >
                              <div className="flex w-full items-center justify-between">
                                <span>{service.name}</span>
                              </div>
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {selectedExceptionType === "time_slots" && (
                  <div className="space-y-6">
                    {/* Sélection de date */}
                    <div className="space-y-4">
                      <Label>Date de l'exception</Label>
                      <div className="flex justify-center">
                        <Calendar
                          mode="single"
                          selected={timeSlotsDate}
                          onSelect={setTimeSlotsDate}
                          className="rounded-md border bg-white"
                          numberOfMonths={1}
                        />
                      </div>
                    </div>

                    {/* Sélection de service */}
                    {timeSlotsDate && (
                      <div className="space-y-4">
                        <Label>Service concerné</Label>
                        <div className="grid grid-cols-1 gap-2">
                          {mockServices.map((service) => (
                            <Button
                              key={service.id}
                              variant={selectedService === service.id ? "default" : "outline"}
                              className="justify-start"
                              onClick={() => setSelectedService(service.id)}
                            >
                              <div className="flex w-full items-center justify-between">
                                <span>{service.name}</span>
                              </div>
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sélection de créneaux */}
                    {timeSlotsDate && selectedService && (
                      <div className="space-y-4">
                        <Label>Créneaux à fermer</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {mockTimeSlots.map((slot) => (
                            <Button
                              key={slot.id}
                              variant={selectedTimeSlots.includes(slot.id) ? "destructive" : "outline"}
                              size="sm"
                              onClick={() => handleTimeSlotToggle(slot.id)}
                            >
                              {slot.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Paramètres en dessous */}
              <div className="mt-6 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Paramètres</h3>
                  <p className="text-muted-foreground text-sm">Configuration générale</p>
                </div>

                {/* Affichage de la sélection */}
                <div className="bg-muted/30 rounded-lg border p-4 text-center">
                  <p className="text-muted-foreground text-sm">Sélection actuelle</p>
                  <p className="text-primary text-lg font-semibold">
                    {selectedExceptionType === "period" && periodStartDate && periodEndDate && (
                      <span>
                        {formatDate(periodStartDate)} → {formatDate(periodEndDate)}
                      </span>
                    )}
                    {selectedExceptionType === "single_day" && singleDate && <span>{formatDate(singleDate)}</span>}
                    {selectedExceptionType === "service" && serviceDate && selectedService && (
                      <span>
                        {formatDate(serviceDate)} - {mockServices.find((s) => s.id === selectedService)?.name}
                      </span>
                    )}
                    {selectedExceptionType === "time_slots" && timeSlotsDate && (
                      <span>
                        {formatDate(timeSlotsDate)} -{" "}
                        {mockServices.find((s) => s.id === selectedService)?.name || "Service non sélectionné"} -{" "}
                        {selectedTimeSlots.length} créneau(s)
                      </span>
                    )}
                    {!periodStartDate && !singleDate && !serviceDate && !timeSlotsDate && (
                      <span className="text-muted-foreground">Aucune sélection</span>
                    )}
                  </p>
                </div>

                {/* Raison */}
                <div>
                  <Label htmlFor="modal-reason">Raison</Label>
                  <Textarea
                    id="modal-reason"
                    placeholder="Raison de l'exception..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>

                {/* Statut */}
                <div>
                  <Label htmlFor="modal-status">Statut</Label>
                  <Select value={status} onValueChange={(value: "active" | "inactive") => setStatus(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Actif</SelectItem>
                      <SelectItem value="inactive">Inactif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Footer avec les boutons */}
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={handleCloseModal}>
              Annuler
            </Button>
            <Button onClick={handleValidateCreation}>Créer l'exception</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modale de suppression */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {exceptionToDelete?.type === "time_slots" ? "Modifier les créneaux" : "Supprimer l'exception"}
            </DialogTitle>
            <DialogDescription>
              {exceptionToDelete?.type === "time_slots" ? (
                <span>
                  Modifiez les créneaux pour l'exception "{exceptionToDelete?.name}". Décochez tous les créneaux pour
                  supprimer l'exception.
                </span>
              ) : (
                <span>
                  Êtes-vous sûr de vouloir supprimer l'exception "{exceptionToDelete?.name}" ? Cette action est
                  irréversible.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Interface spéciale pour les créneaux */}
          {exceptionToDelete?.type === "time_slots" && isTimeSlotsEditMode && (
            <div className="space-y-4">
              <div>
                <Label>Service concerné</Label>
                <p className="text-muted-foreground text-sm">
                  {mockServices.find((s) => s.id === selectedService)?.name || "Service non spécifié"}
                </p>
              </div>

              <div>
                <Label>Créneaux à fermer</Label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {mockTimeSlots.map((slot) => (
                    <Button
                      key={slot.id}
                      variant={editedTimeSlots.includes(slot.id) ? "destructive" : "outline"}
                      size="sm"
                      onClick={() => handleTimeSlotEditToggle(slot.id)}
                    >
                      {slot.label}
                    </Button>
                  ))}
                </div>
                <p className="text-muted-foreground mt-2 text-xs">
                  {editedTimeSlots.length === 0
                    ? "Aucun créneau sélectionné - l'exception sera supprimée"
                    : `${editedTimeSlots.length} créneau(s) sélectionné(s)`}
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={handleCloseDeleteModal}>
              Annuler
            </Button>
            <Button
              variant={exceptionToDelete?.type === "time_slots" ? "default" : "destructive"}
              onClick={handleConfirmDelete}
            >
              {exceptionToDelete?.type === "time_slots" ? "Enregistrer" : "Supprimer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
