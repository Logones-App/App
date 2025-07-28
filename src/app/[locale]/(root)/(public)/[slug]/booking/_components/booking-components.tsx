import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, Clock, Users, MapPin, User, Mail, Phone, Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tables } from "@/lib/supabase/database.types";

type Establishment = Tables<"establishments">;

interface Booking {
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
}

// Composant pour le récapitulatif de la réservation
export function BookingSummary({
  establishment,
  selectedDate,
  selectedTime,
  numberOfGuests,
}: {
  establishment: Establishment;
  selectedDate: Date;
  selectedTime: string;
  numberOfGuests: number;
}) {
  const formatDate = (date: Date) => {
    return format(date, "EEEE d MMMM yyyy", { locale: fr });
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Check className="text-primary h-5 w-5" />
          Récapitulatif
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="text-muted-foreground h-4 w-4" />
            <span className="font-medium">{establishment.name}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="text-muted-foreground h-4 w-4" />
            <span>{formatDate(selectedDate)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="text-muted-foreground h-4 w-4" />
            <span>{selectedTime}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Users className="text-muted-foreground h-4 w-4" />
            <span>{numberOfGuests} personne(s)</span>
          </div>
        </div>

        <div className="border-t pt-4">
          <p className="text-muted-foreground text-sm">Votre réservation sera confirmée par email.</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Composant pour les détails de la réservation
export function BookingDetails({ booking, establishment }: { booking: Booking; establishment: Establishment }) {
  const formatDate = (dateString: string) => {
    const date = parseISO(dateString);
    return format(date, "EEEE d MMMM yyyy", { locale: fr });
  };

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="text-muted-foreground h-4 w-4" />
          <span className="font-medium">{establishment.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="text-muted-foreground h-4 w-4" />
          <span>{formatDate(booking.date)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="text-muted-foreground h-4 w-4" />
          <span>{booking.time}</span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="text-muted-foreground h-4 w-4" />
          <span>{booking.number_of_guests} personne(s)</span>
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <User className="text-muted-foreground h-4 w-4" />
          <span>
            {booking.customer_first_name} {booking.customer_last_name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Mail className="text-muted-foreground h-4 w-4" />
          <span>{booking.customer_email}</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="text-muted-foreground h-4 w-4" />
          <span>{booking.customer_phone}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Réf: {booking.id}
          </Badge>
        </div>
      </div>
    </div>
  );
}
