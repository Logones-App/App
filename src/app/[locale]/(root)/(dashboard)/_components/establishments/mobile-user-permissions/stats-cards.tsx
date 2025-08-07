"use client";

import React from "react";

import { Shield, ShieldCheck, ShieldX } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatsCardsProps {
  totalPermissions: number;
  activePermissions: number;
  inactivePermissions: number;
}

export function StatsCards({ totalPermissions, activePermissions, inactivePermissions }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Permissions</CardTitle>
          <Shield className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalPermissions}</div>
          <p className="text-muted-foreground text-xs">Permissions configurées</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Permissions Actives</CardTitle>
          <ShieldCheck className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activePermissions}</div>
          <p className="text-muted-foreground text-xs">Permissions en cours</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Permissions Inactives</CardTitle>
          <ShieldX className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{inactivePermissions}</div>
          <p className="text-muted-foreground text-xs">Permissions supprimées</p>
        </CardContent>
      </Card>
    </div>
  );
}
