"use client";

import { useState, useEffect } from "react";

import { Plus, Building2, Edit, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOrganizationEstablishments } from "@/lib/queries/establishments";
import { useUserOrganizations } from "@/lib/queries/organizations";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { Database } from "@/lib/supabase/database.types";

type Organization = Database["public"]["Tables"]["organizations"]["Row"];
type Establishment = Database["public"]["Tables"]["establishments"]["Row"];

export default function EstablishmentsPage() {
  const { user } = useAuthStore();
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | undefined>(undefined);
  const t = useTranslations("establishments");

  // Récupérer les organisations de l'utilisateur
  const { data: organizations = [], isLoading: orgLoading } = useUserOrganizations(user?.id);

  // Récupérer les établissements de l'organisation sélectionnée
  const { data: establishments = [], isLoading: estLoading } = useOrganizationEstablishments(selectedOrganizationId);

  // Sélectionner automatiquement la première organisation
  useEffect(() => {
    if (organizations.length > 0 && !selectedOrganizationId) {
      setSelectedOrganizationId(organizations[0].id);
    }
  }, [organizations, selectedOrganizationId]);

  if (orgLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t("new_establishment")}
        </Button>
      </div>

      {/* Sélecteur d'organisation */}
      {organizations.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("organization.title")}</CardTitle>
            <CardDescription>{t("organization.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {organizations.map((org: Partial<Organization>) => (
                <Button
                  key={org.id}
                  variant={selectedOrganizationId === org.id ? "default" : "outline"}
                  onClick={() => setSelectedOrganizationId(org.id)}
                >
                  {org.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liste des établissements */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {establishments.map((establishment: Establishment) => (
          <Card key={establishment.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5" />
                  <CardTitle className="text-lg">{establishment.name}</CardTitle>
                </div>
                <div className="flex space-x-1">
                  <Button size="sm" variant="ghost">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardDescription>{establishment.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {establishment.address && <p className="text-muted-foreground text-sm">📍 {establishment.address}</p>}
                {establishment.phone && <p className="text-muted-foreground text-sm">📞 {establishment.phone}</p>}
                <div className="flex gap-2">
                  <Badge variant={establishment.is_public ? "default" : "secondary"}>
                    {establishment.is_public ? t("status.public") : t("status.private")}
                  </Badge>
                  {establishment.slug && <Badge variant="outline">/{establishment.slug}</Badge>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {establishments.length === 0 && !estLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="text-muted-foreground mb-4 h-12 w-12" />
            <h3 className="mb-2 text-lg font-semibold">{t("empty.title")}</h3>
            <p className="text-muted-foreground mb-4 text-center">{t("empty.description")}</p>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t("empty.create_first")}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
