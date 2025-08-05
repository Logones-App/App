import { useState, useEffect, useCallback, useRef } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/supabase/database.types";

type BookingException = Tables<"booking_exceptions">;

interface UseBookingExceptionsRealtimeProps {
  establishmentId: string;
  organizationId: string;
}

interface UseBookingExceptionsRealtimeReturn {
  exceptions: BookingException[];
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  create: (data: CreateBookingExceptionData) => void;
  update: (data: { id: string } & UpdateBookingExceptionData) => void;
  delete: (id: string) => void;
  refresh: () => void;
}

export type CreateBookingExceptionData = {
  establishment_id: string;
  organization_id: string;
  exception_type: "period" | "single_day" | "service" | "time_slots";
  date?: string;
  start_date?: string;
  end_date?: string;
  reason?: string;
  status?: "active" | "inactive";
  booking_slot_id?: string;
  closed_slots?: number[];
  service?: string;
};

interface UpdateBookingExceptionData {
  exception_type?: "period" | "single_day" | "service" | "time_slots";
  date?: string;
  start_date?: string;
  end_date?: string;
  reason?: string;
  status?: "active" | "inactive";
  booking_slot_id?: string;
  closed_slots?: number[];
  service?: string;
}

export function useBookingExceptionsRealtime({
  establishmentId,
  organizationId,
}: UseBookingExceptionsRealtimeProps): UseBookingExceptionsRealtimeReturn {
  // États locaux
  const [exceptions, setExceptions] = useState<BookingException[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Références
  const supabase = createClient();
  const queryClient = useQueryClient();
  const channelRef = useRef<any>(null);

  // Fonction de chargement initial
  const loadExceptions = useCallback(async () => {
    if (!establishmentId || !organizationId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("booking_exceptions")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("organization_id", organizationId)
        .eq("deleted", false)
        .order("created_at", { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setExceptions(data ?? []);
    } catch (err) {
      console.error("❌ Erreur lors du chargement des exceptions:", err);
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [establishmentId, organizationId, supabase]);

  // Mutation pour créer une exception
  const createMutation = useMutation({
    mutationFn: async (data: CreateBookingExceptionData) => {
      const { data: newException, error } = await supabase
        .from("booking_exceptions")
        .insert({
          ...data,
          status: data.status ?? "active",
        })
        .select()
        .single();

      if (error) throw error;
      return newException;
    },
    onSuccess: (data) => {
      toast.success("Exception créée avec succès");
      // Le realtime s'occupera de mettre à jour la liste
    },
    onError: (error) => {
      console.error("❌ Erreur lors de la création:", error);
      toast.error("Erreur lors de la création de l'exception");
    },
  });

  // Mutation pour mettre à jour une exception
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & UpdateBookingExceptionData) => {
      const { data: updatedException, error } = await supabase
        .from("booking_exceptions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return updatedException;
    },
    onSuccess: (data) => {
      toast.success("Exception modifiée avec succès");
      // Le realtime s'occupera de mettre à jour la liste
    },
    onError: (error) => {
      console.error("❌ Erreur lors de la modification:", error);
      toast.error("Erreur lors de la modification de l'exception");
    },
  });

  // Mutation pour supprimer une exception
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("booking_exceptions").update({ deleted: true }).eq("id", id);

      if (error) throw error;
      return { id };
    },
    onSuccess: () => {
      toast.success("Exception supprimée avec succès");
      // Le realtime s'occupera de mettre à jour la liste
    },
    onError: (error) => {
      console.error("❌ Erreur lors de la suppression:", error);
      toast.error("Erreur lors de la suppression de l'exception");
    },
  });

  // Configuration du realtime
  useEffect(() => {
    if (!establishmentId || !organizationId) return;

    // Chargement initial
    loadExceptions();

    // Configuration du channel realtime
    const channel = supabase
      .channel(`booking-exceptions-${establishmentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "booking_exceptions",
          filter: `establishment_id=eq.${establishmentId}`,
        },
        (payload) => {
          console.log("🔄 Booking exceptions realtime event:", payload);

          // Vérifier que le payload appartient à la bonne organisation
          if (payload.new && (payload.new as any).organization_id !== organizationId) {
            return; // Ignorer les événements d'autres organisations
          }

          setExceptions((prevExceptions) => {
            switch (payload.eventType) {
              case "INSERT":
                if (payload.new && !(payload.new as any).deleted) {
                  return [payload.new as BookingException, ...prevExceptions];
                }
                return prevExceptions;

              case "UPDATE":
                if (payload.new) {
                  const newData = payload.new as BookingException;
                  if (newData.deleted) {
                    // Suppression logique
                    return prevExceptions.filter((exception) => exception.id !== newData.id);
                  } else {
                    // Mise à jour
                    return prevExceptions.map((exception) => (exception.id === newData.id ? newData : exception));
                  }
                }
                return prevExceptions;

              case "DELETE": {
                const oldData = payload.old as BookingException;
                return prevExceptions.filter((exception) => exception.id !== oldData.id);
              }

              default:
                return prevExceptions;
            }
          });
        },
      )
      .subscribe((status) => {
        console.log("📡 Booking exceptions realtime status:", status);
        setIsConnected(status === "SUBSCRIBED");
      });

    channelRef.current = channel;

    // Cleanup
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [establishmentId, organizationId, loadExceptions, supabase]);

  // Fonction de rafraîchissement manuel
  const refresh = useCallback(() => {
    loadExceptions();
  }, [loadExceptions]);

  return {
    exceptions,
    loading,
    error,
    isConnected,
    create: createMutation.mutate,
    update: updateMutation.mutate,
    delete: deleteMutation.mutate,
    refresh,
  };
}
