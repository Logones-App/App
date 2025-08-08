"use client";

import { Smartphone, Tablet, Monitor, Wrench } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface StatsCardsProps {
  totalDevices: number;
  activeDevices: number;
  inactiveDevices: number;
  maintenanceDevices: number;
}

export function StatsCards({ totalDevices, activeDevices, inactiveDevices, maintenanceDevices }: StatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
          <Smartphone className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalDevices}</div>
          <p className="text-muted-foreground text-xs">Tous les devices</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Devices Actifs</CardTitle>
          <Tablet className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeDevices}</div>
          <p className="text-muted-foreground text-xs">En service</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Devices Inactifs</CardTitle>
          <Monitor className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{inactiveDevices}</div>
          <p className="text-muted-foreground text-xs">Hors service</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">En Maintenance</CardTitle>
          <Wrench className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{maintenanceDevices}</div>
          <p className="text-muted-foreground text-xs">En réparation</p>
        </CardContent>
      </Card>
    </div>
  );
}
