"use client";

import type { Dispatch, SetStateAction } from "react";

import { Edit, Save, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { DAYS_OF_WEEK, type BookingSlot, type SlotEditForm } from "./establishment-slots-types";

type Props = {
  slotsByDay: Record<number, BookingSlot[]>;
  editingSlotId: string | null;
  editForm: SlotEditForm;
  setEditForm: Dispatch<SetStateAction<SlotEditForm>>;
  startEdit: (slot: BookingSlot) => void;
  saveEdit: (slot: BookingSlot) => void;
  cancelEdit: () => void;
  onDelete: (id: string) => void;
  deletePending: boolean;
  updatePending: boolean;
};

export function EstablishmentSlotsDayGrid({
  slotsByDay,
  editingSlotId,
  editForm,
  setEditForm,
  startEdit,
  saveEdit,
  cancelEdit,
  onDelete,
  deletePending,
  updatePending,
}: Props) {
  return (
    <div className="space-y-6">
      {DAYS_OF_WEEK.map((day) => {
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
                    <div key={slot.id} className="flex items-center justify-between rounded-lg border p-3">
                      {editingSlotId === slot.id ? (
                        <div className="flex-1 space-y-3">
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                            <Input
                              value={editForm.slot_name}
                              onChange={(e) => setEditForm({ ...editForm, slot_name: e.target.value })}
                              placeholder="Nom du créneau"
                            />
                            <Input
                              type="time"
                              value={editForm.start_time}
                              onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
                            />
                            <Input
                              type="time"
                              value={editForm.end_time}
                              onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })}
                            />
                            <Input
                              type="number"
                              min="1"
                              value={editForm.max_capacity}
                              onChange={(e) => setEditForm({ ...editForm, max_capacity: parseInt(e.target.value, 10) })}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={editForm.is_active}
                              onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                              className="h-4 w-4"
                            />
                            <Label>Actif</Label>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => saveEdit(slot)} disabled={updatePending}>
                              <Save className="mr-1 h-3 w-3" />
                              {updatePending ? "Sauvegarde..." : "Sauvegarder"}
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEdit}>
                              <X className="mr-1 h-3 w-3" />
                              Annuler
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{slot.slot_name}</span>
                              <Badge variant={slot.is_active ? "default" : "secondary"}>
                                {slot.is_active ? "Actif" : "Inactif"}
                              </Badge>
                            </div>
                            <div className="text-muted-foreground text-sm">
                              {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)} • Capacité:{" "}
                              {slot.max_capacity}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => startEdit(slot)}>
                              <Edit className="mr-1 h-3 w-3" />
                              Modifier
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onDelete(slot.id)}
                              disabled={deletePending}
                            >
                              <Trash2 className="mr-1 h-3 w-3" />
                              Supprimer
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
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
