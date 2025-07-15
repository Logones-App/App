"use client";

import { Building, Plus, Users, Calendar, Bell, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRealtimeNotifications, useRealtimeUserActions } from "@/hooks/use-realtime";

export function OrganizationsHeader() {
  const { sendNotification } = useRealtimeNotifications();
  const { sendUserAction } = useRealtimeUserActions();

  const handleTestNotification = async () => {
    await sendNotification("Test Notification", "Ceci est une notification de test du système realtime !", {
      type: "test",
      timestamp: new Date().toISOString(),
    });
  };

  const handleTestUserAction = async () => {
    await sendUserAction("Action utilisateur test", "Un utilisateur a effectué une action de test", {
      action: "test",
      component: "organizations-header",
    });
  };

  const handleTestDataUpdate = async () => {
    // Simuler une mise à jour de données
    await sendNotification("Mise à jour des données", "Les données des organisations ont été mises à jour", {
      type: "data_update",
      table: "organizations",
      action: "refresh",
      timestamp: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-6">
      {/* Titre et actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organisations</h1>
          <p className="text-muted-foreground">Gérez les organisations et leurs utilisateurs</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleTestNotification}>
            <Bell className="mr-2 h-4 w-4" />
            Test Notification
          </Button>
          <Button variant="outline" onClick={handleTestUserAction}>
            <Activity className="mr-2 h-4 w-4" />
            Test Action
          </Button>
          <Button variant="outline" onClick={handleTestDataUpdate}>
            <Building className="mr-2 h-4 w-4" />
            Test Data Update
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle organisation
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Organisations</CardTitle>
            <Building className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-muted-foreground text-xs">+2 depuis le mois dernier</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilisateurs Actifs</CardTitle>
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-muted-foreground text-xs">+12% depuis le mois dernier</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organisations Actives</CardTitle>
            <Building className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">10</div>
            <p className="text-muted-foreground text-xs">83% du total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nouvelles ce mois</CardTitle>
            <Calendar className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-muted-foreground text-xs">+1 par rapport au mois dernier</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
