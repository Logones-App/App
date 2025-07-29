"use client";

import React, { useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, Clock, AlertTriangle, Plus, Edit, Trash2, ArrowLeft, Filter, Search, CalendarX } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/supabase/database.types";
import { useBookingExceptionsRealtime } from "@/hooks/use-booking-exceptions-crud";

type BookingException = Tables<"booking_exceptions">;

interface BookingExceptionsSharedProps {
  organizationId: string;
  establishmentId?: string; // Optionnel pour System Admin
}

export function BookingExceptionsShared({ organizationId, establishmentId }: BookingExceptionsSharedProps) {
  const pathname = usePathname();
  const isSystemAdmin = pathname.includes("/admin/");

  // États locaux
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Hook realtime
  const {
    exceptions,
    loading: isLoading,
    error,
    create,
    update,
    delete: deleteException,
  } = useBookingExceptionsRealtime({
    establishmentId: establishmentId || "",
    organizationId,
  });

  // Récupérer les établissements de l'organisation
  const { data: establishments = [] } = useQuery({
    queryKey: ["establishments", organizationId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("establishments")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("deleted", false);

      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  // Filtrer les exceptions
  const filteredExceptions = exceptions.filter((exception) => {
    const matchesSearch =
      exception.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exception.exception_type?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === "all" || exception.exception_type === selectedType;
    return matchesSearch && matchesType;
  });

  // Fonction pour obtenir le nom de l'établissement
  const getEstablishmentName = (establishmentId: string) => {
    const establishment = establishments.find((est) => est.id === establishmentId);
    return establishment?.name || "Établissement inconnu";
  };

  // Fonction pour formater la date
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: fr });
    } catch {
      return dateString;
    }
  };

  // Fonction pour obtenir le badge de type
  const getTypeBadge = (type: string) => {
    const variants = {
      period: "default",
      single_day: "secondary",
      service: "outline",
      time_slots: "destructive",
    } as const;

    const labels = {
      period: "Période",
      single_day: "Jour unique",
      service: "Service",
      time_slots: "Créneaux",
    };

    return (
      <Badge variant={variants[type as keyof typeof variants] || "outline"}>
        {labels[type as keyof typeof labels] || type}
      </Badge>
    );
  };

  // Fonction pour obtenir le statut
  const getStatusBadge = (status: string) => {
    const variants = {
      active: "default",
      inactive: "secondary",
      pending: "outline",
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || "outline"}>
        {status === "active" ? "Actif" : status === "inactive" ? "Inactif" : "En attente"}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" disabled>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold">
              <CalendarX className="h-6 w-6" />
              Exceptions de réservation
            </h2>
            <p className="text-muted-foreground">Chargement des exceptions...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Erreur
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>Une erreur est survenue lors du chargement des exceptions.</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <CalendarX className="h-6 w-6" />
            Exceptions de réservation
          </h2>
          <p className="text-muted-foreground">Gérez les exceptions pour vos établissements</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle exception
        </Button>
      </div>

      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Rechercher une exception..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="rounded-md border px-3 py-2"
            >
              <option value="all">Tous les types</option>
              <option value="period">Période</option>
              <option value="single_day">Jour unique</option>
              <option value="service">Service</option>
              <option value="time_slots">Créneaux</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Tableau des exceptions */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des exceptions</CardTitle>
          <CardDescription>
            {filteredExceptions.length} exception{filteredExceptions.length > 1 ? "s" : ""} trouvée
            {filteredExceptions.length > 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredExceptions.length === 0 ? (
            <div className="py-8 text-center">
              <CalendarX className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
              <p className="text-muted-foreground">Aucune exception trouvée</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Établissement</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExceptions.map((exception) => (
                  <TableRow key={exception.id}>
                    <TableCell>{getTypeBadge(exception.exception_type || "")}</TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate">{exception.reason || "Aucune description"}</div>
                    </TableCell>
                    <TableCell>{getEstablishmentName(exception.establishment_id)}</TableCell>
                    <TableCell>
                      {exception.date
                        ? formatDate(exception.date)
                        : exception.start_date && exception.end_date
                          ? `${formatDate(exception.start_date)} - ${formatDate(exception.end_date)}`
                          : "N/A"}
                    </TableCell>
                    <TableCell>{getStatusBadge(exception.status || "active")}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => deleteException(exception.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Formulaire de création (à implémenter) */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Nouvelle exception</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Formulaire de création à implémenter...</p>
            <div className="mt-4 flex gap-2">
              <Button onClick={() => setShowCreateForm(false)}>Annuler</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
