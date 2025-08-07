"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { DAYS_OF_WEEK } from "../utils";

import { BookingSlotItem } from "./booking-slot-item";
import { BookingSlot } from "./use-booking-slots-realtime";

interface EditBookingSlotFormData {
  slot_name: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  is_active: boolean;
}

interface BookingSlotsListProps {
  bookingSlots: BookingSlot[];
  editingSlotId: string | null;
  editForm: EditBookingSlotFormData;
  onEditFormChange: (data: EditBookingSlotFormData) => void;
  onStartEdit: (slot: BookingSlot) => void;
  onSaveEdit: (slot: BookingSlot) => void;
  onCancelEdit: () => void;
  onDelete: (slotId: string) => void;
  isPending: boolean;
}

export function BookingSlotsList({
  bookingSlots,
  editingSlotId,
  editForm,
  onEditFormChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  isPending,
}: BookingSlotsListProps) {
  // Grouper les créneaux par jour
  const slotsByDay = bookingSlots.reduce(
    (acc, slot) => {
      const day = slot.day_of_week;
      if (!(day in acc)) acc[day] = [];
      acc[day].push(slot);
      return acc;
    },
    {} as Record<number, BookingSlot[]>,
  );

  return (
    <div className="space-y-6">
      {DAYS_OF_WEEK.map((day: { value: number; label: string }) => {
        const daySlots = slotsByDay[day.value] ?? [];
        return (
          <Card key={day.value}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{day.label}</span>
                <Badge variant="outline">{daySlots.length} créneau(s)</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {daySlots.length === 0 ? (
                <p className="text-muted-foreground">Aucun créneau configuré</p>
              ) : (
                <div className="space-y-3">
                  {daySlots.map((slot) => (
                    <BookingSlotItem
                      key={slot.id}
                      slot={slot}
                      isEditing={editingSlotId === slot.id}
                      editForm={editForm}
                      onEditFormChange={onEditFormChange}
                      onStartEdit={() => onStartEdit(slot)}
                      onSaveEdit={() => onSaveEdit(slot)}
                      onCancelEdit={onCancelEdit}
                      onDelete={() => onDelete(slot.id)}
                      isPending={isPending}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
