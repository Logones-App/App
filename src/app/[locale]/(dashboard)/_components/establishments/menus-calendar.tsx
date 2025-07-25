"use client";

import React, { useState, useCallback, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import rrulePlugin from "@fullcalendar/rrule";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, format, addDays, isSameDay } from "date-fns";

interface MenuCalendarProps {
  menus: any[];
  onDateClick?: (date: Date) => void;
  onEventClick?: (event: any) => void;
}

// Fonction utilitaire : retourne la période visible selon la vue
function getVisiblePeriod(view: string, date: Date) {
  if (view === "dayGridMonth") {
    return {
      start: startOfMonth(date),
      end: endOfMonth(date),
    };
  } else if (view === "timeGridWeek") {
    return {
      start: startOfWeek(date, { weekStartsOn: 1 }),
      end: endOfWeek(date, { weekStartsOn: 1 }),
    };
  } else {
    // Vue jour
    return {
      start: date,
      end: date,
    };
  }
}

// Fonction pour générer les événements récurrents en événements simples
function generateRecurringEvents(schedule: any, menu: any, currentView: string, currentDate: Date, color: string) {
  const events: any[] = [];

  // Obtenir la période visible
  const { start: viewStart, end: viewEnd } = getVisiblePeriod(currentView, currentDate);

  // Calculer toutes les occurrences dans la période visible
  let checkDate = new Date(viewStart);
  const endDate = new Date(viewEnd);

  // day_of_week: 1=lundi, 2=mardi, ..., 7=dimanche
  // JavaScript: 0=dimanche, 1=lundi, ..., 6=samedi
  // Conversion correcte : 1=lundi -> 1, 2=mardi -> 2, ..., 7=dimanche -> 0
  const targetDay = schedule.day_of_week === 7 ? 0 : schedule.day_of_week; // Convertir en format JavaScript

  while (checkDate <= endDate) {
    if (checkDate.getDay() === targetDay) {
      // C'est le bon jour de la semaine
      const eventDate = format(checkDate, "yyyy-MM-dd");

      if (schedule.start_time && schedule.end_time) {
        // Événement avec heures - adapter selon la vue
        if (currentView === "dayGridMonth") {
          // En vue mois : forcer allDay pour un affichage en bloc
          events.push({
            id: `${menu.id}-${schedule.id}-${eventDate}`,
            title: `${menu.name} (${schedule.start_time}-${schedule.end_time})`,
            start: eventDate,
            allDay: true,
            backgroundColor: color,
            borderColor: color,
            textColor: "white",
            extendedProps: {
              menu,
              schedule,
              type: "recurrent-heures",
              originalStart: schedule.start_time,
              originalEnd: schedule.end_time,
            },
          });
        } else {
          // En vue semaine/jour : affichage horaire normal
          events.push({
            id: `${menu.id}-${schedule.id}-${eventDate}`,
            title: menu.name,
            start: `${eventDate}T${schedule.start_time}`,
            end: `${eventDate}T${schedule.end_time}`,
            backgroundColor: color,
            borderColor: color,
            textColor: "white",
            extendedProps: { menu, schedule, type: "recurrent-heures" },
          });
        }
      } else {
        // Événement all-day
        events.push({
          id: `${menu.id}-${schedule.id}-${eventDate}`,
          title: menu.name,
          start: eventDate,
          allDay: true,
          backgroundColor: color,
          borderColor: color,
          textColor: "white",
          extendedProps: { menu, schedule, type: "recurrent-all-day" },
        });
      }
    }
    checkDate.setDate(checkDate.getDate() + 1);
  }

  return events;
}

// Fonction de préparation pour affichage
function prepareScheduleForDisplay(schedule: any, view: string, date: Date, menuName?: string) {
  // 1. Classification du type
  const type = (() => {
    if (!schedule) return "permanent";
    if (
      schedule.valid_from &&
      schedule.valid_until &&
      schedule.valid_from === schedule.valid_until &&
      !schedule.day_of_week
    ) {
      return schedule.start_time || schedule.end_time ? "ponctuel-heures" : "ponctuel-all-day";
    }
    if (schedule.day_of_week) {
      return schedule.start_time || schedule.end_time ? "recurrent-heures" : "recurrent-all-day";
    }
    if (
      schedule.valid_from &&
      schedule.valid_until &&
      schedule.valid_from !== schedule.valid_until &&
      !schedule.day_of_week
    ) {
      return schedule.start_time || schedule.end_time ? "plage-heures" : "plage-all-day";
    }
    return "ponctuel-all-day";
  })();

  // LOG: Afficher le type déterminé pour chaque schedule
  if (schedule) {
    console.log(
      `[SCHEDULE TYPE] Menu: ${menuName || "?"} (id: ${schedule.menu_id || schedule.menuId || "?"}) Schedule: ${schedule.id || "?"} => ${type}`,
    );
  } else {
    console.log(`[SCHEDULE TYPE] Menu permanent: ${menuName || "?"} => permanent`);
  }

  // 2. Complétion dynamique des dates manquantes pour l'affichage
  let valid_from = schedule?.valid_from;
  let valid_until = schedule?.valid_until;
  if (!valid_from || !valid_until) {
    const { start, end } = getVisiblePeriod(view, date);
    valid_from = format(start, "yyyy-MM-dd");
    valid_until = format(end, "yyyy-MM-dd");
  }

  // 3. Construction de l'objet prêt pour FullCalendar
  return {
    ...schedule,
    valid_from,
    valid_until,
    type,
  };
}

// Fonction utilitaire pour normaliser l'heure au format HH:mm:ss
function normalizeTimeString(time?: string) {
  if (!time) return undefined;
  if (/^\d{2}:\d{2}:\d{2}$/.test(time)) return time;
  if (/^\d{2}:\d{2}$/.test(time)) return time + ":00";
  if (/^\d{2}:\d{2}:\d{2}\.\d+$/.test(time)) return time.split(".")[0];
  return time;
}

export function MenuCalendar({ menus, onDateClick, onEventClick }: MenuCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState("dayGridMonth");

  // Génération des événements des menus
  const events = useMemo(() => {
    if (!menus || menus.length === 0) return [];
    const events: any[] = [];

    menus.forEach((menu, index) => {
      const color = `hsl(${index * 60}, 70%, 50%)`;

      // Menu permanent (sans schedule)
      if (!menu.schedules || menu.schedules.length === 0) {
        const { start: periodStart, end: periodEnd } = getVisiblePeriod(currentView, currentDate);
        events.push({
          id: `${menu.id || "menu"}-permanent`,
          title: menu.name || "Menu",
          start: periodStart,
          end: format(addDays(endOfMonth(currentDate), 1), "yyyy-MM-dd"), // Inclure le dernier jour du mois
          allDay: true,
          backgroundColor: "#10B981",
          borderColor: "#10B981",
          textColor: "white",
          extendedProps: { menu, type: "permanent" },
        });
        return;
      }

      // Cas 2 : Schedules associés
      menu.schedules.forEach((schedule: any, sidx: number) => {
        const display = prepareScheduleForDisplay(schedule, currentView, currentDate, menu.name);

        // Génération selon le type
        if (display.type === "recurrent-heures" || display.type === "recurrent-all-day") {
          // NOUVELLE LOGIQUE : Générer des événements simples au lieu d'utiliser rrule
          const recurringEvents = generateRecurringEvents(schedule, menu, currentView, currentDate, color);
          events.push(...recurringEvents);
        } else if (display.type === "permanent" || display.type === "plage-all-day") {
          events.push({
            id: `${menu.id}-schedule-${sidx}`,
            title: menu.name,
            start: display.valid_from,
            end: format(addDays(new Date(display.valid_until), 1), "yyyy-MM-dd"),
            backgroundColor: color,
            borderColor: color,
            textColor: "white",
            allDay: true,
            extendedProps: { menu, schedule, type: display.type },
          });
        } else if (display.type === "plage-heures") {
          // Plage de dates avec heures
          events.push({
            id: `${menu.id || "menu"}-schedule-${typeof sidx !== "undefined" ? sidx : 0}`,
            title: menu.name || "Menu",
            start: `${display.valid_from}T${normalizeTimeString(display.start_time)}`,
            end: `${format(addDays(new Date(display.valid_until), 1), "yyyy-MM-dd")}T${normalizeTimeString(display.end_time)}`,
            backgroundColor: color,
            borderColor: color,
            textColor: "white",
            extendedProps: { menu, schedule, type: display.type },
          });
        } else if (display.type === "ponctuel-heures") {
          // Ponctuel avec heures
          events.push({
            id: `${menu.id || "menu"}-schedule-${typeof sidx !== "undefined" ? sidx : 0}`,
            title: menu.name || "Menu",
            start: `${display.valid_from}T${normalizeTimeString(display.start_time)}`,
            end: display.end_time ? `${display.valid_from}T${normalizeTimeString(display.end_time)}` : undefined,
            backgroundColor: color,
            borderColor: color,
            textColor: "white",
            extendedProps: { menu, schedule, type: display.type },
          });
        } else if (display.type === "ponctuel-all-day") {
          // Ponctuel all-day
          events.push({
            id: `${menu.id || "menu"}-schedule-${typeof sidx !== "undefined" ? sidx : 0}`,
            title: menu.name || "Menu",
            start: display.valid_from,
            end: display.valid_until ? format(addDays(new Date(display.valid_until), 1), "yyyy-MM-dd") : undefined,
            allDay: true,
            backgroundColor: color,
            borderColor: color,
            textColor: "white",
            extendedProps: { menu, schedule, type: display.type },
          });
        }
      });
    });

    return events;
  }, [menus, currentView, currentDate]);

  const handleDateClick = useCallback(
    (arg: any) => {
      onDateClick?.(arg.date);
    },
    [onDateClick],
  );

  const handleEventClick = useCallback(
    (arg: any) => {
      onEventClick?.(arg.event);
    },
    [onEventClick],
  );

  const handleDatesSet = useCallback((arg: any) => {
    // Utiliser le milieu de la période pour déterminer le mois principal affiché
    const viewStartDate = new Date(arg.start);
    const viewEndDate = new Date(arg.end);

    // Calculer le milieu de la période
    const midTime = viewStartDate.getTime() + (viewEndDate.getTime() - viewStartDate.getTime()) / 2;
    const midDate = new Date(midTime);

    setCurrentDate(midDate);
  }, []);

  const handleViewDidMount = useCallback((arg: any) => {
    setCurrentView(arg.view.type);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Calendrier des Menus
        </CardTitle>
      </CardHeader>
      <CardContent>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, rrulePlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          locale="fr"
          buttonText={{
            today: "Aujourd'hui",
            month: "Mois",
            week: "Semaine",
            day: "Jour",
          }}
          height="auto"
          events={events}
          timeZone="local"
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          datesSet={handleDatesSet}
          viewDidMount={handleViewDidMount}
          editable={false}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          firstDay={1} // Lundi
        />
      </CardContent>
    </Card>
  );
}
