"use client";

import React from "react";

import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type BookingSlot = {
  id: string;
  slot_name: string;
  max_capacity: number | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  establishment_id: string;
  created_at: string | null;
  created_by: string | null;
  deleted: boolean | null;
  display_order: number | null;
  valid_from: string | null;
  valid_until: string | null;
};

type TimeSlot = {
  time: string;
  isAvailable: boolean;
  maxCapacity: number;
  slotId: string;
  slotNumber: number;
};

type PeriodInterfaceProps = {
  periodStartDate: Date | undefined;
  periodEndDate: Date | undefined;
  setPeriodStartDate: (date: Date | undefined) => void;
  setPeriodEndDate: (date: Date | undefined) => void;
};

type SingleDayInterfaceProps = {
  singleDate: Date | undefined;
  setSingleDate: (date: Date | undefined) => void;
};

type ServiceInterfaceProps = {
  serviceDate: Date | undefined;
  setServiceDate: (date: Date | undefined) => void;
  selectedService: string;
  setSelectedService: (service: string) => void;
  getServicesForDate: (date: Date) => BookingSlot[];
};

type TimeSlotsInterfaceProps = {
  timeSlotsDate: Date | undefined;
  setTimeSlotsDate: (date: Date | undefined) => void;
  selectedService: string;
  setSelectedService: (service: string) => void;
  selectedTimeSlots: number[];
  handleTimeSlotToggle: (slotId: number) => void;
  getServicesForDate: (date: Date) => BookingSlot[];
  getTimeSlotsForService: (serviceId: string) => TimeSlot[];
};

type ParametersInterfaceProps = {
  reason: string;
  setReason: (reason: string) => void;
  status: string;
  setStatus: (status: "active" | "inactive") => void;
};

// Composant pour l'interface de période
export function PeriodInterface({
  periodStartDate,
  periodEndDate,
  setPeriodStartDate,
  setPeriodEndDate,
}: PeriodInterfaceProps) {
  return (
    <div className="space-y-4">
      <Label>Sélection de la période de fermeture</Label>
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
  );
}

// Composant pour l'interface de jour unique
export function SingleDayInterface({ singleDate, setSingleDate }: SingleDayInterfaceProps) {
  return (
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
  );
}

// Composant pour l'interface de service
export function ServiceInterface({
  serviceDate,
  setServiceDate,
  selectedService,
  setSelectedService,
  getServicesForDate,
}: ServiceInterfaceProps) {
  return (
    <div className="space-y-4">
      <Label>Sélection de la date</Label>
      <div className="flex justify-center">
        <Calendar
          mode="single"
          selected={serviceDate}
          onSelect={setServiceDate}
          className="rounded-md border bg-white"
          numberOfMonths={1}
        />
      </div>
      {serviceDate && (
        <div className="space-y-2">
          <Label>Service à fermer</Label>
          <Select value={selectedService} onValueChange={setSelectedService}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionnez un service" />
            </SelectTrigger>
            <SelectContent>
              {getServicesForDate(serviceDate).map((service) => (
                <SelectItem key={service.id} value={service.id}>
                  {service.slot_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

// Composant pour l'interface de créneaux horaires
export function TimeSlotsInterface({
  timeSlotsDate,
  setTimeSlotsDate,
  selectedService,
  setSelectedService,
  selectedTimeSlots,
  handleTimeSlotToggle,
  getServicesForDate,
  getTimeSlotsForService,
}: TimeSlotsInterfaceProps) {
  return (
    <div className="space-y-4">
      <Label>Sélection de la date</Label>
      <div className="flex justify-center">
        <Calendar
          mode="single"
          selected={timeSlotsDate}
          onSelect={setTimeSlotsDate}
          className="rounded-md border bg-white"
          numberOfMonths={1}
        />
      </div>
      {timeSlotsDate && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Service</Label>
            <Select value={selectedService} onValueChange={setSelectedService}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez un service" />
              </SelectTrigger>
              <SelectContent>
                {getServicesForDate(timeSlotsDate).map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.slot_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedService && (
            <div className="space-y-2">
              <Label>Créneaux à fermer</Label>
              <div className="grid grid-cols-4 gap-2">
                {getTimeSlotsForService(selectedService).map((slot, index) => (
                  <button
                    key={`${slot.slotId}-${slot.slotNumber}`}
                    type="button"
                    onClick={() => handleTimeSlotToggle(slot.slotNumber)}
                    className={`rounded border p-2 text-sm ${
                      selectedTimeSlots.includes(slot.slotNumber)
                        ? "bg-red-500 text-white"
                        : "bg-gray-100 hover:bg-gray-200"
                    }`}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Composant pour les paramètres
export function ParametersInterface({ reason, setReason, status, setStatus }: ParametersInterfaceProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Paramètres</h3>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reason">Raison</Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Raison de l'exception..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Statut</Label>
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
  );
}
