"use client";

import { useQuery } from "@tanstack/react-query";

import { useEstablishment } from "@/lib/queries/establishments";
import { DomainService } from "@/lib/services/domain-service";

import { DomainForm } from "./_components/domain-form";
import { DomainList } from "./_components/domain-list";
import { ErrorDisplay } from "./_components/error-display";
import { LoadingSkeleton } from "./_components/loading-skeleton";

function useEstablishmentDomainsQuery(establishmentId: string) {
  return useQuery({
    queryKey: ["custom-domains", establishmentId],
    queryFn: () => new DomainService().getCustomDomainsByEstablishment(establishmentId),
    enabled: !!establishmentId,
  });
}

export default function EstablishmentDomainsPage() {
  const establishmentId = "establishment-id"; // À récupérer depuis les params

  const {
    data: establishment,
    isLoading: isLoadingEstablishment,
    error: establishmentError,
  } = useEstablishment(establishmentId);
  const {
    data: domains,
    isLoading: isLoadingDomains,
    error: domainsError,
  } = useEstablishmentDomainsQuery(establishmentId);

  if (isLoadingEstablishment) {
    return <LoadingSkeleton />;
  }

  if (establishmentError || !establishment) {
    return <ErrorDisplay message="Erreur lors du chargement de l'établissement. Veuillez réessayer." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Domaines de {establishment.name}</h1>
          <p className="text-muted-foreground">Gérez les domaines personnalisés pour cet établissement</p>
        </div>
      </div>

      <DomainForm
        establishment={establishment}
        establishmentId={establishmentId}
        onDomainAdded={() => {
          // Le cache sera invalidé automatiquement par la mutation
        }}
      />

      <DomainList
        domains={domains}
        isLoading={isLoadingDomains}
        error={domainsError}
        establishmentId={establishmentId}
      />
    </div>
  );
}
