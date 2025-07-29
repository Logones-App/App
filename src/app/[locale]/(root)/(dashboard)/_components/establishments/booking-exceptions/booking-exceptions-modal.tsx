"use client";

import React, { useState } from "react";

import { format } from "date-fns";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CreateBookingExceptionData } from "@/hooks/use-booking-exceptions-crud";

import {
  PeriodInterface,
  SingleDayInterface,
  ServiceInterface,
  TimeSlotsInterface,
  ParametersInterface,
} from "./modal-interfaces";
import { useServicesAndSlots } from "./use-booking-exceptions-hooks";

type ExceptionType = "period" | "single_day" | "service" | "time_slots";

interface BookingExceptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (exceptionData: CreateBookingExceptionData) => void;
  establishmentId: string;
  organizationId: string;
}

export function BookingExceptionsModal({
  isOpen,
  onClose,
  onCreate,
  establishmentId,
  organizationId,
}: BookingExceptionsModalProps) {
  // Hook pour les services et créneaux
  const { getServicesForDate, getTimeSlotsForService } = useServicesAndSlots(establishmentId);

  // États pour les sélections dans la modale
  const [selectedExceptionType, setSelectedExceptionType] = useState<ExceptionType>("period");
  const [periodStartDate, setPeriodStartDate] = useState<Date>();
  const [periodEndDate, setPeriodEndDate] = useState<Date>();
  const [singleDate, setSingleDate] = useState<Date>();
  const [serviceDate, setServiceDate] = useState<Date>();
  const [selectedService, setSelectedService] = useState<string>("");
  const [timeSlotsDate, setTimeSlotsDate] = useState<Date>();
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<number[]>([]);
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");

  // Fonction pour fermer la modale
  const handleCloseModal = () => {
    onClose();
    // Réinitialiser tous les états
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
  const validatePeriodException = () => {
    if (periodStartDate && periodEndDate) {
      return {
        start_date: format(periodStartDate, "yyyy-MM-dd"),
        end_date: format(periodEndDate, "yyyy-MM-dd"),
      };
    }
    return null;
  };

  const validateSingleDayException = () => {
    if (singleDate) {
      return {
        date: format(singleDate, "yyyy-MM-dd"),
      };
    }
    return null;
  };

  const validateServiceException = () => {
    if (serviceDate && selectedService) {
      return {
        date: format(serviceDate, "yyyy-MM-dd"),
        booking_slot_id: selectedService,
      };
    }
    return null;
  };

  const validateTimeSlotsException = () => {
    if (timeSlotsDate && selectedService && selectedTimeSlots.length > 0) {
      return {
        date: format(timeSlotsDate, "yyyy-MM-dd"),
        booking_slot_id: selectedService,
        closed_slots: selectedTimeSlots,
      };
    }
    return null;
  };

  const validateExceptionData = () => {
    let validationResult = null;
    let errorMessage = "";

    switch (selectedExceptionType) {
      case "period":
        validationResult = validatePeriodException();
        if (!validationResult) {
          errorMessage = "Veuillez sélectionner une période valide";
        }
        break;
      case "single_day":
        validationResult = validateSingleDayException();
        if (!validationResult) {
          errorMessage = "Veuillez sélectionner une date";
        }
        break;
      case "service":
        validationResult = validateServiceException();
        if (!validationResult) {
          errorMessage = "Veuillez sélectionner une date et un service";
        }
        break;
      case "time_slots":
        validationResult = validateTimeSlotsException();
        if (!validationResult) {
          errorMessage = "Veuillez sélectionner une date, un service et au moins un créneau";
        }
        break;
    }

    return { validationResult, errorMessage };
  };

  const handleValidateCreation = () => {
    const { validationResult, errorMessage } = validateExceptionData();

    // Vérifier la validité et créer l'exception
    if (!validationResult) {
      console.error("❌ Erreur de validation:", errorMessage);
      return;
    }

    // Fusionner les données de validation avec les données de base
    const finalExceptionData: CreateBookingExceptionData = {
      establishment_id: establishmentId,
      organization_id: organizationId,
      exception_type: selectedExceptionType,
      reason: reason || undefined,
      status: status || "active",
      ...validationResult,
    };

    // Créer l'exception
    onCreate(finalExceptionData);
    handleCloseModal();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
                <Label htmlFor="exception-type">Type d&apos;exception</Label>
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
                <PeriodInterface
                  periodStartDate={periodStartDate}
                  periodEndDate={periodEndDate}
                  setPeriodStartDate={setPeriodStartDate}
                  setPeriodEndDate={setPeriodEndDate}
                />
              )}

              {selectedExceptionType === "single_day" && (
                <SingleDayInterface singleDate={singleDate} setSingleDate={setSingleDate} />
              )}

              {selectedExceptionType === "service" && (
                <ServiceInterface
                  serviceDate={serviceDate}
                  setServiceDate={setServiceDate}
                  selectedService={selectedService}
                  setSelectedService={setSelectedService}
                  getServicesForDate={getServicesForDate}
                />
              )}

              {selectedExceptionType === "time_slots" && (
                <TimeSlotsInterface
                  timeSlotsDate={timeSlotsDate}
                  setTimeSlotsDate={setTimeSlotsDate}
                  selectedService={selectedService}
                  setSelectedService={setSelectedService}
                  selectedTimeSlots={selectedTimeSlots}
                  handleTimeSlotToggle={handleTimeSlotToggle}
                  getServicesForDate={getServicesForDate}
                  getTimeSlotsForService={getTimeSlotsForService}
                />
              )}
            </div>
          </div>

          {/* Paramètres latéraux */}
          <ParametersInterface reason={reason} setReason={setReason} status={status} setStatus={setStatus} />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-gray-600 hover:text-gray-800">
            Annuler
          </button>
          <button
            type="button"
            onClick={handleValidateCreation}
            className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            Créer l&apos;exception
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
