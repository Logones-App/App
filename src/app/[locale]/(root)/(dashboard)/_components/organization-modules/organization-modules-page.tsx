"use client";

import { CheckCircle2, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOrganizationModules } from "@/lib/queries/organization-modules-queries";

const MODULE_DEFINITIONS: Record<string, { label: string; description: string }> = {
  pos: { label: "Caisse (POS)", description: "Gestion des commandes et encaissements" },
  kds: { label: "Écran cuisine (KDS)", description: "Affichage des commandes en cuisine" },
  haccp: { label: "HACCP", description: "Traçabilité et sécurité alimentaire" },
  hr: { label: "RH & Planning", description: "Gestion des ressources humaines" },
  booking: { label: "Réservations", description: "Gestion des réservations clients" },
};

interface OrganizationModulesPageProps {
  organizationId: string;
}

export function OrganizationModulesPage({ organizationId }: OrganizationModulesPageProps) {
  const { data: modules = [], isLoading } = useOrganizationModules(organizationId);

  const moduleMap = new Map(modules.map((m) => [m.module, m]));

  if (isLoading) {
    return <div className="text-muted-foreground py-8 text-center">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Abonnement &amp; Modules</h1>
        <p className="text-muted-foreground text-sm">
          Modules souscrits pour votre organisation. Contactez l&apos;administrateur pour modifier votre abonnement.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(MODULE_DEFINITIONS).map(([moduleId, def]) => {
          const row = moduleMap.get(moduleId);
          const isEnabled = row?.enabled ?? false;

          return (
            <Card key={moduleId} className={!isEnabled ? "opacity-50" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{def.label}</CardTitle>
                    <CardDescription className="text-xs">{def.description}</CardDescription>
                  </div>
                  {isEnabled ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                  ) : (
                    <XCircle className="text-muted-foreground mt-0.5 h-5 w-5 shrink-0" />
                  )}
                </div>
              </CardHeader>
              {isEnabled && row && (
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2 text-xs">
                    {row.max_concurrent_devices !== null && (
                      <Badge variant="secondary">
                        {row.max_concurrent_devices} device{row.max_concurrent_devices > 1 ? "s" : ""} max
                      </Badge>
                    )}
                    {row.max_establishments !== null && (
                      <Badge variant="secondary">
                        {row.max_establishments} établissement{row.max_establishments > 1 ? "s" : ""} max
                      </Badge>
                    )}
                    {row.enabled_at && (
                      <span className="text-muted-foreground">
                        Actif depuis le {new Date(row.enabled_at).toLocaleDateString("fr-FR")}
                      </span>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
