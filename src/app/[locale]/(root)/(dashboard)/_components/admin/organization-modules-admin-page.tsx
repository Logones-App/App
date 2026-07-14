"use client";

import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  useAllEstablishmentModulesByOrg,
  useUpsertEstablishmentModule,
} from "@/lib/queries/establishment-modules-queries";
import { useOrganizationEstablishments } from "@/lib/queries/establishments-queries";
import { useOrganizationModules, useUpsertOrganizationModule } from "@/lib/queries/organization-modules-queries";

const MODULE_DEFINITIONS: { id: string; label: string }[] = [
  { id: "pos", label: "Caisse (POS)" },
  { id: "kds", label: "Écran cuisine (KDS)" },
  { id: "haccp", label: "HACCP" },
  { id: "hr", label: "RH & Planning" },
  { id: "booking", label: "Réservations" },
];

interface OrganizationModulesAdminPageProps {
  organizationId: string;
  organizationName?: string;
}

export function OrganizationModulesAdminPage({ organizationId, organizationName }: OrganizationModulesAdminPageProps) {
  const { data: orgModules = [], isLoading: loadingOrg } = useOrganizationModules(organizationId);
  const { data: estModules = [], isLoading: loadingEst } = useAllEstablishmentModulesByOrg(organizationId);
  const { data: establishments = [], isLoading: loadingEsts } = useOrganizationEstablishments(organizationId);

  const upsertOrg = useUpsertOrganizationModule(organizationId);
  const upsertEst = useUpsertEstablishmentModule(organizationId);
  const isPending = upsertOrg.isPending || upsertEst.isPending;

  const orgMod = (m: string) => orgModules.find((x) => x.module === m);
  const estMod = (est: string, m: string) => estModules.find((x) => x.establishment_id === est && x.module === m);
  const allocated = (m: string) =>
    estModules.filter((x) => x.module === m && x.enabled).reduce((s, x) => s + x.seats, 0);
  const poolOf = (m: string) => orgMod(m)?.seats ?? 0;

  const toggleOrg = (m: string, enabled: boolean) => {
    const om = orgMod(m);
    upsertOrg.mutate(
      {
        module: m,
        enabled,
        seats: om?.seats ?? 1,
        max_establishments: om?.max_establishments ?? null,
        max_concurrent_devices: om?.max_concurrent_devices ?? null,
      },
      { onError: () => toast.error("Erreur lors de la mise à jour du module") },
    );
  };

  const setOrgSeats = (m: string, value: string) => {
    const seats = parseInt(value, 10);
    if (isNaN(seats) || seats < 1) return;
    if (seats < allocated(m)) {
      toast.error(`Impossible : ${allocated(m)} sièges déjà alloués aux établissements`);
      return;
    }
    const om = orgMod(m);
    upsertOrg.mutate(
      {
        module: m,
        enabled: om?.enabled ?? true,
        seats,
        max_establishments: om?.max_establishments ?? null,
        max_concurrent_devices: om?.max_concurrent_devices ?? null,
      },
      { onError: () => toast.error("Erreur lors de la mise à jour du pool") },
    );
  };

  const toggleEst = (est: string, m: string, enabled: boolean) => {
    const seats = estMod(est, m)?.seats ?? 1;
    if (enabled && allocated(m) + seats > poolOf(m)) {
      toast.error(`Plafond org atteint (${poolOf(m)} sièges) — augmentez le pool ou réduisez un autre établissement`);
      return;
    }
    upsertEst.mutate(
      { establishment_id: est, module: m, enabled, seats },
      { onError: () => toast.error("Erreur lors de la mise à jour de l'établissement") },
    );
  };

  const setEstSeats = (est: string, m: string, value: string, enabled: boolean) => {
    const seats = parseInt(value, 10);
    if (isNaN(seats) || seats < 1) {
      toast.error("Minimum 1 siège");
      return;
    }
    const without = estModules
      .filter((x) => x.module === m && x.enabled && x.establishment_id !== est)
      .reduce((s, x) => s + x.seats, 0);
    if (without + seats > poolOf(m)) {
      toast.error(`Dépasse le plafond org (${poolOf(m)} sièges) — disponible : ${poolOf(m) - without}`);
      return;
    }
    upsertEst.mutate(
      { establishment_id: est, module: m, enabled, seats },
      { onError: () => toast.error("Erreur lors de la mise à jour des sièges") },
    );
  };

  if (loadingOrg || loadingEst || loadingEsts) {
    return <div className="text-muted-foreground py-8 text-center">Chargement…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Attribution des modules</h1>
        {organizationName && <p className="text-muted-foreground text-sm">Organisation : {organizationName}</p>}
        <p className="text-muted-foreground text-xs">
          Activez un module au niveau organisation (pool de sièges), puis répartissez les sièges par établissement. Le
          badge <span className="font-medium">alloué/pool</span> passe en rouge en cas de dépassement.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/40 border-b">
              <th className="p-3 text-left font-medium">Module</th>
              <th className="min-w-40 border-l p-3 text-center font-medium">Organisation (pool)</th>
              {establishments.map((e) => (
                <th key={e.id} className="min-w-32 border-l p-3 text-center font-medium">
                  {e.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULE_DEFINITIONS.map((mod) => {
              const orgEnabled = orgMod(mod.id)?.enabled ?? false;
              const alloc = allocated(mod.id);
              const pool = poolOf(mod.id);
              return (
                <tr key={mod.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{mod.label}</td>
                  <td className="border-l p-3">
                    <div className="flex items-center justify-center gap-2">
                      <Switch checked={orgEnabled} onCheckedChange={(v) => toggleOrg(mod.id, v)} disabled={isPending} />
                      {orgEnabled && (
                        <>
                          <Input
                            key={`pool-${mod.id}-${pool}`}
                            type="number"
                            min={1}
                            defaultValue={pool}
                            className="h-7 w-16 text-sm"
                            onBlur={(e) => setOrgSeats(mod.id, e.target.value)}
                            disabled={isPending}
                          />
                          <Badge variant={alloc > pool ? "destructive" : "secondary"} className="text-xs">
                            {alloc}/{pool}
                          </Badge>
                        </>
                      )}
                    </div>
                  </td>
                  {establishments.map((est) => {
                    const em = estMod(est.id, mod.id);
                    const estEnabled = em?.enabled ?? false;
                    const estSeats = em?.seats ?? 1;
                    return (
                      <td key={est.id} className="border-l p-3">
                        <div className="flex items-center justify-center gap-2">
                          <Switch
                            checked={estEnabled}
                            disabled={isPending || !orgEnabled}
                            onCheckedChange={(v) => toggleEst(est.id, mod.id, v)}
                          />
                          {estEnabled && orgEnabled && (
                            <Input
                              key={`seat-${est.id}-${mod.id}-${estSeats}`}
                              type="number"
                              min={1}
                              defaultValue={estSeats}
                              className="h-7 w-14 text-sm"
                              onBlur={(e) => setEstSeats(est.id, mod.id, e.target.value, estEnabled)}
                              disabled={isPending}
                            />
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {establishments.length === 0 && (
        <p className="text-muted-foreground text-sm">Aucun établissement actif dans cette organisation.</p>
      )}
    </div>
  );
}
