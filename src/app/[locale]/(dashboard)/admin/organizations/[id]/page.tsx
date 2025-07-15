"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Users,
  Settings,
  Edit,
  Trash2,
  Calendar,
  MapPin,
  Mail,
  Phone,
  Globe,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Database } from "@/lib/supabase/database.types";

type Organization = Database["public"]["Tables"]["organizations"]["Row"];
type Establishment = Database["public"]["Tables"]["establishments"]["Row"];

export default function OrganizationManagementPage() {
  const params = useParams();
  const router = useRouter();
  const organizationId = params.id as string;

  const { selectedOrganization, setSelectedOrganization, clearSelectedOrganization } = useWorkspaceStore();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [establishmentsError, setEstablishmentsError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  // Charger les données de l'organisation
  useEffect(() => {
    const loadOrganizationData = async () => {
      try {
        setLoading(true);

        // Charger l'organisation
        const { data: orgData, error: orgError } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", organizationId)
          .single();

        if (orgError) {
          console.error("❌ Erreur lors du chargement de l'organisation:", orgError);
          setError("Organisation non trouvée");
          return;
        }

        setOrganization(orgData);
        setSelectedOrganization(orgData);

        // Charger les établissements de cette organisation
        console.log("🔍 Chargement des établissements pour l'organisation:", organizationId);

        // Pour system_admin, on peut voir tous les établissements de l'organisation
        // Pour org_admin, on ne voit que ceux de son organisation
        const { data: establishmentsData, error: establishmentsError } = await supabase
          .from("establishments")
          .select("*")
          .eq("organization_id", organizationId)
          .eq("deleted", false)
          .order("created_at", { ascending: false });

        console.log("📊 Résultat de la requête établissements:", {
          data: establishmentsData,
          error: establishmentsError,
          count: establishmentsData?.length || 0,
        });

        if (establishmentsError) {
          console.error("❌ Erreur lors du chargement des établissements:", establishmentsError);
          setEstablishmentsError("Impossible de charger les établissements. Vérifiez les permissions.");
          // Ne pas bloquer le chargement de l'organisation si les établissements échouent
          setEstablishments([]);
        } else {
          console.log("✅ Établissements chargés avec succès:", establishmentsData);
          setEstablishments(establishmentsData || []);
          setEstablishmentsError(null);
        }
      } catch (err) {
        console.error("❌ Erreur inattendue:", err);
        setError("Erreur lors du chargement des données");
      } finally {
        setLoading(false);
      }
    };

    if (organizationId) {
      loadOrganizationData();
    }

    // Cleanup lors du démontage
    return () => {
      clearSelectedOrganization();
    };
  }, [organizationId, supabase, setSelectedOrganization, clearSelectedOrganization]);

  const handleBackToList = () => {
    router.push("/admin/organizations");
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Gestion de l'organisation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">Chargement...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !organization) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Erreur</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-destructive text-center">{error || "Organisation non trouvée"}</div>
            <div className="mt-4 text-center">
              <Button onClick={handleBackToList} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour à la liste
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header avec navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={handleBackToList} variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Gestion de l'organisation</h1>
            <p className="text-muted-foreground">Administration de {organization.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Edit className="mr-2 h-4 w-4" />
            Modifier
          </Button>
          <Button variant="destructive" size="sm">
            <Trash2 className="mr-2 h-4 w-4" />
            Supprimer
          </Button>
        </div>
      </div>

      {/* Informations de l'organisation */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {organization.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-xl">{organization.name}</CardTitle>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant={organization.deleted ? "destructive" : "default"}>
                  {organization.deleted ? "Supprimée" : "Active"}
                </Badge>
                <span className="text-muted-foreground text-sm">Slug: {organization.slug}</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-2 font-semibold">Informations générales</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Building2 className="text-muted-foreground h-4 w-4" />
                  <span>Nom: {organization.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="text-muted-foreground h-4 w-4" />
                  <span>Slug: {organization.slug}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="text-muted-foreground h-4 w-4" />
                  <span>
                    Créée le:{" "}
                    {organization.created_at
                      ? format(new Date(organization.created_at), "dd/MM/yyyy à HH:mm", { locale: fr })
                      : "N/A"}
                  </span>
                </div>
                {organization.updated_at && organization.updated_at !== organization.created_at && (
                  <div className="flex items-center gap-2">
                    <Calendar className="text-muted-foreground h-4 w-4" />
                    <span>
                      Modifiée le: {format(new Date(organization.updated_at), "dd/MM/yyyy à HH:mm", { locale: fr })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="mb-2 font-semibold">Description</h3>
              <p className="text-muted-foreground text-sm">
                {organization.description || "Aucune description disponible"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Onglets pour différentes sections */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="establishments">Établissements</TabsTrigger>
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          <TabsTrigger value="settings">Paramètres</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Établissements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{establishments.length}</div>
                <p className="text-muted-foreground text-xs">
                  établissement{establishments.length > 1 ? "s" : ""} actif{establishments.length > 1 ? "s" : ""}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Utilisateurs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">-</div>
                <p className="text-muted-foreground text-xs">utilisateurs associés</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Statut</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant={organization.deleted ? "destructive" : "default"}>
                  {organization.deleted ? "Inactive" : "Active"}
                </Badge>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="establishments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Établissements de {organization.name}</CardTitle>
            </CardHeader>
            <CardContent>
              {establishmentsError ? (
                <div className="py-8 text-center">
                  <AlertTriangle className="text-destructive mx-auto mb-2 h-8 w-8" />
                  <p className="text-destructive mb-2 font-medium">Erreur de chargement</p>
                  <p className="text-muted-foreground mb-4 text-sm">{establishmentsError}</p>
                  <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                    Réessayer
                  </Button>
                </div>
              ) : establishments.length === 0 ? (
                <div className="text-muted-foreground py-8 text-center">
                  Aucun établissement trouvé pour cette organisation
                </div>
              ) : (
                <div className="space-y-4">
                  {establishments.map((establishment) => (
                    <div key={establishment.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>{establishment.name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{establishment.name}</div>
                          <div className="text-muted-foreground text-sm">
                            {establishment.address || "Aucune adresse"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={establishment.deleted ? "destructive" : "default"}>
                          {establishment.deleted ? "Inactif" : "Actif"}
                        </Badge>
                        <Button variant="outline" size="sm">
                          Voir
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Utilisateurs de {organization.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground py-8 text-center">Gestion des utilisateurs à implémenter</div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres de {organization.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground py-8 text-center">Paramètres de l'organisation à implémenter</div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
