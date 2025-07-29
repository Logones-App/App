"use client";

import React, { useEffect } from "react";

import { format } from "date-fns";
import { Edit, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface BookingExceptionsListProps {
  selectedCalendarDate: Date | null;
  getExceptionsForDate: (date: Date) => Array<Record<string, unknown>>;
  onDeleteClick: (exception: Record<string, unknown>) => void;
  onEditClick?: (exception: Record<string, unknown>) => void;
  establishmentId: string;
}

// Composant pour afficher les détails d'une exception selon son type
function ExceptionDetails({
  exception,
  getServiceName,
}: {
  exception: Record<string, unknown>;
  getServiceName: (id: string) => string;
}) {
  const exceptionType = exception.exception_type as string;

  const renderPeriodDetails = () => (
    <span>
      Période : {exception.start_date as string} → {exception.end_date as string}
    </span>
  );

  const renderSingleDayDetails = () => <span>Jour unique : {(exception.date as string) ?? "Date inconnue"}</span>;

  const renderServiceDetails = () => (
    <span>
      Service {getServiceName(exception.booking_slot_id as string)} désactivé : {exception.date as string}
    </span>
  );

  const renderTimeSlotsDetails = () => (
    <span>
      Service - Créneaux {(exception.closed_slots as number[])?.join(", ")} fermés : {exception.date as string}
    </span>
  );

  const getDetailsByType = () => {
    switch (exceptionType) {
      case "period":
        return renderPeriodDetails();
      case "single_day":
        return renderSingleDayDetails();
      case "service":
        return renderServiceDetails();
      case "time_slots":
        return renderTimeSlotsDetails();
      default:
        return null;
    }
  };

  return <div className="text-muted-foreground mt-2 text-xs">{getDetailsByType()}</div>;
}

// Composant pour afficher les actions d'une exception
function ExceptionActions({
  exception,
  onDeleteClick,
  onEditClick,
}: {
  exception: Record<string, unknown>;
  onDeleteClick: (exception: Record<string, unknown>) => void;
  onEditClick?: (exception: Record<string, unknown>) => void;
}) {
  const isTimeSlots = (exception.exception_type as string) === "time_slots";

  return (
    <div className="flex items-center gap-2">
      {isTimeSlots && onEditClick && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEditClick(exception)}
          className="text-blue-500 hover:text-blue-600"
          title="Modifier les créneaux"
        >
          <Edit className="h-4 w-4" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDeleteClick(exception)}
        className="text-red-500 hover:text-red-600"
        title="Supprimer la fermeture"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

// Composant pour afficher une exception individuelle
function ExceptionItem({
  exception,
  onDeleteClick,
  onEditClick,
  getServiceName,
}: {
  exception: Record<string, unknown>;
  onDeleteClick: (exception: Record<string, unknown>) => void;
  onEditClick?: (exception: Record<string, unknown>) => void;
  getServiceName: (id: string) => string;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold">{(exception.reason as string) ?? "Fermeture sans raison"}</h4>
          <Badge variant={(exception.status as string) === "active" ? "default" : "secondary"}>
            {(exception.status as string) === "active" ? "Actif" : "Inactif"}
          </Badge>
        </div>
        <ExceptionActions exception={exception} onDeleteClick={onDeleteClick} onEditClick={onEditClick} />
      </div>
      <p className="text-muted-foreground text-sm">{exception.reason as string}</p>
      <ExceptionDetails exception={exception} getServiceName={getServiceName} />
    </div>
  );
}

// Composant pour afficher la liste vide
function EmptyState() {
  return (
    <div className="text-muted-foreground py-8 text-center">
      <p>Sélectionnez une date dans le calendrier</p>
      <p className="text-sm">pour voir les exceptions de cette journée</p>
    </div>
  );
}

export function BookingExceptionsList({
  selectedCalendarDate,
  getExceptionsForDate,
  onDeleteClick,
  onEditClick,
  establishmentId,
}: BookingExceptionsListProps) {
  // Fonction temporaire pour getServiceName (à remplacer par la vraie fonction)
  const getServiceName = (id: string) => `Service ${id}`;

  useEffect(() => {
    if (selectedCalendarDate) {
      const exceptions = getExceptionsForDate(selectedCalendarDate);
      exceptions.forEach((exception) => {
        console.log(
          "Exception type:",
          exception.exception_type,
          "Is time_slots:",
          (exception.exception_type as string) === "time_slots",
        );
      });
    }
  }, [selectedCalendarDate, getExceptionsForDate]);

  const exceptions = selectedCalendarDate ? getExceptionsForDate(selectedCalendarDate) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {selectedCalendarDate
            ? `Fermetures du ${format(selectedCalendarDate, "dd/MM/yyyy")}`
            : "Sélectionnez une date"}
        </CardTitle>
        <CardDescription>
          {selectedCalendarDate
            ? `${exceptions.length} fermeture(s) trouvée(s)`
            : "Cliquez sur une journée dans le calendrier"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {selectedCalendarDate ? (
            exceptions.map((exception) => (
              <ExceptionItem
                key={exception.id as string}
                exception={exception}
                onDeleteClick={onDeleteClick}
                onEditClick={onEditClick}
                getServiceName={getServiceName}
              />
            ))
          ) : (
            <EmptyState />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
