"use client";

import { useAuthStore } from "@/lib/stores/auth-store";
import { useUserOrganizations } from "@/lib/queries/organizations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Calendar, TrendingUp } from "lucide-react";
import type { Database } from "@/lib/supabase/database.types";

type Organization = Database["public"]["Tables"]["organizations"]["Row"];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: organizations = [] } = useUserOrganizations(user?.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground">Bienvenue dans votre espace de gestion</p>
      </div>

      {/* Statistiques rapides */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organisations</CardTitle>
            <Building2 className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organizations.length}</div>
            <p className="text-muted-foreground text-xs">Organisations actives</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Établissements</CardTitle>
            <Building2 className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-muted-foreground text-xs">Établissements créés</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Réservations</CardTitle>
            <Calendar className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-muted-foreground text-xs">Réservations aujourd'hui</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenus</CardTitle>
            <TrendingUp className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€0</div>
            <p className="text-muted-foreground text-xs">Ce mois-ci</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions rapides */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Actions rapides</CardTitle>
            <CardDescription>Accédez rapidement aux fonctionnalités principales</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="hover:bg-muted flex cursor-pointer items-center space-x-2 rounded-md p-2">
              <Building2 className="h-4 w-4" />
              <span>Gérer les établissements</span>
            </div>
            <div className="hover:bg-muted flex cursor-pointer items-center space-x-2 rounded-md p-2">
              <Calendar className="h-4 w-4" />
              <span>Voir les réservations</span>
            </div>
            <div className="hover:bg-muted flex cursor-pointer items-center space-x-2 rounded-md p-2">
              <Users className="h-4 w-4" />
              <span>Gérer l'équipe</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Organisations</CardTitle>
            <CardDescription>Vos organisations et leurs informations</CardDescription>
          </CardHeader>
          <CardContent>
            {organizations.length > 0 ? (
              <div className="space-y-2">
                {organizations.map((org: Organization) => (
                  <div key={org.id} className="flex items-center justify-between rounded-md border p-2">
                    <div>
                      <p className="font-medium">{org.name}</p>
                      <p className="text-muted-foreground text-sm">{org.description}</p>
                    </div>
                    <span className="text-muted-foreground text-xs">/{org.slug}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground py-4 text-center">Aucune organisation trouvée</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
