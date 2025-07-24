// Export des modules realtime par domaine
export { organizationsRealtime, type OrganizationRealtimeEvent } from "./organizations-realtime";
export { usersRealtime, type UserRealtimeEvent } from "./users-realtime";
export { establishmentsRealtime, useEstablishmentsRealtime } from "./establishments-realtime";
export { productsRealtime, type ProductsRealtimeEvent, type ProductWithStock } from "./products-realtime";

// Export du service principal
export { realtimeService, type RealtimeMessage, type RealtimeSubscription } from "../../realtimeService";
