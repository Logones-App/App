"use client";

import React, { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertTriangle, CalendarX, Filter, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBookingExceptionsRealtime } from "@/hooks/use-booking-exceptions-crud";
import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/supabase/database.types";

import { BookingExceptionsModal } from "../establishments/booking-exceptions/booking-exceptions-modal";

type BookingException = Tables<"booking_exceptions">;

interface BookingExceptionsSharedProps {
  organizationId: string;
  establishmentId?: string;
}

const TYPE_LABELS: Record<string, string> = {
  period: "Période",
  single_day: "Jour unique",
  service: "Service",
  time_slots: "Créneaux",
};

const TYPE_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  period: "default",
  single_day: "secondary",
  service: "outline",
  time_slots: "destructive",
};

function TypeBadge({ type }: { type: string }) {
  // eslint-disable-next-line security/detect-object-injection
  const variant = type in TYPE_VARIANTS ? TYPE_VARIANTS[type] : "outline";
  // eslint-disable-next-line security/detect-object-injection
  const label = type in TYPE_LABELS ? TYPE_LABELS[type] : type;
  return <Badge variant={variant}>{label}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={status === "active" ? "default" : "secondary"}>
      {status === "active" ? "Actif" : status === "inactive" ? "Inactif" : "En attente"}
    </Badge>
  );
}

function ExceptionDateLabel({ exception }: { exception: BookingException }) {
  const fmt = (d: string) => {
    try {
      return format(new Date(d), "dd/MM/yyyy", { locale: fr });
    } catch {
      return d;
    }
  };

  if (exception.date) return <span>{fmt(exception.date)}</span>;
  if (exception.start_date && exception.end_date) {
    return (
      <span>
        {fmt(exception.start_date)} → {fmt(exception.end_date)}
      </span>
    );
  }
  return <span className="text-muted-foreground">—</span>;
}

function ExceptionCard({
  exception,
  establishmentName,
  onDelete,
}: {
  exception: BookingException;
  establishmentName: string;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{exception.reason ?? "Aucune description"}</p>
          <p className="text-muted-foreground truncate text-xs">{establishmentName}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-red-500 hover:text-red-600"
          onClick={() => onDelete(exception.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <TypeBadge type={exception.exception_type} />
        <StatusBadge status={exception.status} />
        <span className="text-muted-foreground text-xs">
          <ExceptionDateLabel exception={exception} />
        </span>
      </div>
    </div>
  );
}

export function BookingExceptionsShared({ organizationId, establishmentId }: BookingExceptionsSharedProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);

  const {
    exceptions,
    loading: isLoading,
    error,
    create,
    delete: deleteException,
  } = useBookingExceptionsRealtime({
    establishmentId: establishmentId ?? "",
    organizationId,
  });

  const { data: establishments = [] } = useQuery({
    queryKey: ["establishments", organizationId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("establishments")
        .select("id, name")
        .eq("organization_id", organizationId)
        .eq("deleted", false);
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const getEstablishmentName = (id: string) => {
    const found = establishments.find((e) => e.id === id);
    return found ? found.name : "Établissement inconnu";
  };

  const filteredExceptions = exceptions.filter((ex) => {
    const q = searchTerm.toLowerCase();
    const reasonMatch = ex.reason ? ex.reason.toLowerCase().includes(q) : false;
    const typeMatch = ex.exception_type ? ex.exception_type.toLowerCase().includes(q) : false;
    const matchesSearch = reasonMatch || typeMatch;
    const matchesType = selectedType === "all" || ex.exception_type === selectedType;
    return matchesSearch && matchesType;
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="border-primary mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2" />
          <p className="text-muted-foreground">Chargement des exceptions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
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
    );
  }

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <CalendarX className="h-6 w-6" />
            Exceptions de réservation
          </h2>
          <p className="text-muted-foreground">Gérez les fermetures et exceptions de vos établissements</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle exception
        </Button>
      </div>

      {/* Layout 2 colonnes */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Colonne gauche — filtres + stats */}
        <div className="space-y-4 lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Filter className="h-4 w-4" />
                Filtres
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="all">Tous les types</option>
                <option value="period">Période</option>
                <option value="single_day">Jour unique</option>
                <option value="service">Service</option>
                <option value="time_slots">Créneaux</option>
              </select>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-medium">{exceptions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Actives</span>
                  <span className="font-medium">{exceptions.filter((e) => e.status === "active").length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Filtrées</span>
                  <span className="font-medium">{filteredExceptions.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Colonne droite — liste des exceptions */}
        <div className="lg:col-span-2">
          <Card className="flex h-full flex-col">
            <CardHeader className="pb-3">
              <CardTitle>Liste des exceptions</CardTitle>
              <CardDescription>
                {filteredExceptions.length} exception{filteredExceptions.length !== 1 ? "s" : ""} trouvée
                {filteredExceptions.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              {filteredExceptions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <CalendarX className="text-muted-foreground mb-3 h-10 w-10" />
                  <p className="text-muted-foreground text-sm">Aucune exception trouvée</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => setModalOpen(true)}>
                    <Plus className="mr-2 h-3.5 w-3.5" />
                    Créer une exception
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-[calc(100vh-18rem)] px-6 pb-4">
                  <div className="space-y-3 pt-1">
                    {filteredExceptions.map((exception) => (
                      <ExceptionCard
                        key={exception.id}
                        exception={exception}
                        establishmentName={getEstablishmentName(exception.establishment_id)}
                        onDelete={deleteException}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de création */}
      {establishmentId && (
        <BookingExceptionsModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onCreate={create}
          establishmentId={establishmentId}
          organizationId={organizationId}
        />
      )}
    </>
  );
}
