import type { BookingEmailData } from "./email-service";

/**
 * Générer le texte pour la confirmation de réservation
 */
export function generateBookingConfirmationText(data: BookingEmailData): string {
  return `
Confirmation de réservation - ${data.establishment.name}

Bonjour ${data.customerName},

Votre réservation a été confirmée avec succès !

Détails de votre réservation :
- Établissement : ${data.establishment.name}
- Date : ${data.reservationDate}
- Heure : ${data.reservationTime}
- Nombre de personnes : ${data.numberOfGuests}
${data.specialRequests ? `- Demandes spéciales : ${data.specialRequests}` : ""}

Numéro de réservation : ${data.booking.id}

Nous vous attendons avec impatience !

${data.establishment.address ? `Adresse : ${data.establishment.address}` : ""}
${data.establishment.phone ? `Téléphone : ${data.establishment.phone}` : ""}

Merci de votre confiance,
${data.establishment.name}
  `;
}

/**
 * Générer le texte pour la notification à l'établissement
 */
export function generateEstablishmentNotificationText(data: BookingEmailData): string {
  return `
Nouvelle réservation

Une nouvelle réservation a été effectuée :

Détails de la réservation :
- Client : ${data.customerName}
- Email : ${data.customerEmail}
- Date : ${data.reservationDate}
- Heure : ${data.reservationTime}
- Nombre de personnes : ${data.numberOfGuests}
${data.specialRequests ? `- Demandes spéciales : ${data.specialRequests}` : ""}

Numéro de réservation : ${data.booking.id}

Cette notification a été envoyée automatiquement.
  `;
}

/**
 * Générer le texte pour le rappel de réservation
 */
export function generateBookingReminderText(data: BookingEmailData): string {
  return `
Rappel de réservation - ${data.establishment.name}

Bonjour ${data.customerName},

Ceci est un rappel pour votre réservation de demain :

Détails de votre réservation :
- Établissement : ${data.establishment.name}
- Date : ${data.reservationDate}
- Heure : ${data.reservationTime}
- Nombre de personnes : ${data.numberOfGuests}
${data.specialRequests ? `- Demandes spéciales : ${data.specialRequests}` : ""}

Numéro de réservation : ${data.booking.id}

Nous vous attendons demain !

${data.establishment.address ? `Adresse : ${data.establishment.address}` : ""}
${data.establishment.phone ? `Téléphone : ${data.establishment.phone}` : ""}

Merci de votre confiance,
${data.establishment.name}
  `;
}
