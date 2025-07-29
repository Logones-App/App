"use client";

import React, { memo, useCallback } from "react";
import { Clock, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TimeSlot {
  time: string;
  isAvailable: boolean;
  maxCapacity: number;
  slotId?: string;
}

interface ServiceGroup {
  serviceName: string;
  slots: TimeSlot[];
}

interface RealtimeSlotsDisplayProps {
  serviceGroups: ServiceGroup[];
  selectedSlot: TimeSlot | null;
  setSelectedSlot: (slot: TimeSlot | null) => void;
  isLoading?: boolean;
  error?: Error | null;
  onRefresh?: () => void;
}

// Composant pour un créneau individuel (mémorisé pour les performances)
const TimeSlotButton = memo<{
  slot: TimeSlot;
  isSelected: boolean;
  onSelect: (slot: TimeSlot) => void;
}>(({ slot, isSelected, onSelect }) => {
  const handleClick = useCallback(() => {
    if (slot.isAvailable) {
      onSelect(slot);
    }
  }, [slot, onSelect]);

  return (
    <Button
      variant={isSelected ? "default" : slot.isAvailable ? "outline" : "ghost"}
      size="sm"
      onClick={handleClick}
      disabled={!slot.isAvailable}
      className={cn(
        "relative h-12 w-full transition-all duration-200",
        slot.isAvailable && !isSelected && "hover:bg-primary/10",
        isSelected && "ring-primary ring-2 ring-offset-2",
        !slot.isAvailable && "cursor-not-allowed opacity-50",
      )}
    >
      <div className="flex w-full items-center justify-between">
        <span className="font-medium">{slot.time}</span>
        <div className="flex items-center gap-1">
          {slot.isAvailable ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <XCircle className="h-4 w-4 text-red-600" />
          )}
          <span className="text-muted-foreground text-xs">{slot.maxCapacity} places</span>
        </div>
      </div>
    </Button>
  );
});

TimeSlotButton.displayName = "TimeSlotButton";

// Composant pour un groupe de service (mémorisé)
const ServiceGroupDisplay = memo<{
  serviceGroup: ServiceGroup;
  selectedSlot: TimeSlot | null;
  setSelectedSlot: (slot: TimeSlot | null) => void;
}>(({ serviceGroup, selectedSlot, setSelectedSlot }) => {
  const availableSlots = serviceGroup.slots.filter((slot) => slot.isAvailable);
  const unavailableSlots = serviceGroup.slots.filter((slot) => !slot.isAvailable);

  const handleSlotSelect = useCallback((slot: TimeSlot) => {
    setSelectedSlot(selectedSlot?.time === slot.time && selectedSlot?.slotId === slot.slotId ? null : slot);
  }, [selectedSlot, setSelectedSlot]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{serviceGroup.serviceName}</h3>
        <Badge variant="secondary">
          {availableSlots.length} disponible{availableSlots.length > 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Créneaux disponibles */}
      {availableSlots.length > 0 && (
        <div className="space-y-2">
          <h4 className="flex items-center gap-1 text-sm font-medium text-green-700">
            <CheckCircle className="h-4 w-4" />
            Créneaux disponibles
          </h4>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {availableSlots.map((slot) => (
              <TimeSlotButton
                key={`${slot.slotId}-${slot.time}`}
                slot={slot}
                isSelected={selectedSlot?.time === slot.time && selectedSlot?.slotId === slot.slotId}
                onSelect={handleSlotSelect}
              />
            ))}
          </div>
        </div>
      )}

      {/* Créneaux indisponibles (optionnel) */}
      {unavailableSlots.length > 0 && (
        <div className="space-y-2">
          <h4 className="flex items-center gap-1 text-sm font-medium text-red-700">
            <XCircle className="h-4 w-4" />
            Créneaux fermés
          </h4>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {unavailableSlots.map((slot) => (
              <TimeSlotButton
                key={`${slot.slotId}-${slot.time}`}
                slot={slot}
                isSelected={false}
                onSelect={() => {}} // Pas de sélection pour les créneaux fermés
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

ServiceGroupDisplay.displayName = "ServiceGroupDisplay";

// Composant principal
export function RealtimeSlotsDisplay({
  serviceGroups,
  selectedSlot,
  setSelectedSlot,
  isLoading = false,
  error = null,
  onRefresh,
}: RealtimeSlotsDisplayProps) {
  // État de chargement
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="mb-4 h-6 w-1/3 rounded bg-gray-200"></div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-12 rounded bg-gray-200"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // État d'erreur
  if (error) {
    return (
      <div className="py-8 text-center">
        <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-500" />
        <h3 className="mb-2 text-lg font-semibold text-gray-900">Erreur de chargement</h3>
        <p className="text-muted-foreground mb-4">{error.message}</p>
        {onRefresh && (
          <Button onClick={onRefresh} variant="outline">
            Réessayer
          </Button>
        )}
      </div>
    );
  }

  // Aucun créneau disponible
  if (serviceGroups.length === 0) {
    return (
      <div className="py-8 text-center">
        <div className="bg-muted mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
          <Clock className="text-muted-foreground h-6 w-6" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-gray-900">Pas de créneaux disponibles</h3>
        <p className="text-muted-foreground">Aucun créneau n&apos;est configuré pour cette date.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {serviceGroups.map((serviceGroup) => (
        <ServiceGroupDisplay
          key={serviceGroup.serviceName}
          serviceGroup={serviceGroup}
          selectedSlot={selectedSlot}
          setSelectedSlot={setSelectedSlot}
        />
      ))}
    </div>
  );
}
