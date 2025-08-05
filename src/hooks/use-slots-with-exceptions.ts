import { useState, useEffect, useCallback } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

import { useBookingExceptionsRealtime } from "@/hooks/use-booking-exceptions-realtime";
import { useEstablishmentOrganization } from "@/hooks/use-establishment-organization";
import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/supabase/database.types";
import { groupSlotsByServiceRealtime, type BookingSlot, type ServiceGroup } from "@/lib/utils/slots-realtime-utils";

type BookingException = Tables<"booking_exceptions">;

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

// Fonction pour récupérer les slots depuis la base de données
const useSlotsQuery = (establishmentId: string, enabled: boolean) => {
  return useQuery({
    queryKey: ["booking-slots", establishmentId],
    queryFn: async () => {
      console.log("🔍 DEBUG useSlotsWithExceptions - Récupération des slots:");
      console.log("  - EstablishmentId:", establishmentId);
      console.log("  - Query enabled:", enabled);

      if (!establishmentId) {
        console.log("❌ EstablishmentId manquant");
        return [];
      }

      const supabase = createClient();
      const { data, error } = await supabase
        .from("booking_slots")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("deleted", false)
        .order("display_order", { ascending: true });

      if (error) {
        console.error("❌ Erreur lors de la récupération des slots:", error);
        throw error;
      }

      console.log("✅ Slots récupérés de la base:", data?.length ?? 0);
      if (data && data.length > 0) {
        console.log("  - Premier slot:", data[0]);
      }

      return data as BookingSlot[];
    },
    enabled: enabled && !!establishmentId,
  });
};

// Fonction pour calculer les créneaux avec exceptions
const useSlotsCalculation = (
  slots: BookingSlot[] | undefined,
  exceptions: BookingException[] | undefined,
  formattedDate: string,
  enabled: boolean,
  organizationId: string | null,
) => {
  const [serviceGroups, setServiceGroups] = useState<ServiceGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const calculateSlotsWithExceptions = useCallback(async () => {
    console.log("🔍 DEBUG calculateSlotsWithExceptions:");
    console.log("  - Slots disponibles:", slots?.length ?? 0);
    console.log("  - Enabled:", enabled);
    console.log("  - OrganizationId:", organizationId);

    if (!slots || !enabled || !organizationId) {
      console.log("❌ Conditions non remplies pour le calcul");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Utiliser la fonction côté client pour grouper les créneaux
      const groups = groupSlotsByServiceRealtime(slots, exceptions ?? [], formattedDate);

      console.log("✅ Groupes calculés:", groups.length);
      groups.forEach((group, idx) => {
        console.log(`  - Groupe ${idx + 1}: ${group.serviceName} (${group.slots.length} créneaux)`);
      });

      setServiceGroups(groups);
    } catch (err) {
      console.error("❌ Erreur lors du calcul des créneaux:", err);
      setError(err instanceof Error ? err : new Error("Erreur inconnue"));
    } finally {
      setIsLoading(false);
    }
  }, [slots, exceptions, formattedDate, enabled, organizationId]);

  // Effet pour recalculer quand les données changent
  useEffect(() => {
    calculateSlotsWithExceptions();
  }, [calculateSlotsWithExceptions]);

  return { serviceGroups, isLoading, error };
};

// Fonction pour gérer les états globaux
const useGlobalStates = (
  slotsLoading: boolean | undefined,
  exceptionsLoading: boolean | undefined,
  orgLoading: boolean | undefined,
  slotsError: Error | null,
  exceptionsError: Error | null,
  orgError: Error | null,
  calculationLoading: boolean,
  calculationError: Error | null,
) => {
  const globalLoading = slotsLoading ?? exceptionsLoading ?? orgLoading;
  const globalError = slotsError ?? exceptionsError ?? orgError;
  const finalLoading = globalLoading ?? calculationLoading;
  const finalError = globalError ?? calculationError;

  return { finalLoading, finalError };
};

// Fonction pour gérer le rafraîchissement
const useRefreshFunction = (queryClient: ReturnType<typeof useQueryClient>, establishmentId: string) => {
  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["booking-slots", establishmentId] });
  }, [queryClient, establishmentId]);
};

// Fonction pour gérer les hooks de données
// Fonction pour récupérer l'organization
const useOrganizationData = (establishmentId: string, enabled: boolean) => {
  return useEstablishmentOrganization({
    establishmentId,
    enabled: enabled && !!establishmentId,
  });
};

// Fonction pour récupérer les exceptions
const useExceptionsData = (establishmentId: string, organizationId: string | null, date: Date) => {
  return useBookingExceptionsRealtime({
    establishmentId,
    organizationId: organizationId ?? undefined,
    date,
  });
};

// Fonction pour gérer tous les hooks de données
const useDataHooks = (establishmentId: string, enabled: boolean, date: Date) => {
  const formattedDate = format(date, "yyyy-MM-dd");

  // Récupérer l'organizationId de l'établissement
  const { organizationId, isLoading: orgLoading, error: orgError } = useOrganizationData(establishmentId, enabled);

  // Query pour récupérer les créneaux de base
  const {
    data: slots,
    isLoading: slotsLoading,
    error: slotsError,
  } = useSlotsQuery(establishmentId, enabled && !!establishmentId);

  // Hook realtime pour les exceptions
  const {
    exceptions,
    isLoading: exceptionsLoading,
    error: exceptionsError,
  } = useExceptionsData(establishmentId, organizationId, date);

  return {
    formattedDate,
    organizationId,
    slots,
    exceptions,
    orgLoading,
    slotsLoading,
    exceptionsLoading,
    orgError,
    slotsError,
    exceptionsError,
  };
};

// Fonction pour gérer le debug
const useDebugLog = (
  serviceGroups: ServiceGroup[],
  finalLoading: boolean,
  finalError: Error | null,
  exceptions: BookingException[],
) => {
  const debugInfo = {
    serviceGroupsLength: serviceGroups?.length ?? 0,
    finalLoading,
    finalError: finalError?.message,
    exceptionsLength: exceptions?.length ?? 0,
  };
  console.log("🔍 DEBUG useSlotsWithExceptions - Retour:", debugInfo);
};

// Fonction principale refactorisée
export function useSlotsWithExceptions({
  establishmentId,
  date,
  enabled = true,
}: UseSlotsWithExceptionsProps): UseSlotsWithExceptionsReturn {
  const queryClient = useQueryClient();

  // Gestion des hooks de données
  const {
    formattedDate,
    organizationId,
    slots,
    exceptions,
    orgLoading,
    slotsLoading,
    exceptionsLoading,
    orgError,
    slotsError,
    exceptionsError,
  } = useDataHooks(establishmentId, enabled, date);

  // Calcul des créneaux avec exceptions
  const {
    serviceGroups,
    isLoading: calculationLoading,
    error: calculationError,
  } = useSlotsCalculation(slots, exceptions, formattedDate, enabled, organizationId);

  // Gestion des états globaux
  const { finalLoading, finalError } = useGlobalStates(
    slotsLoading,
    exceptionsLoading,
    orgLoading,
    slotsError,
    exceptionsError,
    orgError,
    calculationLoading,
    calculationError,
  );

  // Fonction de rafraîchissement
  const refresh = useRefreshFunction(queryClient, establishmentId);

  // Debug log
  useDebugLog(serviceGroups, finalLoading, finalError, exceptions);

  return {
    serviceGroups,
    isLoading: finalLoading,
    error: finalError,
    refresh,
    exceptions: exceptions ?? [],
  };
}
