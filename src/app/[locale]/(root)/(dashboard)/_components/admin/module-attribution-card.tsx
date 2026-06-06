"use client";

import { useState } from "react";

import { ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { OrganizationModule } from "@/lib/queries/organization-modules-queries";
import type { Database } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

type Establishment = Database["public"]["Tables"]["establishments"]["Row"];
type EstablishmentModule = Database["public"]["Tables"]["establishment_modules"]["Row"];

interface ModuleAttributionCardProps {
  moduleId: string;
  moduleLabel: string;
  moduleDescription: string;
  orgModule: OrganizationModule | undefined;
  establishments: Establishment[];
  estModules: EstablishmentModule[];
  onOrgChange: (payload: {
    module: string;
    enabled: boolean;
    seats: number;
    max_establishments: number | null;
    max_concurrent_devices: number | null;
  }) => void;
  onEstChange: (payload: { establishment_id: string; module: string; enabled: boolean; seats: number }) => void;
  isPending: boolean;
}

export function ModuleAttributionCard({
  moduleId,
  moduleLabel,
  moduleDescription,
  orgModule,
  establishments,
  estModules,
  onOrgChange,
  onEstChange,
  isPending,
}: ModuleAttributionCardProps) {
  const [open, setOpen] = useState(false);

  const orgEnabled = orgModule?.enabled ?? false;
  const orgSeats = orgModule?.seats ?? 1;
  const allocatedSeats = estModules.filter((m) => m.module === moduleId && m.enabled).reduce((s, m) => s + m.seats, 0);
  const overAllocated = allocatedSeats > orgSeats;

  const handleOrgToggle = (enabled: boolean) => {
    onOrgChange({
      module: moduleId,
      enabled,
      seats: orgSeats,
      max_establishments: orgModule?.max_establishments ?? null,
      max_concurrent_devices: orgModule?.max_concurrent_devices ?? null,
    });
  };

  const handleOrgSeats = (value: string) => {
    const seats = parseInt(value, 10);
    if (isNaN(seats) || seats < 1) return;
    if (seats < allocatedSeats) {
      toast.error(`Impossible : ${allocatedSeats} sièges déjà alloués aux établissements`);
      return;
    }
    onOrgChange({
      module: moduleId,
      enabled: orgEnabled,
      seats,
      max_establishments: orgModule?.max_establishments ?? null,
      max_concurrent_devices: orgModule?.max_concurrent_devices ?? null,
    });
  };

  const handleEstToggle = (estId: string, enabled: boolean) => {
    if (enabled) {
      const current = estModules.find((m) => m.establishment_id === estId && m.module === moduleId);
      const addedSeats = current?.seats ?? 1;
      if (allocatedSeats + addedSeats > orgSeats) {
        toast.error(`Plafond org atteint (${orgSeats} sièges) — réduisez un autre établissement d'abord`);
        return;
      }
    }
    const current = estModules.find((m) => m.establishment_id === estId && m.module === moduleId);
    onEstChange({ establishment_id: estId, module: moduleId, enabled, seats: current?.seats ?? 1 });
  };

  const handleEstSeats = (estId: string, value: string, currentEnabled: boolean) => {
    const seats = parseInt(value, 10);
    if (isNaN(seats) || seats < 1) {
      toast.error("Minimum 1 siège");
      return;
    }
    const allocatedWithout = estModules
      .filter((m) => m.module === moduleId && m.enabled && m.establishment_id !== estId)
      .reduce((s, m) => s + m.seats, 0);
    if (allocatedWithout + seats > orgSeats) {
      toast.error(`Dépasse le plafond org (${orgSeats} sièges) — disponible : ${orgSeats - allocatedWithout}`);
      return;
    }
    onEstChange({ establishment_id: estId, module: moduleId, enabled: currentEnabled, seats });
  };

  return (
    <div className="rounded-lg border">
      <div className="flex items-center gap-3 p-4">
        <Switch checked={orgEnabled} onCheckedChange={handleOrgToggle} disabled={isPending} />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{moduleLabel}</p>
          <p className="text-muted-foreground text-xs">{moduleDescription}</p>
        </div>
        {orgEnabled && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">Sièges org</span>
            <Input
              type="number"
              min={1}
              defaultValue={orgSeats}
              className="h-7 w-20 text-sm"
              onBlur={(e) => handleOrgSeats(e.target.value)}
              disabled={isPending}
            />
            <Badge variant={overAllocated ? "destructive" : "secondary"} className="text-xs">
              {allocatedSeats}/{orgSeats}
            </Badge>
          </div>
        )}
        {orgEnabled && (
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setOpen((o) => !o)}>
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {orgEnabled && open && (
        <div className="border-t">
          {establishments.map((est) => {
            const em = estModules.find((m) => m.establishment_id === est.id && m.module === moduleId);
            const estEnabled = em?.enabled ?? false;
            const estSeats = em?.seats ?? 1;
            return (
              <div key={est.id} className={cn("flex items-center gap-3 px-4 py-2.5", "hover:bg-muted/30")}>
                <Switch checked={estEnabled} onCheckedChange={(v) => handleEstToggle(est.id, v)} disabled={isPending} />
                <span className="min-w-0 flex-1 truncate text-sm">{est.name}</span>
                {estEnabled && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">Sièges</span>
                    <Input
                      type="number"
                      min={1}
                      defaultValue={estSeats}
                      className="h-6 w-16 text-xs"
                      onBlur={(e) => handleEstSeats(est.id, e.target.value, estEnabled)}
                      disabled={isPending}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
