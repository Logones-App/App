"use client";

import React, { useState, useEffect } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useCreateBookingException,
  useUpdateBookingException,
  useDeleteBookingException,
} from "@/hooks/use-booking-exceptions-crud";
import { useBookingExceptionsRealtime } from "@/hooks/use-booking-exceptions-realtime";
import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/supabase/database.types";

type BookingException = Tables<"booking_exceptions">;

function loadTestData(
  setEstablishmentId: (id: string) => void,
  setOrganizationId: (id: string) => void,
  setIsLoadingData: (loading: boolean) => void,
) {
  const supabase = createClient();

  async function load() {
    setIsLoadingData(true);
    try {
      const { data: establishments, error } = await supabase
        .from("establishments")
        .select("id, organization_id")
        .eq("deleted", false)
        .limit(1);

      if (error) {
        console.error("Erreur lors du chargement des établissements:", error);
        return;
      }

      if (establishments && establishments.length > 0) {
        setEstablishmentId(establishments[0].id);
        setOrganizationId(establishments[0].organization_id);
        console.log("✅ Données de test chargées:", {
          establishmentId: establishments[0].id,
          organizationId: establishments[0].organization_id,
        });
      } else {
        console.warn("⚠️ Aucun établissement trouvé pour le test");
      }
    } catch (error) {
      console.error("Erreur lors du chargement des données de test:", error);
    } finally {
      setIsLoadingData(false);
    }
  }

  return load;
}

function BookingExceptionsTestContent({
  establishmentId,
  setEstablishmentId,
  organizationId,
  setOrganizationId,
  testException,
  setTestException,
  exceptions,
  isLoading,
  error,
  refresh,
  createTestException,
  updateTestException,
  deleteTestException,
}: {
  establishmentId: string;
  setEstablishmentId: (id: string) => void;
  organizationId: string;
  setOrganizationId: (id: string) => void;
  testException: BookingException | null;
  setTestException: (e: BookingException | null) => void;
  exceptions: BookingException[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
  createTestException: () => void;
  updateTestException: () => void;
  deleteTestException: () => void;
}) {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Test Booking Exceptions Realtime</h1>
        <p className="text-muted-foreground">
          Page de test pour vérifier le fonctionnement du Realtime booking_exceptions
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>Paramètres de test</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Establishment ID:</label>
              <input
                type="text"
                value={establishmentId}
                onChange={(e) => setEstablishmentId(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2"
                placeholder="ID de l'établissement"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Organization ID:</label>
              <input
                type="text"
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2"
                placeholder="ID de l'organisation"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions de Test</CardTitle>
            <CardDescription>Actions pour tester le Realtime</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={createTestException} disabled={!establishmentId || !organizationId}>
                Créer Exception Test
              </Button>
              <Button onClick={updateTestException} disabled={!testException} variant="outline">
                Modifier Exception
              </Button>
              <Button onClick={deleteTestException} disabled={!testException} variant="destructive">
                Supprimer Exception
              </Button>
            </div>
            <Button onClick={refresh} variant="secondary" className="w-full">
              Rafraîchir Manuellement
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>État du Realtime</CardTitle>
          <CardDescription>Informations sur la connexion et les événements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium">Statut:</h4>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant={isLoading ? "secondary" : error ? "destructive" : "default"}>
                  {isLoading ? "Chargement..." : error ? "Erreur" : "Actif"}
                </Badge>
                {error && <span className="text-sm text-red-600">{error.message}</span>}
              </div>
            </div>

            <div>
              <h4 className="font-medium">Exceptions ({exceptions.length}):</h4>
              <div className="mt-2 space-y-2">
                {exceptions.map((exception) => (
                  <div key={exception.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{exception.reason ?? "Sans raison"}</p>
                        <p className="text-muted-foreground text-sm">
                          Type: {exception.exception_type} | Date: {exception.date}
                        </p>
                      </div>
                      <Badge variant={exception.status === "active" ? "default" : "secondary"}>
                        {exception.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {exceptions.length === 0 && <p className="text-muted-foreground text-sm">Aucune exception trouvée</p>}
              </div>
            </div>

            {testException && (
              <div>
                <h4 className="font-medium">Exception de Test:</h4>
                <div className="mt-2 rounded-md border border-blue-200 bg-blue-50 p-3">
                  <p className="font-medium">{testException.reason}</p>
                  <p className="text-muted-foreground text-sm">ID: {testException.id}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Logs Realtime</CardTitle>
          <CardDescription>Événements Realtime en temps réel</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 overflow-y-auto rounded-md bg-gray-100 p-4">
            <p className="text-muted-foreground text-sm">
              Les logs Realtime apparaîtront ici dans la console du navigateur.
            </p>
            <p className="text-muted-foreground mt-2 text-sm">
              Ouvrez la console (F12) pour voir les événements en temps réel.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function BookingExceptionsTestPage() {
  const [establishmentId, setEstablishmentId] = useState<string>("");
  const [organizationId, setOrganizationId] = useState<string>("");
  const [testException, setTestException] = useState<BookingException | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const { exceptions, isLoading, error, refresh } = useBookingExceptionsRealtime({
    establishmentId: establishmentId || undefined,
    organizationId: organizationId || undefined,
  });

  // Mutations TanStack Query
  const createExceptionMutation = useCreateBookingException();
  const updateExceptionMutation = useUpdateBookingException();
  const deleteExceptionMutation = useDeleteBookingException();

  useEffect(() => {
    const loadData = loadTestData(setEstablishmentId, setOrganizationId, setIsLoadingData);
    loadData();
  }, []);

  const createTestException = async () => {
    if (!establishmentId || !organizationId) {
      console.error("❌ IDs manquants pour créer l'exception de test");
      return;
    }

    try {
      const newException = await createExceptionMutation.mutateAsync({
        establishment_id: establishmentId,
        organization_id: organizationId,
        exception_type: "single_day",
        date: new Date().toISOString().split("T")[0],
        reason: "Test exception - " + new Date().toLocaleTimeString(),
      });

      if (newException) {
        setTestException(newException);
      }
    } catch (error) {
      console.error("❌ Erreur lors de la création de l'exception:", error);
    }
  };

  const updateTestException = async () => {
    if (!testException) return;

    try {
      const updatedException = await updateExceptionMutation.mutateAsync({
        id: testException.id,
        reason: "Exception modifiée - " + new Date().toLocaleTimeString(),
      });

      if (updatedException) {
        setTestException(updatedException);
      }
    } catch (error) {
      console.error("❌ Erreur lors de la modification de l'exception:", error);
    }
  };

  const deleteTestException = async () => {
    if (!testException) return;

    try {
      await deleteExceptionMutation.mutateAsync(testException.id);
      setTestException(null);
    } catch (error) {
      console.error("❌ Erreur lors de la suppression de l'exception:", error);
    }
  };

  if (isLoadingData) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold">Chargement des données de test...</h2>
            <p className="text-muted-foreground">Récupération des établissements disponibles</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <BookingExceptionsTestContent
      establishmentId={establishmentId}
      setEstablishmentId={setEstablishmentId}
      organizationId={organizationId}
      setOrganizationId={setOrganizationId}
      testException={testException}
      setTestException={setTestException}
      exceptions={exceptions}
      isLoading={isLoading}
      error={error}
      refresh={refresh}
      createTestException={createTestException}
      updateTestException={updateTestException}
      deleteTestException={deleteTestException}
    />
  );
}
