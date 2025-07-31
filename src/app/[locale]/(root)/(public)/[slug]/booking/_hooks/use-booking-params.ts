import { useState, useEffect } from "react";

import { parseISO } from "date-fns";

import { extractDate, extractTime, formatTimeFromParams, logParamsExtraction } from "../_utils/params-utils";

interface UseBookingParamsOptions {
  params: Promise<any>;
  onError?: (error: string) => void;
  onSuccess?: (data: { date: Date; time: string }) => void;
}

interface UseBookingParamsReturn {
  selectedDate: Date | null;
  selectedTime: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook personnalisé pour la gestion des paramètres de réservation
 * Centralise la logique d'extraction et de validation des paramètres
 */
export const useBookingParams = ({ params, onError, onSuccess }: UseBookingParamsOptions): UseBookingParamsReturn => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadParams = async () => {
    try {
      setLoading(true);
      setError(null);

      const resolvedParams = await params;
      const dateParam = extractDate(resolvedParams);
      const timeParam = extractTime(resolvedParams);

      logParamsExtraction(resolvedParams, "booking");

      // Traitement de la date
      if (dateParam) {
        try {
          const date = parseISO(dateParam);
          console.log("✅ Date parsée:", date);
          setSelectedDate(date);
        } catch (err) {
          const errorMsg = "Format de date invalide";
          console.error("❌", errorMsg, dateParam);
          setError(errorMsg);
          onError?.(errorMsg);
          return;
        }
      } else {
        console.log("⚠️ Aucune date fournie");
      }

      // Traitement de l'heure
      if (timeParam) {
        const formattedTime = formatTimeFromParams(timeParam);
        console.log("✅ Heure formatée:", formattedTime);
        setSelectedTime(formattedTime);
      } else {
        console.log("⚠️ Aucune heure fournie");
      }

      // Callback de succès si on a au moins une date
      if (dateParam) {
        const time = timeParam ? formatTimeFromParams(timeParam) : "";
        onSuccess?.({ date: parseISO(dateParam), time });
      }
    } catch (err) {
      const errorMsg = "Erreur lors du traitement des paramètres";
      console.error("❌", errorMsg, err);
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const refetch = async () => {
    await loadParams();
  };

  useEffect(() => {
    loadParams();
  }, [params]);

  return {
    selectedDate,
    selectedTime,
    loading,
    error,
    refetch,
  };
};
