export interface BookingSlot {
  id: string;
  day_of_week: number;
  slot_name: string;
  start_time: string;
  end_time: string;
  max_capacity: number | null;
  is_active: boolean | null;
  deleted: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  valid_from: string | null;
  valid_until: string | null;
  establishment_id: string;
}

export const DAYS_OF_WEEK = [
  { value: 0, label: "Dimanche" },
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
] as const;

export type SlotEditForm = {
  slot_name: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  is_active: boolean;
};

export type SlotAddForm = {
  day_of_week: number;
  slot_name: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  is_active: boolean;
};
