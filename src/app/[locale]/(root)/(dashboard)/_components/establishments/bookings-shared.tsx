"use client";

import { useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowLeft,
  Ban,
  Calendar,
  Check,
  CheckCheck,
  Users,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Plus,
  Trash2,
  UserX,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBookingsRealtime } from "@/hooks/use-bookings-realtime";
import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/supabase/database.types";

import { BookingEditModal } from "./booking-edit-modal";

// Utilisation du type généré par Supabase
type Booking = Tables<"bookings">;

type StatusVariant = "default" | "secondary" | "destructive" | "outline";

// Valeurs alignées sur la contrainte CHECK bookings_status_check.
const STATUS_CONFIG: Record<string, { label: string; variant: StatusVariant; className?: string }> = {
  pending: { label: "En attente", variant: "secondary" },
  confirmed: { label: "Confirmé", variant: "default" },
  seated: { label: "Installé", variant: "outline", className: "border-emerald-400 text-emerald-600" },
  cancelled: { label: "Annulé", variant: "destructive" },
  no_show: { label: "No-show", variant: "outline", className: "border-orange-400 text-orange-600" },
};

const getStatusBadge = (status: string) => {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
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
  const [modal, setModal] = useState<{ booking: Booking | null; mode: "view" | "edit" | "create" } | null>(null);

  const backLink = isSystemAdmin
    ? `/admin/organizations/${organizationId}/establishments/${establishmentId}`
    : `/dashboard/establishments/${establishmentId}`;

  // Hook Realtime pour les bookings avec filtrage automatique
  const { bookings, isLoading, error } = useBookingsRealtime({
    establishmentId,
    organizationId,
    enabled: true,
  });

  // Filtrer les bookings par nom de client
  const filteredBookings = bookings.filter((booking: Booking) =>
    `${booking.customer_first_name} ${booking.customer_last_name}`.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Changement de statut (le hook Realtime rafraîchit automatiquement la liste).
  const handleStatusChange = async (bookingId: string, status: string) => {
    const supabase = createClient();
    const { error: updateError } = await supabase.from("bookings").update({ status }).eq("id", bookingId);
    if (updateError) toast.error("Erreur lors de la mise à jour du statut");
    else toast.success("Statut mis à jour");
  };

  // Suppression logique (soft-delete).
  const handleDelete = async (booking: Booking) => {
    if (!confirm(`Supprimer la réservation de ${booking.customer_first_name} ${booking.customer_last_name} ?`)) return;
    const supabase = createClient();
    const { error: delError } = await supabase.from("bookings").update({ deleted: true }).eq("id", booking.id);
    if (delError) toast.error("Erreur lors de la suppression");
    else toast.success("Réservation supprimée");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={backLink}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à l&apos;établissement
            </Button>
          </Link>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold">
              <Calendar className="h-6 w-6" />
              Réservations de l&apos;établissement
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
              Retour à l&apos;établissement
            </Button>
          </Link>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold">
              <Calendar className="h-6 w-6" />
              Réservations de l&apos;établissement
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
            Retour à l&apos;établissement
          </Button>
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <Calendar className="h-6 w-6" />
            Réservations de l&apos;établissement
          </h2>
          <p className="text-muted-foreground">
            {filteredBookings.length} réservation{filteredBookings.length > 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setModal({ booking: null, mode: "create" })}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter une réservation
        </Button>
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
                        <DropdownMenuItem onClick={() => setModal({ booking, mode: "view" })}>
                          <Eye className="mr-2 h-4 w-4" />
                          Voir les détails
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setModal({ booking, mode: "edit" })}>
                          <Edit className="mr-2 h-4 w-4" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Statut</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => void handleStatusChange(booking.id, "confirmed")}>
                          <Check className="mr-2 h-4 w-4" />
                          Confirmer
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => void handleStatusChange(booking.id, "seated")}>
                          <CheckCheck className="mr-2 h-4 w-4" />
                          Marquer présent (installé)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => void handleStatusChange(booking.id, "no_show")}>
                          <UserX className="mr-2 h-4 w-4" />
                          Marquer no-show
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => void handleStatusChange(booking.id, "cancelled")}>
                          <Ban className="mr-2 h-4 w-4" />
                          Annuler
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" onClick={() => void handleDelete(booking)}>
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

      <BookingEditModal
        open={!!modal}
        onOpenChange={(o) => {
          if (!o) setModal(null);
        }}
        booking={modal?.booking ?? null}
        mode={modal?.mode ?? "view"}
        establishmentId={establishmentId}
        organizationId={organizationId}
      />
    </div>
  );
}
