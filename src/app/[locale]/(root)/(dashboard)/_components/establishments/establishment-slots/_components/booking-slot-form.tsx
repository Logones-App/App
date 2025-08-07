"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { DAYS_OF_WEEK } from "../utils";

interface BookingSlotFormData {
  day_of_week?: number;
  slot_name: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  is_active: boolean;
}

interface BookingSlotFormProps<T extends BookingSlotFormData> {
  formData: T;
  onFormChange: (data: T) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isPending: boolean;
  title: string;
  submitText: string;
}

export function BookingSlotForm<T extends BookingSlotFormData>({
  formData,
  onFormChange,
  onSubmit,
  onCancel,
  isPending,
  title,
  submitText,
}: BookingSlotFormProps<T>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {formData.day_of_week !== undefined && (
            <div>
              <Label htmlFor="day_of_week">Jour de la semaine</Label>
              <Select
                value={formData.day_of_week.toString()}
                onValueChange={(value) => onFormChange({ ...formData, day_of_week: parseInt(value) } as T)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day: { value: number; label: string }) => (
                    <SelectItem key={day.value} value={day.value.toString()}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label htmlFor="slot_name">Nom du créneau</Label>
            <Input
              id="slot_name"
              value={formData.slot_name}
              onChange={(e) => onFormChange({ ...formData, slot_name: e.target.value } as T)}
              placeholder="ex: Déjeuner, Dîner"
            />
          </div>
          <div>
            <Label htmlFor="start_time">Heure de début</Label>
            <Input
              id="start_time"
              type="time"
              value={formData.start_time}
              onChange={(e) => onFormChange({ ...formData, start_time: e.target.value } as T)}
            />
          </div>
          <div>
            <Label htmlFor="end_time">Heure de fin</Label>
            <Input
              id="end_time"
              type="time"
              value={formData.end_time}
              onChange={(e) => onFormChange({ ...formData, end_time: e.target.value } as T)}
            />
          </div>
          <div>
            <Label htmlFor="max_capacity">Capacité maximale</Label>
            <Input
              id="max_capacity"
              type="number"
              min="1"
              value={formData.max_capacity}
              onChange={(e) => onFormChange({ ...formData, max_capacity: parseInt(e.target.value) } as T)}
            />
          </div>
          <div className="flex items-center space-x-2">
            <input
              id="is_active"
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => onFormChange({ ...formData, is_active: e.target.checked } as T)}
              className="h-4 w-4"
            />
            <Label htmlFor="is_active">Actif</Label>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={onSubmit} disabled={isPending}>
            {isPending ? "Enregistrement..." : submitText}
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
