"use client";

import React, { useState, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import rrulePlugin from "@fullcalendar/rrule";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";

interface MenuCalendarProps {
  menus: any[];
  onDateClick?: (date: Date) => void;
  onEventClick?: (event: any) => void;
}

export function MenuCalendar({ menus, onDateClick, onEventClick }: MenuCalendarProps) {
  const [currentView, setCurrentView] = useState("dayGridMonth");
  const [currentDate, setCurrentDate] = useState(new Date());

  // Événements de test
  const testEvents = [
    {
      id: "test-event-1",
      title: "Événement Test",
      start: "2025-07-08",
      end: "2025-07-12", // Le 11 juillet inclus (end est exclusif)
      backgroundColor: "#3B82F6",
      borderColor: "#3B82F6",
      textColor: "white",
    },
    {
      id: "test-event-2",
      title: "Événement 14h-18h",
      start: "2025-07-16T14:00:00",
      end: "2025-07-16T18:00:00",
      backgroundColor: "#EF4444",
      borderColor: "#EF4444",
      textColor: "white",
    },
    {
      id: "test-event-3",
      title: "Tous les jeudis",
      start: "2025-07-03",
      end: "2025-07-04",
      rrule: {
        freq: "weekly",
        dtstart: "2025-07-03",
        until: "2025-07-31",
      },
      backgroundColor: "#10B981",
      borderColor: "#10B981",
      textColor: "white",
      allDay: true,
    },
    {
      id: "test-event-4",
      title: "Événement 21-22 juillet 18h-22h",
      start: "2025-07-21T18:00:00",
      end: "2025-07-22T22:00:00",
      backgroundColor: "#8B5CF6",
      borderColor: "#8B5CF6",
      textColor: "white",
    },
    {
      id: "test-event-5",
      title: "Mardis 10h-12h",
      start: "2025-07-01T10:00:00",
      end: "2025-07-01T12:00:00",
      rrule: {
        freq: "weekly",
        dtstart: "2025-07-01",
        until: "2025-07-31",
      },
      backgroundColor: "#F59E0B",
      borderColor: "#F59E0B",
      textColor: "white",
    },
  ];

  const events = testEvents;

  const handleDateClick = useCallback(
    (arg: any) => {
      console.log("Date cliquée:", arg.dateStr);
      onDateClick?.(arg.date);
    },
    [onDateClick],
  );

  const handleEventClick = useCallback(
    (arg: any) => {
      console.log("Événement cliqué:", arg.event);
      onEventClick?.(arg.event);
    },
    [onEventClick],
  );

  const handleDatesSet = useCallback((arg: any) => {
    console.log("Dates définies:", arg.startStr, "à", arg.endStr);
  }, []);

  const handleViewDidMount = useCallback((arg: any) => {
    console.log("Vue montée:", arg.view.type);
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
