import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useBookingExceptionsRealtime } from "@/hooks/use-booking-exceptions-realtime";
import { useEstablishmentOrganization } from "@/hooks/use-establishment-organization";
import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/supabase/database.types";
import { 
  groupSlotsByServiceRealtime,
  type BookingSlot,
  type ServiceGroup 
} from "@/lib/utils/slots-realtime-utils";
import { format } from "date-fns";

type BookingException = Tables<"booking_exceptions">;

interface TimeSlot {
  time: string;
  isAvailable: boolean;
  maxCapacity: number;
  slotId?: string;
}

interface UseSlotsWithExceptionsProps {
  establishmentId: string;
  date: Date;
  enabled?: boolean;
}

interface UseSlotsWithExceptionsReturn {
  serviceGroups: ServiceGroup[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
  exceptions: BookingException[];
}

export function useSlotsWithExceptions({
  establishmentId,
  date,
  enabled = true,
}: UseSlotsWithExceptionsProps): UseSlotsWithExceptionsReturn {
  const queryClient = useQueryClient();
  const [serviceGroups, setServiceGroups] = useState<ServiceGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const formattedDate = format(date, "yyyy-MM-dd");

  // Récupérer l'organizationId de l'établissement
  const { organizationId, isLoading: orgLoading, error: orgError } = useEstablishmentOrganization({
    establishmentId,
    enabled: enabled && !!establishmentId,
  });

  // Query pour récupérer les créneaux de base
  const { data: slots, isLoading: slotsLoading, error: slotsError } = useQuery({
    queryKey: ["booking-slots", establishmentId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("booking_slots")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("deleted", false)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as BookingSlot[];
    },
    enabled: enabled && !!establishmentId,
  });

  // Hook realtime pour les exceptions
  const { exceptions, isLoading: exceptionsLoading, error: exceptionsError } = useBookingExceptionsRealtime({
    establishmentId,
    organizationId,
    date,
  });

  // Fonction pour calculer les créneaux avec exceptions
  const calculateSlotsWithExceptions = useCallback(async () => {
    if (!slots || !enabled || !organizationId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Utiliser la fonction côté client pour grouper les créneaux
      const groups = groupSlotsByServiceRealtime(slots, exceptions ?? [], formattedDate);

      setServiceGroups(groups);
      console.log("🔄 Créneaux recalculés avec exceptions:", groups.length, "groupes");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors du calcul des créneaux";
      console.error("❌ Erreur lors du calcul des créneaux:", err);
      setError(new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  }, [slots, exceptions, formattedDate, enabled, organizationId]);

  // Effet pour recalculer les créneaux quand les données changent
  useEffect(() => {
    calculateSlotsWithExceptions();
  }, [calculateSlotsWithExceptions]);

  // Fonction de rafraîchissement
  const refresh = useCallback(async () => {
    // Invalider les queries pour forcer un rafraîchissement
    await queryClient.invalidateQueries({ queryKey: ["booking-slots", establishmentId] });
    await queryClient.invalidateQueries({ queryKey: ["establishment", establishmentId] });
    
    // Recalculer les créneaux
    await calculateSlotsWithExceptions();
  }, [queryClient, establishmentId, calculateSlotsWithExceptions]);

  // Gestion des états de chargement et d'erreur globaux
  const globalLoading = slotsLoading || exceptionsLoading || orgLoading || isLoading;
  const globalError = slotsError || exceptionsError || orgError || error;

  return {
    serviceGroups,
    isLoading: globalLoading,
    error: globalError,
    refresh,
    exceptions: exceptions ?? [],
  };
}