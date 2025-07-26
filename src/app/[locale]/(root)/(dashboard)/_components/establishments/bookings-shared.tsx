"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/supabase/database.types";
import { useBookingsRealtime } from "@/hooks/use-bookings-realtime";

import { ArrowLeft, Calendar, Users, Search, MoreHorizontal, Eye, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// Utilisation du type généré par Supabase
type Booking = Tables<"bookings">;

// Hook pour récupérer les bookings
function useEstablishmentBookings(establishmentId: string, organizationId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["establishment-bookings", establishmentId, organizationId],
    queryFn: async (): Promise<Booking[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("organization_id", organizationId)
        .eq("deleted", false)
        .order("date", { ascending: true })
        .order("time", { ascending: true });

      if (error) {
        console.error("Erreur lors de la récupération des bookings:", error);
        throw new Error("Impossible de récupérer les réservations");
      }

      return data || [];
    },
    enabled: !!establishmentId && !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return query;
}

// Hook pour récupérer l'ID d'organisation d'un org_admin
function useOrgaUserOrganizationId(): string | null {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["orga-user-organization-id"],
    queryFn: async (): Promise<string | null> => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("users_organizations")
        .select("organization_id")
        .eq("user_id", user.id)
        .eq("role", "org_admin")
        .single();

      if (error) {
        console.error("Erreur lors de la récupération de l'organisation:", error);
        return null;
      }
      return data?.organization_id || null;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 30 minutes
  });
  return query.data || null;
}

const getStatusBadge = (status: string) => {
  const statusConfig = {
    confirmed: { label: "Confirmé", variant: "default" as const },
    pending: { label: "En attente", variant: "secondary" as const },
    cancelled: { label: "Annulé", variant: "destructive" as const },
    completed: { label: "Terminé", variant: "outline" as const },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

export function BookingsShared({
  establishmentId,
  organizationId,
}: {
  establishmentId: string;
  organizationId: string;
}) {
  const pathname = usePathname();
  const isSystemAdmin = pathname.includes("/admin/organizations/");
  const [searchTerm, setSearchTerm] = useState("");

  const backLink = isSystemAdmin
    ? `/admin/organizations/${organizationId}/establishments/${establishmentId}`
    : `/dashboard/establishments/${establishmentId}`;

  const { data: bookings = [], isLoading, error } = useEstablishmentBookings(establishmentId, organizationId);

  // Hook Realtime pour les bookings
  const { subscribeToEstablishmentBookings } = useBookingsRealtime();

  // Abonnement Realtime aux changements des bookings
  useEffect(() => {
    if (establishmentId && organizationId) {
      const unsubscribe = subscribeToEstablishmentBookings(establishmentId, organizationId);

      return () => {
        // Nettoyage de l'abonnement
        unsubscribe();
      };
    }
  }, [establishmentId, organizationId, subscribeToEstablishmentBookings]);

  // Filtrer les bookings par nom de client
  const filteredBookings = bookings.filter((booking: Booking) =>
    `${booking.customer_first_name} ${booking.customer_last_name}`.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={backLink}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à l'établissement
            </Button>
          </Link>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold">
              <Calendar className="h-6 w-6" />
              Réservations de l'établissement
            </h2>
            <p className="text-muted-foreground">Chargement des réservations...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={backLink}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à l'établissement
            </Button>
          </Link>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold">
              <Calendar className="h-6 w-6" />
              Réservations de l'établissement
            </h2>
            <p className="text-destructive">Erreur lors du chargement des réservations</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={backLink}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à l'établissement
          </Button>
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <Calendar className="h-6 w-6" />
            Réservations de l'établissement
          </h2>
          <p className="text-muted-foreground">
            {filteredBookings.length} réservation{filteredBookings.length > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
          <Input
            placeholder="Rechercher par nom de client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Heure</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Personnes</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBookings.length > 0 ? (
              filteredBookings.map((booking: Booking) => (
                <TableRow key={booking.id}>
                  <TableCell>{format(new Date(booking.date), "dd/MM/yyyy", { locale: fr })}</TableCell>
                  <TableCell>{booking.time}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {booking.customer_first_name} {booking.customer_last_name}
                      </span>
                      <span className="text-muted-foreground text-sm">{booking.customer_email}</span>
                    </div>
                  </TableCell>
                  <TableCell>{booking.customer_phone}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{booking.number_of_guests}</span>
                    </div>
                  </TableCell>
                  <TableCell>{booking.service_name}</TableCell>
                  <TableCell>{getStatusBadge(booking.status)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Ouvrir le menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          Voir les détails
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  Aucune réservation trouvée.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
