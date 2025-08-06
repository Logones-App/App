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

// Fonction pour vérifier les exceptions de période
export function checkPeriodException(exception: BookingException, date: string): boolean {
  if (!exception.start_date || !exception.end_date) return false;
  const exceptionDate = new Date(date);
  const startDate = new Date(exception.start_date);
  const endDate = new Date(exception.end_date);
  return exceptionDate >= startDate && exceptionDate <= endDate;
}

// Fonction pour vérifier les exceptions de jour unique
export function checkSingleDayException(exception: BookingException, date: string): boolean {
  if (!exception.date) return false;
  return exception.date === date;
}

// Fonction pour vérifier les exceptions de service
export function checkServiceException(exception: BookingException, slot: BookingSlot, date: string): boolean {
  if (!exception.booking_slot_id || slot.id !== exception.booking_slot_id) return false;
  return checkPeriodException(exception, date) || checkSingleDayException(exception, date);
}

// Fonction pour vérifier si un créneau est fermé par une exception
export function checkTimeSlotException(
  exception: BookingException,
  timeSlot: TimeSlot,
  slot: BookingSlot,
  date: string,
): boolean {
  // Vérifier si l'exception s'applique à ce slot
  if (exception.booking_slot_id && exception.booking_slot_id !== slot.id) {
    return false;
  }

  // Vérifier la date
  const isDateAffected = checkPeriodException(exception, date) || checkSingleDayException(exception, date);
  if (!isDateAffected) return false;

  // Vérifier les créneaux fermés si spécifiés
  if (exception.closed_slots && exception.closed_slots.length > 0) {
    const slotTime = timeToSlot(timeSlot.time);
    return exception.closed_slots.includes(slotTime);
  }

  return true;
}

// Fonction pour convertir une heure en numéro de créneau
export function timeToSlot(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

// Fonction pour convertir un numéro de créneau en heure
export function slotToTime(slot: number): string {
  const hours = Math.floor(slot / 60);
  const minutes = slot % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

// Fonction pour vérifier si un créneau est fermé par une exception
export function isTimeSlotClosedByException(
  timeSlot: TimeSlot,
  slot: BookingSlot,
  exceptions: BookingException[],
  date: string,
): boolean {
  return exceptions.some((exception) => {
    // Vérifier si l'exception n'est pas supprimée
    if (exception.deleted) return false;

    // Vérifier le type d'exception
    switch (exception.exception_type) {
      case "period":
        return checkPeriodException(exception, date) && checkTimeSlotException(exception, timeSlot, slot, date);
      case "single_day":
        return checkSingleDayException(exception, date) && checkTimeSlotException(exception, timeSlot, slot, date);
      case "service":
        return checkServiceException(exception, slot, date) && checkTimeSlotException(exception, timeSlot, slot, date);
      case "time_slots":
        return checkTimeSlotException(exception, timeSlot, slot, date);
      default:
        return false;
    }
  });
}

// Fonction pour générer les créneaux à partir d'un slot de base de données
export function generateSlotsFromDatabase(slot: BookingSlot): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const startTime = timeToSlot(slot.start_time);
  const endTime = timeToSlot(slot.end_time);
  const interval = 30; // Intervalle fixe de 30 minutes

  for (let time = startTime; time <= endTime - interval; time += interval) {
    slots.push({
      time: slotToTime(time),
      isAvailable: true,
      maxCapacity: slot.max_capacity ?? 1,
      slotId: slot.id,
    });
  }

  return slots;
}

// Fonction pour filtrer les créneaux par jour
function filterSlotsByDay(slots: BookingSlot[], date: string): BookingSlot[] {
  const targetDate = new Date(date);
  const dayOfWeek = targetDate.getDay();

  return slots.filter((slot) => {
    // Utiliser le jour de la semaine du slot
    return slot.day_of_week === dayOfWeek;
  });
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
    const serviceName = slot.slot_name || "Service par défaut";

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
      const serviceName = slot.slot_name || "Service par défaut";
      affectedServices.add(serviceName);
    }
  });

  return {
    affectedSlots: affectedSlots.length,
    affectedServices: Array.from(affectedServices),
  };
}
