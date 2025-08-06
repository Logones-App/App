"use client";

import { Edit, Save, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import type { OpeningHour } from "./_components";

// Noms des jours de la semaine
const DAYS_OF_WEEK = [
  { value: 0, label: "Dimanche" },
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
];

// Composant pour la liste des horaires
export function OpeningHoursList({
  openingHours,
  editingSlotId,
  editForm,
  setEditForm,
  startEdit,
  cancelEdit,
  saveEdit,
  deleteSlot,
  t,
}: {
  openingHours: OpeningHour[];
  editingSlotId: string | null;
  editForm: any;
  setEditForm: any;
  startEdit: (slot: OpeningHour) => void;
  cancelEdit: () => void;
  saveEdit: (slot: OpeningHour) => void;
  deleteSlot: (id: string) => void;
  t: any;
}) {
  return (
    <div className="space-y-4">
      {openingHours.map((slot) => (
        <Card key={slot.id}>
          <CardContent className="p-4">
            {editingSlotId === slot.id ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Heure d&apos;ouverture</Label>
                    <Input
                      type="time"
                      value={editForm.open_time}
                      onChange={(e) => setEditForm({ ...editForm, open_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Heure de fermeture</Label>
                    <Input
                      type="time"
                      value={editForm.close_time}
                      onChange={(e) => setEditForm({ ...editForm, close_time: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={editForm.is_active}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, is_active: checked })}
                  />
                  <Label>Actif</Label>
                </div>
                <div className="flex space-x-2">
                  <Button onClick={() => saveEdit(slot)}>
                    <Save className="mr-2 h-4 w-4" />
                    Sauvegarder
                  </Button>
                  <Button variant="outline" onClick={cancelEdit}>
                    <X className="mr-2 h-4 w-4" />
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{DAYS_OF_WEEK.find((d) => d.value === slot.day_of_week)?.label}</h3>
                  <p className="text-muted-foreground text-sm">
                    {slot.open_time} - {slot.close_time}
                  </p>
                  <div className="mt-2 flex items-center space-x-2">
                    <Badge variant={slot.is_active ? "default" : "secondary"}>
                      {slot.is_active ? "Actif" : "Inactif"}
                    </Badge>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => startEdit(slot)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => deleteSlot(slot.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
