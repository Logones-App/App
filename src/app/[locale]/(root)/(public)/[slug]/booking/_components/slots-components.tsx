import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TimeSlot, ServiceGroup } from "@/lib/utils/slots-realtime-utils";

// Composant pour les informations sur la date
export function DateInfo({ selectedDate }: { selectedDate: Date }) {
  const formatDate = (date: Date) => {
    return format(date, "EEEE d MMMM yyyy", { locale: fr });
  };

  return (
    <Card className="mt-6 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="text-primary h-5 w-5" />
          Date sélectionnée
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-primary/5 rounded-lg p-4 text-center">
          <p className="text-primary text-lg font-semibold">{formatDate(selectedDate)}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Composant pour l'affichage des créneaux groupés par service
export function GroupedSlotsDisplay({
  serviceGroups,
  selectedSlot,
  setSelectedSlot,
}: {
  serviceGroups: ServiceGroup[];
  selectedSlot: TimeSlot | null;
  setSelectedSlot: (slot: TimeSlot) => void;
}) {
  return serviceGroups.map((group) => (
    <div key={group.serviceName} className="mb-8">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">{group.serviceName}</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {group.slots.map((slot, index) => (
          <Button
            key={`${slot.time}-${slot.slotId ?? index}`}
            variant={selectedSlot?.time === slot.time ? "default" : "outline"}
            className={cn(
              "flex h-16 flex-col items-center justify-center gap-1 transition-all",
              !slot.isAvailable && "cursor-not-allowed opacity-50",
              selectedSlot?.time === slot.time && "ring-primary ring-2 ring-offset-2",
            )}
            disabled={!slot.isAvailable}
            onClick={() => slot.isAvailable && setSelectedSlot(slot)}
          >
            <span className="text-sm font-medium">{slot.time}</span>
            {slot.maxCapacity > 0 && (
              <Badge variant={slot.isAvailable ? "default" : "secondary"} className="text-xs">
                {slot.maxCapacity}
              </Badge>
            )}
          </Button>
        ))}
      </div>
    </div>
  ));
}

// Composant pour l'affichage du créneau sélectionné
export function SelectedSlotDisplay({ selectedSlot }: { selectedSlot: TimeSlot }) {
  return (
    <div className="bg-primary/5 mt-6 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm">Créneau sélectionné</p>
          <p className="text-primary text-lg font-semibold">{selectedSlot.time}</p>
          <p className="text-muted-foreground text-sm">Capacité disponible : {selectedSlot.maxCapacity} personnes</p>
        </div>
        <Check className="text-primary h-6 w-6" />
      </div>
    </div>
  );
}
