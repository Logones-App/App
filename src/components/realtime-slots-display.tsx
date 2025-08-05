"use client";

import React, { useState, useCallback, useEffect } from "react";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Clock, Calendar, AlertCircle } from "lucide-react";

import { GroupedSlotsDisplay } from "@/app/[locale]/(root)/(public)/[slug]/booking/_components/slots-components";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRealtime } from "@/hooks/use-realtime";
import { TimeSlot, BookingException, ServiceGroup } from "@/lib/utils/slots-realtime-utils";

interface RealtimeSlotsDisplayProps {
  establishmentId: string;
  date: Date;
  serviceGroups: ServiceGroup[];
  exceptions: BookingException[];
  onSlotSelect?: (slot: TimeSlot | null) => void;
  selectedSlot?: TimeSlot | null;
}

export function RealtimeSlotsDisplay({
  establishmentId,
  date,
  serviceGroups,
  exceptions,
  onSlotSelect,
  selectedSlot,
}: RealtimeSlotsDisplayProps) {
  const { isConnected } = useRealtime();
  const [localServiceGroups, setLocalServiceGroups] = useState<ServiceGroup[]>([]);

  // Utiliser directement les serviceGroups reçus
  useEffect(() => {
    console.log("🔍 DEBUG RealtimeSlotsDisplay useEffect:");
    console.log("  - ServiceGroups reçus:", serviceGroups.length);
    console.log("  - Exceptions reçues:", exceptions.length);
    console.log("  - Date:", format(date, "yyyy-MM-dd"));

    setLocalServiceGroups(serviceGroups);

    const totalSlots = serviceGroups.reduce((total, group) => total + group.slots.length, 0);
    const availableSlots = serviceGroups.reduce(
      (total, group) => total + group.slots.filter((s) => s.isAvailable).length,
      0,
    );

    console.log("  - Total créneaux:", totalSlots);
    console.log("  - Créneaux disponibles:", availableSlots);
  }, [serviceGroups, exceptions, date]);

  const handleSlotClick = useCallback(
    (slot: TimeSlot) => {
      onSlotSelect?.(selectedSlot?.time === slot.time && selectedSlot?.slotId === slot.slotId ? null : slot);
    },
    [selectedSlot, onSlotSelect],
  );

  const renderConnectionStatus = () => (
    <div className="mb-4 flex items-center gap-2">
      <Badge variant={isConnected ? "default" : "destructive"} className="flex items-center gap-1">
        <div className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
        {isConnected ? "Connecté" : "Déconnecté"}
      </Badge>
      <span className="text-muted-foreground text-sm">Mise à jour en temps réel des créneaux</span>
    </div>
  );

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <Calendar className="text-muted-foreground mb-4 h-12 w-12" />
      <h3 className="mb-2 text-lg font-semibold">Aucun créneau disponible</h3>
      <p className="text-muted-foreground text-sm">Aucun créneau n&apos;est disponible pour cette date.</p>
    </div>
  );

  const renderExceptionsInfo = () => {
    if (exceptions.length === 0) return null;

    return (
      <div className="bg-muted/50 mb-4 rounded-lg border p-3">
        <div className="mb-2 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-orange-500" />
          <span className="text-sm font-medium">Exceptions appliquées</span>
        </div>
        <div className="space-y-1">
          {exceptions.map((exception) => (
            <div key={exception.id} className="text-muted-foreground text-xs">
              • {exception.reason} ({exception.exception_type})
            </div>
          ))}
        </div>
      </div>
    );
  };

  const totalSlots = localServiceGroups.reduce((total, group) => total + group.slots.length, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Créneaux disponibles
            </CardTitle>
            <p className="text-muted-foreground text-sm">{format(date, "EEEE d MMMM yyyy", { locale: fr })}</p>
          </div>
          <Badge variant="secondary">{totalSlots} créneaux</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {renderConnectionStatus()}
        {renderExceptionsInfo()}
        <ScrollArea className="h-64">
          {localServiceGroups.length === 0 ? (
            renderEmptyState()
          ) : (
            <GroupedSlotsDisplay
              serviceGroups={localServiceGroups}
              selectedSlot={selectedSlot ?? null}
              setSelectedSlot={handleSlotClick}
            />
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
