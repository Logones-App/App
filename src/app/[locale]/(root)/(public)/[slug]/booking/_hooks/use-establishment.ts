import { useState, useEffect } from "react";

import { Tables } from "@/lib/supabase/database.types";

import { getEstablishmentBySlug } from "../_components/database-utils";
import { extractEstablishmentSlug, logParamsExtraction } from "../_utils/params-utils";

type Establishment = Tables<"establishments">;

interface UseEstablishmentOptions {
  params: Promise<any>;
  onError?: (error: string) => void;
  onSuccess?: (establishment: Establishment) => void;
}

interface UseEstablishmentReturn {
  establishment: Establishment | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook personnalisé pour la gestion des établissements
 * Centralise la logique de chargement et de gestion d'état
 */
export const useEstablishment = ({ params, onError, onSuccess }: UseEstablishmentOptions): UseEstablishmentReturn => {
  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEstablishment = async () => {
    try {
      setLoading(true);
      setError(null);

      const resolvedParams = await params;
      const establishmentSlug = extractEstablishmentSlug(resolvedParams);

      logParamsExtraction(resolvedParams, "establishment");

      if (!establishmentSlug) {
        const errorMsg = "Slug d'établissement manquant";
        console.error("❌", errorMsg);
        setError(errorMsg);
        onError?.(errorMsg);
        return;
      }

      const establishmentData = await getEstablishmentBySlug(establishmentSlug);

      if (!establishmentData) {
        const errorMsg = "Établissement non trouvé";
        console.error("❌", errorMsg);
        setError(errorMsg);
        onError?.(errorMsg);
        return;
      }

      console.log("✅ Établissement chargé:", establishmentData.name);
      setEstablishment(establishmentData);
      onSuccess?.(establishmentData);
    } catch (err) {
      const errorMsg = "Erreur lors du chargement de l'établissement";
      console.error("❌", errorMsg, err);
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const refetch = async () => {
    await loadEstablishment();
  };

  useEffect(() => {
    loadEstablishment();
  }, [params]);

  return {
    establishment,
    loading,
    error,
    refetch,
  };
};
