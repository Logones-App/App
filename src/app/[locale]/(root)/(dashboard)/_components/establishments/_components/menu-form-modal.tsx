"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

interface MenuFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: Tables<"menus">) => void;
  initialValues?: Tables<"menus">;
}

export function MenuFormModal({ open, onOpenChange, onSubmit, initialValues }: MenuFormModalProps) {
  const queryClient = useQueryClient();

  const form = useForm<Tables<"menus">>({
    defaultValues: initialValues ?? {
      name: "",
      description: "",
      is_active: true,
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: Tables<"menus">) => {
      const supabase = createClient();
      if (initialValues) {
        const { error } = await supabase.from("menus").update(values).eq("id", initialValues.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("menus").insert(values);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      form.reset();
      onOpenChange(false);
    },
  });

  const handleSubmit = (values: Tables<"menus">) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialValues ? "Modifier le menu" : "Créer un nouveau menu"}</DialogTitle>
          <DialogDescription>
            {initialValues
              ? "Modifiez les informations du menu."
              : "Remplissez les informations pour créer un nouveau menu."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Enregistrement..." : initialValues ? "Modifier" : "Créer"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
