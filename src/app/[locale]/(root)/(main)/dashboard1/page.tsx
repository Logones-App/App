"use client";

import { Building2, Users, Calendar, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserOrganizations } from "@/lib/queries/organizations";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { Database } from "@/lib/supabase/database.types";

type Organization = Database["public"]["Tables"]["organizations"]["Row"];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: organizations = [] } = useUserOrganizations(user?.id);
  const t = useTranslations("dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("welcome")}</p>
      </div>

      {/* Statistiques rapides */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.organizations")}</CardTitle>
            <Building2 className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organizations.length}</div>
            <p className="text-muted-foreground text-xs">{t("stats.active_organizations")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.establishments")}</CardTitle>
            <Building2 className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-muted-foreground text-xs">{t("stats.created_establishments")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.reservations")}</CardTitle>
            <Calendar className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-muted-foreground text-xs">{t("stats.today_reservations")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.revenue")}</CardTitle>
            <TrendingUp className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€0</div>
            <p className="text-muted-foreground text-xs">{t("stats.this_month")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions rapides */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("quick_actions.title")}</CardTitle>
            <CardDescription>{t("quick_actions.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="hover:bg-muted flex cursor-pointer items-center space-x-2 rounded-md p-2">
              <Building2 className="h-4 w-4" />
              <span>{t("quick_actions.manage_establishments")}</span>
            </div>
            <div className="hover:bg-muted flex cursor-pointer items-center space-x-2 rounded-md p-2">
              <Calendar className="h-4 w-4" />
              <span>{t("quick_actions.view_reservations")}</span>
            </div>
            <div className="hover:bg-muted flex cursor-pointer items-center space-x-2 rounded-md p-2">
              <Users className="h-4 w-4" />
              <span>{t("quick_actions.manage_team")}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("organizations.title")}</CardTitle>
            <CardDescription>{t("organizations.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            {organizations.length > 0 ? (
              <div className="space-y-2">
                {organizations.map((org: Partial<Organization>) => (
                  <div key={org.id} className="flex items-center justify-between rounded-md border p-2">
                    <div>
                      <p className="font-medium">{org.name || "Sans nom"}</p>
                      <p className="text-muted-foreground text-sm">{org.description || "Aucune description"}</p>
                    </div>
                    <span className="text-muted-foreground text-xs">/{org.slug || "slug"}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground py-4 text-center">{t("organizations.no_organizations")}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
