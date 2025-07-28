import { Tables } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

// Types pour les créneaux
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

// Utiliser le type de la base de données
export type BookingSlot = Tables<"booking_slots">;

// Fonction pour récupérer les créneaux de base de données
export async function getDatabaseSlots(establishmentId: string, date: string): Promise<BookingSlot[]> {
  const supabase = await createClient();

  const { data: slots, error } = await supabase
    .from("booking_slots")
    .select("*")
    .eq("establishment_id", establishmentId)
    .eq("deleted", false)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("❌ Erreur lors de la récupération des créneaux:", error);
    return [];
  }

  return slots ?? [];
}

// Fonction pour récupérer les exceptions pour une date
export async function getExceptionsForDate(establishmentId: string, date: string): Promise<any[]> {
  const supabase = await createClient();

  const { data: exceptions, error } = await supabase
    .from("booking_exceptions")
    .select("*")
    .eq("establishment_id", establishmentId)
    .eq("deleted", false);

  if (error) {
    console.error("❌ Erreur lors de la récupération des exceptions:", error);
    return [];
  }

  return exceptions ?? [];
}

// Fonction pour vérifier une exception de type "period"
function checkPeriodException(exception: any, date: string): boolean {
  return date >= exception.start_date && date <= exception.end_date;
}

// Fonction pour vérifier une exception de type "single_day"
function checkSingleDayException(exception: any, date: string): boolean {
  return date === exception.date;
}

// Fonction pour vérifier une exception de type "service"
function checkServiceException(exception: any, slot: BookingSlot, date: string): boolean {
  return date === exception.date && exception.booking_slot_id === slot.id;
}

// Fonction pour vérifier une exception de type "time_slots"
function checkTimeSlotsException(exception: any, slot: BookingSlot): boolean {
  if (exception.booking_slot_id === slot.id) {
    const slotTime = slot.start_time;
    const closedSlots = exception.closed_slots ?? [];
    const slotIndex = timeToSlot(slotTime);
    return closedSlots.includes(slotIndex);
  }
  return false;
}

// Fonction pour vérifier si un créneau est fermé par une exception
export function checkSlotException(slot: BookingSlot, exceptions: any[], date: string): boolean {
  for (const exception of exceptions) {
    switch (exception.exception_type) {
      case "period":
        if (checkPeriodException(exception, date)) return true;
        break;
      case "single_day":
        if (checkSingleDayException(exception, date)) return true;
        break;
      case "service":
        if (checkServiceException(exception, slot, date)) return true;
        break;
      case "time_slots":
        if (checkTimeSlotsException(exception, slot)) return true;
        break;
    }
  }
  return false;
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
  const dayOfWeek = new Date(date).getDay();
  return slots.filter((slot) => slot.day_of_week === dayOfWeek);
}

// Fonction pour traiter un slot et ses créneaux
function processSlot(slot: BookingSlot, exceptions: any[], date: string): TimeSlot[] {
  const timeSlots = generateSlotsFromDatabase(slot);

  // Vérifier les exceptions pour chaque créneau
  timeSlots.forEach((timeSlot) => {
    const isClosed = checkSlotException(slot, exceptions, date);
    timeSlot.isAvailable = !isClosed;
  });

  return timeSlots;
}

// Fonction pour grouper les créneaux par service
export function groupSlotsByService(slots: BookingSlot[], exceptions: any[], date: string): ServiceGroup[] {
  const serviceGroups: Record<string, ServiceGroup> = {};

  // Filtrer les créneaux pour la date donnée
  const filteredSlots = filterSlotsByDay(slots, date);

  // Grouper par nom de service
  filteredSlots.forEach((slot) => {
    const serviceName = slot.slot_name || "Service par défaut";

    if (!serviceGroups[serviceName]) {
      serviceGroups[serviceName] = {
        serviceName,
        slots: [],
      };
    }

    // Traiter le slot et ses créneaux
    const timeSlots = processSlot(slot, exceptions, date);
    serviceGroups[serviceName].slots.push(...timeSlots);
  });

  return Object.values(serviceGroups);
}
