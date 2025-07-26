"use client";

import { useMutation, useQueryClient, QueryClient } from "@tanstack/react-query";
import { Globe, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DomainService } from "@/lib/services/domain-service";
import { Tables } from "@/lib/supabase/database.types";

type CustomDomain = Tables<"custom_domains">;

interface DomainsTableProps {
  domains: CustomDomain[] | undefined;
  isLoading: boolean;
  error: unknown;
}

function useDomainMutations(queryClient: QueryClient) {
  const deactivateDomainMutation = useMutation({
    mutationFn: (domainId: string) => new DomainService().deactivateDomain(domainId),
    onSuccess: () => {
      toast.success("Domaine désactivé avec succès");
      queryClient.invalidateQueries({ queryKey: ["all-custom-domains"] });
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
      queryClient.invalidateQueries({ queryKey: ["all-custom-domains"] });
    },
    onError: (error) => {
      toast.error("Erreur lors de la suppression du domaine");
      console.error("Erreur de suppression:", error);
    },
  });

  return { deactivateDomainMutation, deleteDomainMutation };
}

export function DomainsTable({ domains, isLoading, error }: DomainsTableProps) {
  const queryClient = useQueryClient();
  const { deactivateDomainMutation, deleteDomainMutation } = useDomainMutations(queryClient);

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
        <CardTitle>Liste des Domaines</CardTitle>
        <CardDescription>Tous les domaines personnalisés configurés</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
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
            <p className="text-muted-foreground">Commencez par ajouter un domaine personnalisé.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {domains?.map((domain) => (
              <div key={domain.id} className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <h3 className="font-semibold">{domain.domain}</h3>
                  <p className="text-muted-foreground text-sm">Établissement: {domain.establishment_slug}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={domain.is_active ? "default" : "secondary"}>
                    {domain.is_active ? "Actif" : "Inactif"}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeactivateDomain(domain.id)}
                    disabled={deactivateDomainMutation.isPending || !domain.is_active}
                  >
                    {deactivateDomainMutation.isPending ? "Désactivation..." : "Désactiver"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteDomain(domain.id)}
                    disabled={deleteDomainMutation.isPending}
                    className="text-red-500 hover:text-red-600"
                  >
                    {deleteDomainMutation.isPending ? "Suppression..." : "Supprimer"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
