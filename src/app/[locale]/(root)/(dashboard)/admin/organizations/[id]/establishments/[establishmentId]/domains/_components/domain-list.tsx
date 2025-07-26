"use client";

import { useMutation, useQueryClient, QueryClient } from "@tanstack/react-query";
import { Globe, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DomainService } from "@/lib/services/domain-service";
import { Tables } from "@/lib/supabase/database.types";

import { DomainItem } from "./domain-item";

type CustomDomain = Tables<"custom_domains">;

interface DomainListProps {
  domains: CustomDomain[] | undefined;
  isLoading: boolean;
  error: unknown;
  establishmentId: string;
}

function useDomainMutations(queryClient: QueryClient, establishmentId: string) {
  const deactivateDomainMutation = useMutation({
    mutationFn: (domainId: string) => new DomainService().deactivateDomain(domainId),
    onSuccess: () => {
      toast.success("Domaine désactivé avec succès");
      queryClient.invalidateQueries({ queryKey: ["custom-domains", establishmentId] });
    },
    onError: (error) => {
      toast.error("Erreur lors de la désactivation du domaine");
      console.error("Erreur de désactivation:", error);
    },
  });

  const deleteDomainMutation = useMutation({
    mutationFn: (domainId: string) => new DomainService().deleteDomain(domainId),
    onSuccess: () => {
      toast.success("Domaine supprimé définitivement");
      queryClient.invalidateQueries({ queryKey: ["custom-domains", establishmentId] });
    },
    onError: (error) => {
      toast.error("Erreur lors de la suppression du domaine");
      console.error("Erreur de suppression:", error);
    },
  });

  return { deactivateDomainMutation, deleteDomainMutation };
}

export function DomainList({ domains, isLoading, error, establishmentId }: DomainListProps) {
  const queryClient = useQueryClient();
  const { deactivateDomainMutation, deleteDomainMutation } = useDomainMutations(queryClient, establishmentId);

  const handleDeactivateDomain = (domainId: string) => {
    if (confirm("Êtes-vous sûr de vouloir désactiver ce domaine ?")) {
      deactivateDomainMutation.mutate(domainId);
    }
  };

  const handleDeleteDomain = (domainId: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer définitivement ce domaine ? Cette action est irréversible.")) {
      deleteDomainMutation.mutate(domainId);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Domaines configurés
        </CardTitle>
        <CardDescription>Liste des domaines personnalisés pour cet établissement</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Erreur lors du chargement des domaines. Veuillez réessayer.</AlertDescription>
          </Alert>
        ) : domains?.length === 0 ? (
          <div className="py-8 text-center">
            <Globe className="text-muted-foreground mx-auto h-12 w-12" />
            <h3 className="mt-4 text-lg font-semibold">Aucun domaine configuré</h3>
            <p className="text-muted-foreground">Ajoutez un domaine personnalisé pour cet établissement.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {domains?.map((domain) => (
              <DomainItem
                key={domain.id}
                domain={domain}
                onDeactivate={() => handleDeactivateDomain(domain.id)}
                onDelete={() => handleDeleteDomain(domain.id)}
                isDeactivating={deactivateDomainMutation.isPending}
                isDeleting={deleteDomainMutation.isPending}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
