"use client";

import { useEffect, useState, useRef } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { columns } from "./columns";
import { useOrganizationsRealtime } from "@/hooks/use-organizations-realtime";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { Button } from "@/components/ui/button";
import { RefreshCw, TestTube } from "lucide-react";

// Utiliser le type généré par Supabase
type Organization = Database["public"]["Tables"]["organizations"]["Row"];

// Query pour récupérer toutes les organisations (pour system_admin)
const useAllOrganizations = () => {
  return useQuery({
    queryKey: ["all-organizations"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("deleted", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    // Désactiver le polling automatique pour éviter les conflits avec le realtime
    refetchInterval: false,
    // Garder les données en cache plus longtemps
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export function OrganizationsDataTable() {
  const { data: organizations = [], isLoading, error } = useAllOrganizations();
  const { subscribeToOrganizations, unsubscribe, sendOrganizationNotification } = useOrganizationsRealtime();
  const queryClient = useQueryClient();
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  // Protection contre les événements dupliqués
  const lastEventRef = useRef<{ type: string; organizationId: string; timestamp: number } | null>(null);
  const isUpdatingRef = useRef(false);

  // Utiliser le hook pour créer l'instance de table
  const table = useDataTableInstance({
    data: organizations,
    columns,
  });

  useEffect(() => {
    console.log("🔄 Initialisation du realtime...");

    // S'abonner aux changements des organisations
    const subscriptionId = subscribeToOrganizations((event) => {
      console.log("🎉 Événement organisation reçu:", event);
      setIsRealtimeConnected(true);

      // Protection contre les événements dupliqués (dans les 2 secondes)
      const now = Date.now();
      const lastEvent = lastEventRef.current;
      if (
        lastEvent &&
        lastEvent.type === event.type &&
        lastEvent.organizationId === event.organizationId &&
        now - lastEvent.timestamp < 2000
      ) {
        console.log("🚫 Événement dupliqué ignoré:", event);
        return;
      }

      lastEventRef.current = {
        type: event.type,
        organizationId: event.organizationId,
        timestamp: now,
      };

      // Protection contre les mises à jour simultanées
      if (isUpdatingRef.current) {
        console.log("🚫 Mise à jour en cours, événement ignoré:", event);
        return;
      }

      isUpdatingRef.current = true;

      try {
        switch (event.type) {
          case "organization_created":
            console.log("➕ Nouvelle organisation créée");
            toast.success("Nouvelle organisation créée");
            // Invalider seulement si nécessaire
            queryClient.invalidateQueries({ queryKey: ["all-organizations"] });
            break;

          case "organization_updated":
            console.log("✏️ Organisation mise à jour:", event.organizationId);
            toast.success("Organisation mise à jour");

            // Mise à jour optimiste seulement si on a les données
            if (event.data) {
              console.log("📝 Mise à jour optimiste avec:", event.data);
              queryClient.setQueryData(["all-organizations"], (oldData: Organization[] | undefined) => {
                if (!oldData) return oldData;
                const updatedData = oldData.map((org) =>
                  org.id === event.organizationId ? { ...org, ...event.data } : org,
                );
                console.log("🔄 Données mises à jour:", updatedData);
                return updatedData;
              });
            } else {
              // Si pas de données, invalider pour recharger
              queryClient.invalidateQueries({ queryKey: ["all-organizations"] });
            }
            break;

          case "organization_deleted":
            console.log("🗑️ Organisation supprimée:", event.organizationId);
            toast.success("Organisation supprimée");

            // Mise à jour optimiste
            queryClient.setQueryData(["all-organizations"], (oldData: Organization[] | undefined) => {
              if (!oldData) return oldData;
              const filteredData = oldData.filter((org) => org.id !== event.organizationId);
              console.log("🔄 Données filtrées:", filteredData);
              return filteredData;
            });
            break;

          case "user_added":
            console.log("👤 Utilisateur ajouté à l'organisation");
            toast.info("Utilisateur ajouté à l'organisation");
            // Pas besoin d'invalider pour les utilisateurs
            break;

          case "user_removed":
            console.log("👤 Utilisateur retiré de l'organisation");
            toast.info("Utilisateur retiré de l'organisation");
            // Pas besoin d'invalider pour les utilisateurs
            break;
        }
      } finally {
        // Libérer le verrou après un délai
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 1000);
      }
    });

    console.log("✅ Abonnement realtime configuré:", subscriptionId);

    return () => {
      console.log("🔌 Désabonnement realtime...");
      // Se désabonner à la destruction du composant
      unsubscribe();
    };
  }, [subscribeToOrganizations, unsubscribe, queryClient]);

  // Debug: Afficher les données actuelles
  useEffect(() => {
    console.log("📊 Organisations actuelles:", organizations);
  }, [organizations]);

  // Fonction de test du realtime
  const testRealtime = async () => {
    if (organizations.length > 0) {
      const firstOrg = organizations[0];
      await sendOrganizationNotification("Test Realtime", `Test de notification pour ${firstOrg.name}`, firstOrg.id, {
        test: true,
        timestamp: new Date().toISOString(),
      });
      toast.success("Notification de test envoyée !");
    } else {
      toast.error("Aucune organisation disponible pour le test");
    }
  };

  // Fonction de test de connexion Supabase
  const testSupabaseConnection = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("organizations").select("count").limit(1);

      if (error) {
        console.error("❌ Erreur de connexion Supabase:", error);
        toast.error("Erreur de connexion Supabase");
      } else {
        console.log("✅ Connexion Supabase OK:", data);
        toast.success("Connexion Supabase OK");
      }
    } catch (error) {
      console.error("❌ Erreur de test Supabase:", error);
      toast.error("Erreur de test Supabase");
    }
  };

  // Fonction de rafraîchissement manuel
  const handleManualRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["all-organizations"] });
    toast.success("Données rafraîchies manuellement");
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Liste des organisations</h2>
          <div className="text-muted-foreground text-sm">Chargement...</div>
        </div>
        <div className="flex h-96 items-center justify-center">
          <div className="text-muted-foreground">Chargement des organisations...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Liste des organisations</h2>
        </div>
        <div className="flex h-96 items-center justify-center">
          <div className="text-destructive">Erreur lors du chargement des organisations</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Liste des organisations</h2>
          <div className="mt-1 flex items-center gap-2">
            <div className="text-muted-foreground text-sm">
              {organizations.length} organisation{organizations.length > 1 ? "s" : ""}
            </div>
            <div
              className={`h-2 w-2 rounded-full ${isRealtimeConnected ? "bg-green-500" : "bg-gray-400"}`}
              title={isRealtimeConnected ? "Realtime connecté" : "Realtime déconnecté"}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={testSupabaseConnection}>
            <TestTube className="mr-2 h-4 w-4" />
            Test Supabase
          </Button>
          <Button variant="outline" size="sm" onClick={testRealtime} disabled={organizations.length === 0}>
            <TestTube className="mr-2 h-4 w-4" />
            Test Realtime
          </Button>
          <Button variant="outline" size="sm" onClick={handleManualRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Rafraîchir
          </Button>
        </div>
      </div>

      <DataTable table={table} columns={columns} />
    </div>
  );
}
