"use client";

import { useParams } from "next/navigation";

import { useQuery } from "@tanstack/react-query";

import { useEstablishment } from "@/lib/queries/establishments";
import { DomainService } from "@/lib/services/domain-service";

import { DomainForm } from "./_components/domain-form";
import { DomainList } from "./_components/domain-list";
import { ErrorDisplay } from "./_components/error-display";
import { LoadingSkeleton } from "./_components/loading-skeleton";

export default function EstablishmentDomainsPage() {
  const params = useParams();
  const establishmentId = params.establishmentId as string;
  // const establishmentId = "eb64c088-a613-490f-ac52-c8770f1dc2a7"; // ID hardcodé pour test

  // ✅ CORRIGÉ - Utilisation du hook existant
  const {
    data: establishment,
    isLoading: isLoadingEstablishment,
    error: establishmentError,
  } = useEstablishment(establishmentId);

  // ✅ CORRIGÉ - Requête simplifiée pour les domaines
  const {
    data: domains,
    isLoading: isLoadingDomains,
    error: domainsError,
  } = useQuery({
    queryKey: ["custom-domains", establishmentId],
    queryFn: async () => {
      return new DomainService().getCustomDomainsByEstablishment(establishmentId);
    },
    enabled: !!establishmentId,
  });

  // États de chargement
  if (isLoadingEstablishment) {
    return <LoadingSkeleton />;
  }

  // États d'erreur
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
