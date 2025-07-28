"use client";

import React from "react";

import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, Clock, Users, User, Phone, Mail, MessageSquare } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useBookingsRealtime } from "@/hooks/use-bookings-realtime";
import { Tables } from "@/lib/supabase/database.types";

interface BookingsRealtimeDisplayProps {
  establishmentId?: string;
  organizationId?: string;
  date?: string;
  showHeader?: boolean;
  maxBookings?: number;
}

export function BookingsRealtimeDisplay({
  establishmentId,
  organizationId,
  date,
  showHeader = true,
  maxBookings = 10,
}: BookingsRealtimeDisplayProps) {
  const { bookings, isLoading, error } = useBookingsRealtime({
    establishmentId,
    organizationId,
    date,
    enabled: true,
  });

  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), "EEEE d MMMM yyyy", { locale: fr });
  };

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5); // Prendre HH:MM
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      confirmed: { variant: "default" as const, label: "Confirmée" },
      pending: { variant: "secondary" as const, label: "En attente" },
      cancelled: { variant: "destructive" as const, label: "Annulée" },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return <Badge variant={config?.variant ?? "outline"}>{config?.label ?? status}</Badge>;
  };

  const renderBookingInfo = (booking: Tables<"bookings">) => (
    <div className="text-muted-foreground grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
      <div className="flex items-center gap-2">
        <Calendar className="h-3 w-3" />
        <span>{formatDate(booking.date)}</span>
      </div>
      <div className="flex items-center gap-2">
        <Clock className="h-3 w-3" />
        <span>{formatTime(booking.time)}</span>
      </div>
      <div className="flex items-center gap-2">
        <Users className="h-3 w-3" />
        <span>
          {booking.number_of_guests} personne{booking.number_of_guests > 1 ? "s" : ""}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Mail className="h-3 w-3" />
        <span className="truncate">{booking.customer_email}</span>
      </div>
    </div>
  );

  const renderBookingCard = (booking: Tables<"bookings">) => (
    <div key={booking.id} className="hover:bg-muted/50 rounded-lg border p-4 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <User className="text-muted-foreground h-4 w-4" />
            <span className="font-medium">
              {booking.customer_first_name} {booking.customer_last_name}
            </span>
            {getStatusBadge(booking.status)}
          </div>

          {renderBookingInfo(booking)}

          {booking.customer_phone && (
            <div className="text-muted-foreground mt-2 flex items-center gap-2 text-sm">
              <Phone className="h-3 w-3" />
              <span>{booking.customer_phone}</span>
            </div>
          )}

          {booking.special_requests && (
            <div className="text-muted-foreground mt-2 flex items-start gap-2 text-sm">
              <MessageSquare className="mt-0.5 h-3 w-3" />
              <span className="italic">&ldquo;{booking.special_requests}&rdquo;</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderLoadingState = () => (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-center py-8">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2"></div>
          <span className="text-muted-foreground ml-2 text-sm">Chargement des réservations...</span>
        </div>
      </CardContent>
    </Card>
  );

  const renderErrorState = () => (
    <Card>
      <CardContent className="pt-6">
        <div className="py-8 text-center">
          <p className="text-destructive text-sm">Erreur: {error}</p>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) return renderLoadingState();
  if (error) return renderErrorState();

  const renderBookingsContent = () => {
    const displayedBookings = bookings.slice(0, maxBookings);
    const remainingCount = bookings.length - maxBookings;

    return (
      <Card>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Réservations en temps réel
            </CardTitle>
            <CardDescription>
              {bookings.length} réservation{bookings.length > 1 ? "s" : ""} trouvée{bookings.length > 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
        )}
        <CardContent>
          {displayedBookings.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">Aucune réservation pour le moment</p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayedBookings.map(renderBookingCard)}

              {remainingCount > 0 && (
                <div className="pt-4 text-center">
                  <p className="text-muted-foreground text-sm">
                    +{remainingCount} autre{remainingCount > 1 ? "s" : ""} réservation
                    {remainingCount > 1 ? "s" : ""}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return renderBookingsContent();
}
