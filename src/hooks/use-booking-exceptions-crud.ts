import { useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/supabase/database.types";

type BookingException = Tables<"booking_exceptions">;

interface CreateBookingExceptionData {
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
}

interface UpdateBookingExceptionData {
  exception_type?: "period" | "single_day" | "service" | "time_slots";
  date?: string;
  start_date?: string;
  end_date?: string;
  reason?: string;
  status?: "active" | "inactive";
  booking_slot_id?: string;
  closed_slots?: number[];
}

interface UseBookingExceptionsCrudReturn {
  createException: (data: CreateBookingExceptionData) => Promise<BookingException | null>;
  updateException: (id: string, data: UpdateBookingExceptionData) => Promise<BookingException | null>;
  deleteException: (id: string) => Promise<boolean>;
  isLoading: boolean;
  error: Error | null;
}

export function useBookingExceptionsCrud(): UseBookingExceptionsCrudReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();

  const createException = async (data: CreateBookingExceptionData): Promise<BookingException | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: newException, error } = await supabase
        .from("booking_exceptions")
        .insert({
          ...data,
          status: data.status ?? "active",
        })
        .select()
        .single();

      if (error) throw error;

      console.log("✅ Exception créée:", newException);
      return newException;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de la création de l'exception";
      console.error("❌ Erreur lors de la création de l'exception:", err);
      setError(new Error(errorMessage));
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updateException = async (id: string, data: UpdateBookingExceptionData): Promise<BookingException | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: updatedException, error } = await supabase
        .from("booking_exceptions")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      console.log("✅ Exception modifiée:", updatedException);
      return updatedException;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de la modification de l'exception";
      console.error("❌ Erreur lors de la modification de l'exception:", err);
      setError(new Error(errorMessage));
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteException = async (id: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.from("booking_exceptions").delete().eq("id", id);

      if (error) throw error;

      console.log("✅ Exception supprimée");
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de la suppression de l'exception";
      console.error("❌ Erreur lors de la suppression de l'exception:", err);
      setError(new Error(errorMessage));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createException,
    updateException,
    deleteException,
    isLoading,
    error,
  };
}
