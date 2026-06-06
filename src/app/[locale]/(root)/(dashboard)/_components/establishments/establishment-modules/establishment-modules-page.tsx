"use client";

import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  useEstablishmentModules,
  useToggleEstablishmentModule,
  useUpdateEstablishmentModuleSeats,
} from "@/lib/queries/establishment-modules-queries";

import { BackToEstablishmentButton } from "../back-to-establishment-button";

const MODULE_DEFINITIONS: Record<string, { label: string; description: string }> = {
  pos: { label: "Caisse (POS)", description: "Gestion des commandes et encaissements" },
  kds: { label: "Écran cuisine (KDS)", description: "Affichage des commandes en cuisine" },
  haccp: { label: "HACCP", description: "Traçabilité et sécurité alimentaire" },
  hr: { label: "RH & Planning", description: "Gestion des ressources humaines" },
  booking: { label: "Réservations", description: "Gestion des réservations clients" },
};

interface EstablishmentModulesPageProps {
  establishmentId: string;
  organizationId: string;
}

export function EstablishmentModulesPage({ establishmentId, organizationId }: EstablishmentModulesPageProps) {
  const { data: modules = [], isLoading } = useEstablishmentModules(establishmentId, organizationId);
  const toggleModule = useToggleEstablishmentModule(establishmentId, organizationId);
  const updateSeats = useUpdateEstablishmentModuleSeats(establishmentId, organizationId);

  const moduleMap = new Map(modules.map((m) => [m.module, m]));
  const isPending = toggleModule.isPending || updateSeats.isPending;

  const handleToggle = (module: string, enabled: boolean) => {
    toggleModule.mutate({ module, enabled }, { onError: () => toast.error("Erreur lors de la mise à jour du module") });
  };

  const handleSeats = (module: string, value: string) => {
    const seats = parseInt(value, 10);
    if (isNaN(seats) || seats < 1) return;
    updateSeats.mutate({ module, seats }, { onError: () => toast.error("Erreur lors de la mise à jour des sièges") });
  };

  if (isLoading) {
    return <div className="text-muted-foreground py-8 text-center">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <BackToEstablishmentButton establishmentId={establishmentId} organizationId={organizationId} />
        <h1 className="text-2xl font-bold">Modules de l&apos;établissement</h1>
        <p className="text-muted-foreground text-sm">
          Activez les modules disponibles et configurez le nombre de postes autorisés.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {Object.entries(MODULE_DEFINITIONS).map(([moduleId, def]) => {
          const row = moduleMap.get(moduleId);
          const isEnabled = row?.enabled ?? false;
          const seats = row?.seats ?? 1;

          return (
            <Card key={moduleId} className={!isEnabled ? "opacity-60" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base">{def.label}</CardTitle>
                    <CardDescription className="text-xs">{def.description}</CardDescription>
                  </div>
                  <Switch checked={isEnabled} onCheckedChange={(v) => handleToggle(moduleId, v)} disabled={isPending} />
                </div>
              </CardHeader>
              {isEnabled && (
                <CardContent className="pt-0">
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground text-sm">Postes</span>
                    <Input
                      type="number"
                      min={1}
                      defaultValue={seats}
                      className="h-7 w-20 text-sm"
                      onBlur={(e) => handleSeats(moduleId, e.target.value)}
                      disabled={isPending}
                    />
                    <Badge variant="secondary" className="text-xs">
                      {seats} poste{seats > 1 ? "s" : ""}
                    </Badge>
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
