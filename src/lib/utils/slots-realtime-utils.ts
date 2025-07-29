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
  console.log("🔍 DEBUG checkSingleDayException:");
  console.log("  - Exception date:", exception.date);
  console.log("  - Date à vérifier:", date);
  
  // Convertir la date reçue en Date object pour utiliser format()
  const dateObj = new Date(date + 'T00:00:00');
  const formattedDate = format(dateObj, "yyyy-MM-dd");
  
  console.log("  - Date convertie:", dateObj);
  console.log("  - Date formatée:", formattedDate);
  console.log("  - Comparaison:", exception.date, "===", formattedDate);
  console.log("  - Résultat:", exception.date === formattedDate);
  
  return exception.date === formattedDate;
}

// Fonction pour vérifier une exception de type "service"
export function checkServiceException(exception: BookingException, slot: BookingSlot, date: string): boolean {
  if (!exception.date || !exception.booking_slot_id) return false;
  return date === exception.date && exception.booking_slot_id === slot.id;
}

// Fonction pour vérifier une exception de type "time_slots"
export function checkTimeSlotException(exception: BookingException, timeSlot: TimeSlot, slot: BookingSlot, date: string): boolean {
  console.log("🔍 DEBUG checkTimeSlotException:");
  console.log("  - Exception date:", exception.date);
  console.log("  - Date à vérifier:", date);
  console.log("  - Exception booking_slot_id:", exception.booking_slot_id);
  console.log("  - Slot id:", slot.id);
  console.log("  - TimeSlot:", timeSlot.time);
  
  // Vérifier d'abord la date
  if (!exception.date || exception.date !== date) {
    console.log("  - ❌ Date ne correspond pas");
    return false;
  }
  
  // Vérifier le booking_slot_id
  if (exception.booking_slot_id !== slot.id) {
    console.log("  - ❌ Booking slot id ne correspond pas");
    return false;
  }
  
  // Vérifier les créneaux fermés
  const closedSlots = exception.closed_slots ?? [];
  const slotIndex = timeToSlot(timeSlot.time);
  const isClosed = closedSlots.includes(slotIndex);
  
  console.log("  - Closed slots:", closedSlots);
  console.log("  - Current slot index:", slotIndex);
  console.log("  - Is closed:", isClosed);
  
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
  date: string
): boolean {
  console.log("🔍 DEBUG isTimeSlotClosedByException:");
  console.log("  - TimeSlot:", timeSlot.time);
  console.log("  - Slot:", slot.slot_name);
  console.log("  - Date:", date);
  console.log("  - Nombre d'exceptions à vérifier:", exceptions.length);

  for (const exception of exceptions) {
    console.log("  - Vérification exception:", exception.exception_type, exception.id);
    
    let isClosed = false;

    switch (exception.exception_type) {
      case "period":
        isClosed = checkPeriodException(exception, date);
        console.log("    - Period exception:", isClosed);
        break;
      case "single_day":
        isClosed = checkSingleDayException(exception, date);
        console.log("    - Single day exception:", isClosed);
        break;
      case "service":
        isClosed = checkServiceException(exception, slot, date);
        console.log("    - Service exception:", isClosed);
        break;
      case "time_slots":
        isClosed = checkTimeSlotException(exception, timeSlot, slot, date);
        console.log("    - Time slot exception:", isClosed);
        break;
    }

    if (isClosed) {
      console.log("    - ✅ Créneau fermé par exception:", exception.id);
      return true;
    }
  }

  console.log("    - ❌ Créneau ouvert (aucune exception applicable)");
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
  const dayOfWeek = new Date(date + 'T00:00:00').getDay();
  return slots.filter((slot) => slot.day_of_week === dayOfWeek);
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
  date: string
): ServiceGroup[] {
  console.log("🔍 DEBUG groupSlotsByServiceRealtime:");
  console.log("  - Date reçue:", date);
  console.log("  - Nombre de slots total:", slots.length);
  console.log("  - Nombre d'exceptions total:", exceptions.length);
  
  const serviceGroups: Record<string, ServiceGroup> = {};

  // Filtrer les créneaux pour la date donnée
  const filteredSlots = filterSlotsByDay(slots, date);
  console.log("  - Nombre de slots filtrés pour la date:", filteredSlots.length);

  // Grouper par nom de service
  filteredSlots.forEach((slot) => {
    const serviceName = slot.slot_name || "Service par défaut";

    if (!serviceGroups[serviceName]) {
      serviceGroups[serviceName] = {
        serviceName,
        slots: [],
      };
    }

    // Traiter le slot et ses créneaux avec exceptions
    const timeSlots = processSlotWithExceptions(slot, exceptions, date);
    serviceGroups[serviceName].slots.push(...timeSlots);
  });

  console.log("  - Nombre de groupes de services:", Object.keys(serviceGroups).length);
  return Object.values(serviceGroups);
}

// Fonction pour calculer l'impact d'une exception sur les créneaux
export function calculateExceptionImpact(
  exception: BookingException,
  slots: BookingSlot[],
  date: string
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
      affectedServices.add(slot.slot_name || "Service par défaut");
    }
  });

  return {
    affectedSlots: affectedSlots.length,
    affectedServices: Array.from(affectedServices),
  };
}

// Fonction de debounce pour optimiser les performances
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}