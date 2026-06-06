"use client";

import { toast } from "sonner";

import {
  useAllEstablishmentModulesByOrg,
  useUpsertEstablishmentModule,
} from "@/lib/queries/establishment-modules-queries";
import { useOrganizationEstablishments } from "@/lib/queries/establishments-queries";
import { useOrganizationModules, useUpsertOrganizationModule } from "@/lib/queries/organization-modules-queries";

import { ModuleAttributionCard } from "./module-attribution-card";

const MODULE_DEFINITIONS: { id: string; label: string; description: string }[] = [
  { id: "pos", label: "Caisse (POS)", description: "Gestion des commandes et encaissements" },
  { id: "kds", label: "Écran cuisine (KDS)", description: "Affichage des commandes en cuisine" },
  { id: "haccp", label: "HACCP", description: "Traçabilité et sécurité alimentaire" },
  { id: "hr", label: "RH & Planning", description: "Gestion des ressources humaines" },
  { id: "booking", label: "Réservations", description: "Gestion des réservations clients" },
];

interface OrganizationModulesAdminPageProps {
  organizationId: string;
  organizationName?: string;
}

export function OrganizationModulesAdminPage({ organizationId, organizationName }: OrganizationModulesAdminPageProps) {
  const { data: orgModules = [], isLoading: loadingOrg } = useOrganizationModules(organizationId);
  const { data: estModules = [], isLoading: loadingEst } = useAllEstablishmentModulesByOrg(organizationId);
  const { data: establishments = [], isLoading: loadingEsts } = useOrganizationEstablishments(organizationId);

  const upsertOrgModule = useUpsertOrganizationModule(organizationId);
  const upsertEstModule = useUpsertEstablishmentModule(organizationId);

  const isPending = upsertOrgModule.isPending || upsertEstModule.isPending;
  const isLoading = loadingOrg || loadingEst || loadingEsts;

  const handleOrgChange = (payload: Parameters<typeof upsertOrgModule.mutate>[0]) => {
    upsertOrgModule.mutate(payload, {
      onError: () => toast.error("Erreur lors de la mise à jour du module"),
    });
  };

  const handleEstChange = (payload: Parameters<typeof upsertEstModule.mutate>[0]) => {
    upsertEstModule.mutate(payload, {
      onError: () => toast.error("Erreur lors de la mise à jour de l'établissement"),
    });
  };

  if (isLoading) {
    return <div className="text-muted-foreground py-8 text-center">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Attribution des modules</h1>
        {organizationName && <p className="text-muted-foreground text-sm">Organisation : {organizationName}</p>}
      </div>

      <div className="space-y-3">
        {MODULE_DEFINITIONS.map((mod) => (
          <ModuleAttributionCard
            key={mod.id}
            moduleId={mod.id}
            moduleLabel={mod.label}
            moduleDescription={mod.description}
            orgModule={orgModules.find((m) => m.module === mod.id)}
            establishments={establishments}
            estModules={estModules}
            onOrgChange={handleOrgChange}
            onEstChange={handleEstChange}
            isPending={isPending}
          />
        ))}
      </div>
    </div>
  );
}
