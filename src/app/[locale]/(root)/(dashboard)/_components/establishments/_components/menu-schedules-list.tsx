"use client";

import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

interface MenuSchedulesListProps {
  menuId: string;
  organizationId: string;
}

export function MenuSchedulesList({ menuId, organizationId }: MenuSchedulesListProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Tables<"menu_schedules"> | null>(null);
  const queryClient = useQueryClient();

  const { data: schedules } = useQuery({
    queryKey: ["menu-schedules", menuId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("menu_schedules").select("*").eq("menu_id", menuId);
      if (error) throw error;
      return data;
    },
  });

  const form = useForm();

  const mutation = useMutation({
    mutationFn: async (schedule: any) => {
      const supabase = createClient();
      if (editingSchedule) {
        const { error } = await supabase.from("menu_schedules").update(schedule).eq("id", editingSchedule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("menu_schedules").insert({
          ...schedule,
          menu_id: menuId,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      setEditingSchedule(null);
      setIsModalOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("menu_schedules").delete().eq("id", scheduleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });

  const handleSubmit = (values: any) => {
    mutation.mutate(values);
  };

  const handleEdit = (schedule: any) => {
    setEditingSchedule(schedule);
    setIsModalOpen(true);
  };

  const handleDelete = (scheduleId: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette plage horaire ?")) {
      deleteMutation.mutate(scheduleId);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Plages horaires du menu</h3>
        <Button size="sm" onClick={() => setIsModalOpen(true)}>
          + Ajouter une plage
        </Button>
      </div>

      {schedules?.map((schedule: Tables<"menu_schedules">) => (
        <Card key={schedule.id}>
          <CardHeader>
            <CardTitle className="text-sm">
              {schedule.day_of_week} - {schedule.start_time} à {schedule.end_time}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2">
              <Button size="sm" variant="outline" onClick={() => handleEdit(schedule)}>
                Modifier
              </Button>
              <Button size="sm" variant="destructive" onClick={() => handleDelete(schedule.id)}>
                Supprimer
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSchedule ? "Modifier la plage horaire" : "Ajouter une plage horaire"}</DialogTitle>
            <DialogDescription>Configurez les horaires d&apos;application de ce menu.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => {
                handleSubmit({
                  day_of_week: data.day_of_week,
                  start_time: data.start_time,
                  end_time: data.end_time,
                });
              })}
              className="space-y-4"
            >
              <FormField
                name="day_of_week"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jour de la semaine</FormLabel>
                    <FormControl>
                      <Select defaultValue={editingSchedule?.day_of_week?.toString()} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un jour" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monday">Lundi</SelectItem>
                          <SelectItem value="tuesday">Mardi</SelectItem>
                          <SelectItem value="wednesday">Mercredi</SelectItem>
                          <SelectItem value="thursday">Jeudi</SelectItem>
                          <SelectItem value="friday">Vendredi</SelectItem>
                          <SelectItem value="saturday">Samedi</SelectItem>
                          <SelectItem value="sunday">Dimanche</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Heure de début</FormLabel>
                    <FormControl>
                      <Input type="time" defaultValue={editingSchedule?.start_time ?? ""} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="end_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Heure de fin</FormLabel>
                    <FormControl>
                      <Input type="time" defaultValue={editingSchedule?.end_time ?? ""} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? "Enregistrement..." : editingSchedule ? "Modifier" : "Ajouter"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
