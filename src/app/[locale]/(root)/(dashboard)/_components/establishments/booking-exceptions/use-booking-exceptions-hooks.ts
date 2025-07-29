"use client";

import { useCallback } from "react";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

import { createClient } from "@/lib/supabase/client";

type ExceptionType = "period" | "single_day" | "service" | "time_slots";

// Hook pour récupérer les booking_slots de l'établissement
function useEstablishmentBookingSlots(establishmentId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: ["establishment-booking-slots", establishmentId],
    queryFn: async () => {
      if (!establishmentId) return [];
      const { data, error } = await supabase
        .from("booking_slots")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("deleted", false)
        .order("day_of_week", { ascending: true })
        .order("start_time", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!establishmentId,
  });
}

// Fonction pour générer les créneaux horaires à partir d'un slot
function generateTimeSlotsFromBookingSlot(slot: Record<string, unknown>) {
  const slots: Array<{ time: string; isAvailable: boolean; maxCapacity: number; slotId: string; slotNumber: number }> =
    [];
  const startTime = new Date(`2000-01-01T${slot.start_time as string}`);
  const endTime = new Date(`2000-01-01T${slot.end_time as string}`);

  const currentTime = new Date(startTime);
  while (currentTime < endTime) {
    const timeString = currentTime.toTimeString().slice(0, 5);
    // Calculer le slotNumber basé sur l'heure réelle (minutes depuis minuit / 15)
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    const totalMinutes = hours * 60 + minutes;
    const slotNumber = Math.floor(totalMinutes / 15);

    slots.push({
      time: timeString,
      isAvailable: true,
      maxCapacity: (slot.max_capacity as number) ?? 10,
      slotId: slot.id as string,
      slotNumber: slotNumber,
    });
    currentTime.setMinutes(currentTime.getMinutes() + 15);
  }

  return slots;
}

// Hook pour gérer les services et créneaux
export function useServicesAndSlots(establishmentId: string) {
  const {
    data: bookingSlots,
    isLoading: slotsLoading,
    error: slotsError,
  } = useEstablishmentBookingSlots(establishmentId);

  const getServicesForDate = useCallback(
    (date: Date) => {
      if (!bookingSlots || !date) return [];

      const dayOfWeek = date.getDay(); // 0 = dimanche, 1 = lundi, etc.
      return bookingSlots.filter((slot) => slot.day_of_week === dayOfWeek);
    },
    [bookingSlots],
  );

  const getTimeSlotsForService = useCallback(
    (serviceId: string) => {
      const service = bookingSlots?.find((slot) => slot.id === serviceId);
      if (!service) return [];
      return generateTimeSlotsFromBookingSlot(service);
    },
    [bookingSlots],
  );

  const getServiceName = useCallback(
    (serviceId: string) => {
      const service = bookingSlots?.find((slot) => slot.id === serviceId);
      return service?.slot_name ?? "Service inconnu";
    },
    [bookingSlots],
  );

  return {
    bookingSlots,
    slotsLoading,
    slotsError,
    getServicesForDate,
    getTimeSlotsForService,
    getServiceName,
  };
}

// Hook pour gérer les événements du calendrier
export function useCalendarEvents(exceptions: Array<Record<string, unknown>>) {
  const createPeriodEvent = useCallback((exception: Record<string, unknown>) => {
    if (!exception.start_date || !exception.end_date) return null;
    const endDate = new Date(exception.end_date as string);
    endDate.setDate(endDate.getDate() + 1);
    const endDateStr = endDate.toISOString().split("T")[0];
    return {
      id: exception.id as string,
      title: `${(exception.reason as string) ?? "Période"} (${exception.start_date} - ${exception.end_date})`,
      start: exception.start_date as string,
      end: endDateStr,
      backgroundColor: "#ef4444",
      borderColor: "#dc2626",
      textColor: "#ffffff",
      className: "cursor-pointer hover:opacity-80",
    };
  }, []);

  const createSingleDayEvent = useCallback((exception: Record<string, unknown>) => {
    if (!exception.date) return null;
    return {
      id: exception.id as string,
      title: `${(exception.reason as string) ?? "Jour unique"} (${exception.date})`,
      start: exception.date as string,
      end: exception.date as string,
      backgroundColor: "#f59e0b",
      borderColor: "#d97706",
      textColor: "#ffffff",
      className: "cursor-pointer hover:opacity-80",
    };
  }, []);

  const createServiceEvent = useCallback((exception: Record<string, unknown>) => {
    if (!exception.date) return null;
    return {
      id: exception.id as string,
      title: `${(exception.reason as string) ?? "Service"} (${exception.date})`,
      start: exception.date as string,
      end: exception.date as string,
      backgroundColor: "#8b5cf6",
      borderColor: "#7c3aed",
      textColor: "#ffffff",
      className: "cursor-pointer hover:opacity-80",
    };
  }, []);

  const createTimeSlotsEvent = useCallback((exception: Record<string, unknown>) => {
    if (!exception.date) return null;
    return {
      id: exception.id as string,
      title: `${(exception.reason as string) ?? "Créneaux"} (${exception.date})`,
      start: exception.date as string,
      end: exception.date as string,
      backgroundColor: "#06b6d4",
      borderColor: "#0891b2",
      textColor: "#ffffff",
      className: "cursor-pointer hover:opacity-80",
    };
  }, []);

  const getCalendarEvents = useCallback(() => {
    return exceptions
      .map((exception) => {
        switch (exception.exception_type as string) {
          case "period":
            return createPeriodEvent(exception);
          case "single_day":
            return createSingleDayEvent(exception);
          case "service":
            return createServiceEvent(exception);
          case "time_slots":
            return createTimeSlotsEvent(exception);
          default:
            return null;
        }
      })
      .filter((event) => event !== null);
  }, [exceptions, createPeriodEvent, createSingleDayEvent, createServiceEvent, createTimeSlotsEvent]);

  return { getCalendarEvents };
}

// Hook pour gérer les exceptions par date
export function useExceptionsByDate(exceptions: Array<Record<string, unknown>>) {
  const checkPeriodException = useCallback((exception: Record<string, unknown>, dateStr: string) => {
    if (exception.start_date && exception.end_date) {
      return dateStr >= (exception.start_date as string) && dateStr <= (exception.end_date as string);
    }
    return false;
  }, []);

  const checkSingleDayException = useCallback((exception: Record<string, unknown>, dateStr: string) => {
    if (exception.date) {
      return dateStr === (exception.date as string);
    }
    return false;
  }, []);

  const checkServiceException = useCallback((exception: Record<string, unknown>, dateStr: string) => {
    if (exception.date) {
      return dateStr === (exception.date as string);
    }
    return false;
  }, []);

  const checkTimeSlotsException = useCallback((exception: Record<string, unknown>, dateStr: string) => {
    if (exception.date) {
      return dateStr === (exception.date as string);
    }
    return false;
  }, []);

  const getExceptionsForDate = useCallback(
    (date: Date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      const filteredExceptions = exceptions.filter((exception) => {
        switch (exception.exception_type as string) {
          case "period":
            return checkPeriodException(exception, dateStr);
          case "single_day":
            return checkSingleDayException(exception, dateStr);
          case "service":
            return checkServiceException(exception, dateStr);
          case "time_slots":
            return checkTimeSlotsException(exception, dateStr);
          default:
            return false;
        }
      });

      return filteredExceptions;
    },
    [exceptions, checkPeriodException, checkSingleDayException, checkServiceException, checkTimeSlotsException],
  );

  return { getExceptionsForDate };
}

// Hook pour gérer les types d'exceptions
export function useExceptionTypes() {
  const getTypeIcon = useCallback((type: ExceptionType) => {
    switch (type) {
      case "period":
        return "calendar-range";
      case "single_day":
        return "calendar-days";
      case "service":
        return "clock";
      case "time_slots":
        return "clock";
      default:
        return "calendar-range";
    }
  }, []);

  const getTypeLabel = useCallback((type: ExceptionType) => {
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
  }, []);

  return { getTypeIcon, getTypeLabel };
}
