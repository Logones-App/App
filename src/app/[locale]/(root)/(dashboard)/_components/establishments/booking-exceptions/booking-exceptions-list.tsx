"use client";

import React from "react";

import { format } from "date-fns";
import { Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { useServicesAndSlots } from "./use-booking-exceptions-hooks";

interface BookingExceptionsListProps {
  selectedCalendarDate: Date | null;
  getExceptionsForDate: (date: Date) => Array<Record<string, unknown>>;
  onDeleteClick: (exception: Record<string, unknown>) => void;
  establishmentId: string;
}

export function BookingExceptionsList({
  selectedCalendarDate,
  getExceptionsForDate,
  onDeleteClick,
  establishmentId,
}: BookingExceptionsListProps) {
  const { getServiceName } = useServicesAndSlots(establishmentId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {selectedCalendarDate
            ? `Exceptions du ${format(selectedCalendarDate, "dd/MM/yyyy")}`
            : "Sélectionnez une date"}
        </CardTitle>
        <CardDescription>
          {selectedCalendarDate
            ? `${getExceptionsForDate(selectedCalendarDate).length} exception(s) trouvée(s)`
            : "Cliquez sur une journée dans le calendrier"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {selectedCalendarDate ? (
            getExceptionsForDate(selectedCalendarDate).map((exception) => (
              <div key={exception.id as string} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{(exception.reason as string) ?? "Exception sans raison"}</h4>
                    <Badge variant={(exception.status as string) === "active" ? "default" : "secondary"}>
                      {(exception.status as string) === "active" ? "Actif" : "Inactif"}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteClick(exception)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-muted-foreground text-sm">{exception.reason as string}</p>
                <div className="text-muted-foreground mt-2 text-xs">
                  {(exception.exception_type as string) === "period" && (
                    <span>
                      Période : {exception.start_date as string} → {exception.end_date as string}
                    </span>
                  )}
                  {(exception.exception_type as string) === "single_day" && (
                    <span>Jour unique : {(exception.date as string) ?? "Date inconnue"}</span>
                  )}
                  {(exception.exception_type as string) === "service" && (
                    <span>
                      Service {getServiceName(exception.booking_slot_id as string)} désactivé :{" "}
                      {exception.date as string}
                    </span>
                  )}
                  {(exception.exception_type as string) === "time_slots" && (
                    <span>
                      Service - Créneaux {(exception.closed_slots as number[])?.join(", ")} fermés :{" "}
                      {exception.date as string}
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-muted-foreground py-8 text-center">
              <p>Sélectionnez une date dans le calendrier</p>
              <p className="text-sm">pour voir les exceptions de cette journée</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
