import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface Establishment {
  id: string;
  name: string;
  slug: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  logo_url: string | null;
  cover_image_url: string | null;
  website: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  deleted: boolean;
}

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
  special_requests: string | null;
  status: string;
  created_at: string;
  establishment: Establishment;
}

interface BookingState {
  // Établissement sélectionné
  establishment: Establishment | null;

  // Date et heure sélectionnées
  selectedDate: Date | null;
  selectedTime: string | null;

  // Données de réservation après création
  bookingData: BookingData | null;

  // Actions
  setEstablishment: (establishment: Establishment) => void;
  setSelectedDate: (date: Date) => void;
  setSelectedTime: (time: string) => void;
  setBookingData: (data: BookingData) => void;
  clearBookingData: () => void;
  reset: () => void;
}

export const useBookingStore = create<BookingState>()(
  devtools(
    (set) => ({
      // État initial
      establishment: null,
      selectedDate: null,
      selectedTime: null,
      bookingData: null,

      // Actions
      setEstablishment: (establishment) => set({ establishment }, false, "setEstablishment"),

      setSelectedDate: (date) => set({ selectedDate: date }, false, "setSelectedDate"),

      setSelectedTime: (time) => set({ selectedTime: time }, false, "setSelectedTime"),

      setBookingData: (data) => set({ bookingData: data }, false, "setBookingData"),

      clearBookingData: () => set({ bookingData: null }, false, "clearBookingData"),

      reset: () =>
        set(
          {
            establishment: null,
            selectedDate: null,
            selectedTime: null,
            bookingData: null,
          },
          false,
          "reset",
        ),
    }),
    {
      name: "booking-store",
    },
  ),
);
