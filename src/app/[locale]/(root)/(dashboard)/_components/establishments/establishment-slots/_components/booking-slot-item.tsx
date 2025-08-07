"use client";

import { Edit, Save, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { BookingSlot } from "./use-booking-slots-realtime";

interface BookingSlotFormData {
  slot_name: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  is_active: boolean;
}

interface BookingSlotItemProps {
  slot: BookingSlot;
  isEditing: boolean;
  editForm: BookingSlotFormData;
  onEditFormChange: (data: BookingSlotFormData) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  isPending: boolean;
}

export function BookingSlotItem({
  slot,
  isEditing,
  editForm,
  onEditFormChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  isPending,
}: BookingSlotItemProps) {
  if (isEditing) {
    return (
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="flex-1 space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Input
              value={editForm.slot_name}
              onChange={(e) => onEditFormChange({ ...editForm, slot_name: e.target.value })}
              placeholder="Nom du créneau"
            />
            <Input
              type="time"
              value={editForm.start_time}
              onChange={(e) => onEditFormChange({ ...editForm, start_time: e.target.value })}
            />
            <Input
              type="time"
              value={editForm.end_time}
              onChange={(e) => onEditFormChange({ ...editForm, end_time: e.target.value })}
            />
            <Input
              type="number"
              min="1"
              value={editForm.max_capacity}
              onChange={(e) => onEditFormChange({ ...editForm, max_capacity: parseInt(e.target.value) })}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={editForm.is_active}
              onChange={(e) => onEditFormChange({ ...editForm, is_active: e.target.checked })}
              className="h-4 w-4"
            />
            <Label>Actif</Label>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={onSaveEdit} disabled={isPending}>
              <Save className="mr-1 h-3 w-3" />
              {isPending ? "Sauvegarde..." : "Sauvegarder"}
            </Button>
            <Button size="sm" variant="outline" onClick={onCancelEdit}>
              <X className="mr-1 h-3 w-3" />
              Annuler
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{slot.slot_name}</span>
          <Badge variant={slot.is_active ? "default" : "secondary"}>{slot.is_active ? "Actif" : "Inactif"}</Badge>
        </div>
        <div className="text-muted-foreground text-sm">
          {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)} • Capacité: {slot.max_capacity}
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onStartEdit}>
          <Edit className="mr-1 h-3 w-3" />
          Modifier
        </Button>
        <Button size="sm" variant="outline" onClick={onDelete} disabled={isPending}>
          <Trash2 className="mr-1 h-3 w-3" />
          Supprimer
        </Button>
      </div>
    </div>
  );
}
