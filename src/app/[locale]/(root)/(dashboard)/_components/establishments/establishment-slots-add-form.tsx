"use client";

import type { Dispatch, SetStateAction } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { DAYS_OF_WEEK, type SlotAddForm } from "./establishment-slots-types";

type Props = {
  show: boolean;
  onClose: () => void;
  addForm: SlotAddForm;
  setAddForm: Dispatch<SetStateAction<SlotAddForm>>;
  onAdd: () => void;
  isPending: boolean;
};

export function EstablishmentSlotsAddForm({ show, onClose, addForm, setAddForm, onAdd, isPending }: Props) {
  if (!show) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nouveau créneau</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="day_of_week">Jour de la semaine</Label>
            <Select
              value={addForm.day_of_week.toString()}
              onValueChange={(value) => setAddForm({ ...addForm, day_of_week: parseInt(value, 10) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS_OF_WEEK.map((day) => (
                  <SelectItem key={day.value} value={day.value.toString()}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="slot_name">Nom du créneau</Label>
            <Input
              id="slot_name"
              value={addForm.slot_name}
              onChange={(e) => setAddForm({ ...addForm, slot_name: e.target.value })}
              placeholder="ex: Déjeuner, Dîner"
            />
          </div>
          <div>
            <Label htmlFor="start_time">Heure de début</Label>
            <Input
              id="start_time"
              type="time"
              value={addForm.start_time}
              onChange={(e) => setAddForm({ ...addForm, start_time: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="end_time">Heure de fin</Label>
            <Input
              id="end_time"
              type="time"
              value={addForm.end_time}
              onChange={(e) => setAddForm({ ...addForm, end_time: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="max_capacity">Capacité maximale</Label>
            <Input
              id="max_capacity"
              type="number"
              min="1"
              value={addForm.max_capacity}
              onChange={(e) => setAddForm({ ...addForm, max_capacity: parseInt(e.target.value, 10) })}
            />
          </div>
          <div className="flex items-center space-x-2">
            <input
              id="is_active"
              type="checkbox"
              checked={addForm.is_active}
              onChange={(e) => setAddForm({ ...addForm, is_active: e.target.checked })}
              className="h-4 w-4"
            />
            <Label htmlFor="is_active">Actif</Label>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={onAdd} disabled={isPending}>
            {isPending ? "Ajout..." : "Ajouter"}
          </Button>
          <Button variant="outline" onClick={() => onClose()}>
            Annuler
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
