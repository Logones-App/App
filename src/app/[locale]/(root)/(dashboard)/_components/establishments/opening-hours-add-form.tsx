"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

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

// Composant pour le formulaire d'ajout
export function AddForm({
  addForm,
  setAddForm,
  handleAdd,
  setShowAddForm,
  t,
}: {
  addForm: any;
  setAddForm: any;
  handleAdd: () => void;
  setShowAddForm: (show: boolean) => void;
  t: any;
}) {
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Plus className="mr-2 h-5 w-5" />
          {t("openingHours.addSlot")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="day_of_week">Jour</Label>
            <Select
              value={addForm.day_of_week.toString()}
              onValueChange={(value) => setAddForm({ ...addForm, day_of_week: parseInt(value) })}
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
          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={addForm.is_active}
              onCheckedChange={(checked) => setAddForm({ ...addForm, is_active: checked })}
            />
            <Label htmlFor="is_active">Actif</Label>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="open_time">Heure d&apos;ouverture</Label>
            <Input
              id="open_time"
              type="time"
              value={addForm.open_time}
              onChange={(e) => setAddForm({ ...addForm, open_time: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="close_time">Heure de fermeture</Label>
            <Input
              id="close_time"
              type="time"
              value={addForm.close_time}
              onChange={(e) => setAddForm({ ...addForm, close_time: e.target.value })}
            />
          </div>
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleAdd}>Ajouter</Button>
          <Button variant="outline" onClick={() => setShowAddForm(false)}>
            Annuler
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
