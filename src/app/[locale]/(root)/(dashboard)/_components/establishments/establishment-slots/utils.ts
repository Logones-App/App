// Constantes pour les jours de la semaine
export const DAYS_OF_WEEK = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
  { value: 0, label: "Dimanche" },
];

// Fonction pour vérifier les chevauchements de créneaux
export function checkOverlap(
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  excludeId: string | undefined,
  existingSlots: Array<{ id: string; day_of_week: number; start_time: string; end_time: string }>,
) {
  return existingSlots.some(
    (slot) =>
      slot.id !== excludeId &&
      slot.day_of_week === dayOfWeek &&
      ((startTime >= slot.start_time && startTime < slot.end_time) ||
        (endTime > slot.start_time && endTime <= slot.end_time) ||
        (startTime <= slot.start_time && endTime >= slot.end_time)),
  );
}
