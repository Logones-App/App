// Export des modules realtime par domaine
export { useEstablishmentsRealtime as establishmentsRealtime } from "./establishments-realtime";
export { organizationsRealtime, type OrganizationRealtimeEvent } from "./organizations-realtime";
export { productsRealtime, type ProductsRealtimeEvent, type ProductWithStock } from "./products-realtime";
export { usersRealtime, type UserRealtimeEvent } from "./users-realtime";
export { bookingsRealtime, type BookingRealtimeEvent } from "./bookings-realtime";
export { bookingExceptionsRealtime, type BookingExceptionEvent } from "./booking-exceptions-realtime";

// Export du service principal
export { realtimeService, type RealtimeMessage, type RealtimeSubscription } from "../../realtime-service";
