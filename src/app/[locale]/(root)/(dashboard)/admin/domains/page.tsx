"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DomainService } from "@/lib/services/domain-service";

import { DomainsTable } from "./_components/domains-table";
import { StatsCards } from "./_components/stats-cards";

function useDomainsQuery() {
  return useQuery({
    queryKey: ["all-custom-domains"],
    queryFn: () => new DomainService().getAllActiveCustomDomains(),
  });
}

export default function DomainsPage() {
  const { data: domains, isLoading: isLoadingDomains, error: domainsError } = useDomainsQuery();

  const handleAddDomain = () => {
    // TODO: Implémenter l'ajout de domaine
    console.log("Ajout de domaine...");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Domaines</h1>
          <p className="text-muted-foreground">Gérez les domaines personnalisés de vos établissements</p>
        </div>
        <Button onClick={handleAddDomain}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau domaine
        </Button>
      </div>

      <StatsCards domains={domains} isLoading={isLoadingDomains} />

      <DomainsTable domains={domains} isLoading={isLoadingDomains} error={domainsError} />
    </div>
  );
}
