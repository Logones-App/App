import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface BookingData {
  id: string;
  establishment_id: string;
  date: string;
  time: string;
  service_name: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_phone: string;
  number_of_guests: number;
  special_requests?: string;
  status: string;
  created_at: string;
  establishment: {
    id: string;
    name: string;
    slug: string;
    address: string;
    phone: string;
    email: string;
    description: string;
    image_url: string;
  };
}

interface BookingConfirmationState {
  confirmationData: BookingData | null;
  timestamp: number | null;
  setConfirmationData: (data: BookingData) => void;
  clearConfirmationData: () => void;
  isExpired: () => boolean;
  getConfirmationData: () => BookingData | null;
}

export const useBookingConfirmationStore = create<BookingConfirmationState>()(
  devtools(
    (set, get) => ({
      confirmationData: null,
      timestamp: null,

      setConfirmationData: (data: BookingData) =>
        set({
          confirmationData: data,
          timestamp: Date.now(),
        }),

      clearConfirmationData: () =>
        set({
          confirmationData: null,
          timestamp: null,
        }),

      isExpired: () => {
        const { timestamp } = get();
        return timestamp ? Date.now() - timestamp > 5 * 60 * 1000 : true; // 5 minutes
      },

      getConfirmationData: () => {
        const { confirmationData, timestamp } = get();
        if (!confirmationData || !timestamp) return null;

        // Vérifier l'expiration
        if (Date.now() - timestamp > 5 * 60 * 1000) {
          get().clearConfirmationData();
          return null;
        }

        return confirmationData;
      },
    }),
    {
      name: "booking-confirmation-store",
    },
  ),
);
