import { format } from "date-fns";

import { Tables } from "@/lib/supabase/database.types";

export type BookingException = Tables<"booking_exceptions">;
export type BookingSlot = Tables<"booking_slots">;

export interface TimeSlot {
  time: string;
  isAvailable: boolean;
  maxCapacity: number;
  slotId?: string;
}

export interface ServiceGroup {
  serviceName: string;
  slots: TimeSlot[];
}

// Fonction pour vérifier une exception de type "period"
export function checkPeriodException(exception: BookingException, date: string): boolean {
  if (!exception.start_date || !exception.end_date) return false;
  return date >= exception.start_date && date <= exception.end_date;
}

// Fonction pour vérifier une exception de type "single_day"
export function checkSingleDayException(exception: BookingException, date: string): boolean {
  // Convertir la date reçue en Date object pour utiliser format()
  const dateObj = new Date(date + "T00:00:00");
  const formattedDate = format(dateObj, "yyyy-MM-dd");

  return exception.date === formattedDate;
}

// Fonction pour vérifier une exception de type "service"
export function checkServiceException(exception: BookingException, slot: BookingSlot, date: string): boolean {
  if (!exception.date || !exception.booking_slot_id) return false;
  return date === exception.date && exception.booking_slot_id === slot.id;
}

// Fonction pour vérifier une exception de type "time_slots"
export function checkTimeSlotException(
  exception: BookingException,
  timeSlot: TimeSlot,
  slot: BookingSlot,
  date: string,
): boolean {
  // Vérifier d'abord la date
  if (!exception.date || exception.date !== date) {
    return false;
  }

  // Vérifier le booking_slot_id
  if (exception.booking_slot_id !== slot.id) {
    return false;
  }

  // Vérifier les créneaux fermés
  const closedSlots = exception.closed_slots ?? [];
  const slotIndex = timeToSlot(timeSlot.time);
  const isClosed = closedSlots.includes(slotIndex);

  return isClosed;
}

// Fonction pour convertir une heure en index de créneau
export function timeToSlot(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 4 + Math.floor(minutes / 15);
}

// Fonction pour convertir un index de créneau en heure
export function slotToTime(slot: number): string {
  const hours = Math.floor(slot / 4);
  const minutes = (slot % 4) * 15;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

// Fonction pour vérifier si un créneau spécifique est fermé par une exception
export function isTimeSlotClosedByException(
  timeSlot: TimeSlot,
  slot: BookingSlot,
  exceptions: BookingException[],
  date: string,
): boolean {
  for (const exception of exceptions) {
    let isClosed = false;

    switch (exception.exception_type) {
      case "period":
        isClosed = checkPeriodException(exception, date);
        break;
      case "single_day":
        isClosed = checkSingleDayException(exception, date);
        break;
      case "service":
        isClosed = checkServiceException(exception, slot, date);
        break;
      case "time_slots":
        isClosed = checkTimeSlotException(exception, timeSlot, slot, date);
        break;
    }

    if (isClosed) {
      return true;
    }
  }

  return false;
}

// Fonction pour générer les créneaux à partir d'un créneau de base de données
export function generateSlotsFromDatabase(slot: BookingSlot): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const startTime = new Date(`2000-01-01T${slot.start_time}`);
  const endTime = new Date(`2000-01-01T${slot.end_time}`);

  const currentTime = new Date(startTime);
  while (currentTime < endTime) {
    const timeString = currentTime.toTimeString().slice(0, 5);
    slots.push({
      time: timeString,
      isAvailable: true,
      maxCapacity: slot.max_capacity ?? 50,
      slotId: slot.id,
    });

    // Incrémenter de 15 minutes
    currentTime.setMinutes(currentTime.getMinutes() + 15);
  }

  return slots;
}

// Fonction pour filtrer les créneaux par jour de la semaine
function filterSlotsByDay(slots: BookingSlot[], date: string): BookingSlot[] {
  // Forcer l'interprétation en timezone local pour éviter les décalages
  const dayOfWeek = new Date(date + "T00:00:00").getDay();

  const filteredSlots = slots.filter((slot) => {
    return slot.day_of_week === dayOfWeek;
  });

  return filteredSlots;
}

// Fonction pour traiter un slot et ses créneaux avec exceptions
export function processSlotWithExceptions(slot: BookingSlot, exceptions: BookingException[], date: string): TimeSlot[] {
  const timeSlots = generateSlotsFromDatabase(slot);

  // Vérifier les exceptions pour chaque créneau
  timeSlots.forEach((timeSlot) => {
    const isClosed = isTimeSlotClosedByException(timeSlot, slot, exceptions, date);
    timeSlot.isAvailable = !isClosed;
  });

  return timeSlots;
}

// Fonction pour grouper les créneaux par service avec exceptions realtime
export function groupSlotsByServiceRealtime(
  slots: BookingSlot[],
  exceptions: BookingException[],
  date: string,
): ServiceGroup[] {
  const serviceGroups: Record<string, ServiceGroup> = {};

  // Filtrer les créneaux pour la date donnée
  const filteredSlots = filterSlotsByDay(slots, date);

  // Grouper par nom de service
  filteredSlots.forEach((slot) => {
    const serviceName = slot.slot_name ?? "Service par défaut";

    if (!(serviceName in serviceGroups)) {
      serviceGroups[serviceName] = {
        serviceName,
        slots: [],
      };
    }

    // Traiter le slot et ses créneaux avec exceptions
    const timeSlots = processSlotWithExceptions(slot, exceptions, date);
    serviceGroups[serviceName].slots.push(...timeSlots);
  });

  return Object.values(serviceGroups);
}

// Fonction pour calculer l'impact d'une exception sur les créneaux
export function calculateExceptionImpact(
  exception: BookingException,
  slots: BookingSlot[],
  date: string,
): { affectedSlots: number; affectedServices: string[] } {
  const affectedSlots: BookingSlot[] = [];
  const affectedServices = new Set<string>();

  slots.forEach((slot) => {
    let isAffected = false;

    switch (exception.exception_type) {
      case "period":
        isAffected = checkPeriodException(exception, date);
        break;
      case "single_day":
        isAffected = checkSingleDayException(exception, date);
        break;
      case "service":
        isAffected = checkServiceException(exception, slot, date);
        break;
      case "time_slots":
        isAffected = exception.booking_slot_id === slot.id;
        break;
    }

    if (isAffected) {
      affectedSlots.push(slot);
      const serviceName = slot.slot_name ?? "Service par défaut";
      affectedServices.add(serviceName);
    }
  });

  return {
    affectedSlots: affectedSlots.length,
    affectedServices: Array.from(affectedServices),
  };
}

// Fonction de debounce pour optimiser les performances
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
