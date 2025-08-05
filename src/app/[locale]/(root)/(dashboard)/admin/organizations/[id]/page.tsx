"use client";

import { useEffect, useState } from "react";

import { useParams } from "next/navigation";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft, Building2, Edit, Trash2, Calendar, Globe } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useRouter } from "@/i18n/navigation";
import { useEstablishmentsRealtime } from "@/lib/services/realtime/modules/establishments-realtime";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type Organization = Database["public"]["Tables"]["organizations"]["Row"];
type Establishment = Database["public"]["Tables"]["establishments"]["Row"];

export default function OrganizationManagementPage() {
  const params = useParams();
  const router = useRouter();
  const organizationId = params.id as string;

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [establishmentsError, setEstablishmentsError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  // Utiliser le hook realtime pour les établissements
  useEstablishmentsRealtime();

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
          setEstablishments(establishmentsData ?? []);
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
  }, [organizationId, supabase]);

  const handleBackToList = () => {
    router.push("/admin/organizations");
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Gestion de l&apos;organisation</CardTitle>
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
            <h1 className="text-2xl font-bold">Gestion de l&apos;organisation</h1>
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
                {organization.description ?? "Aucune description disponible"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Onglets pour différentes sections */}
      <div className="mt-6 flex gap-2">
        <Link href={`/admin/organizations/${organizationId}/users`}>
          <Button variant="outline">Utilisateurs</Button>
        </Link>
        <Link href={`/admin/organizations/${organizationId}/messages`}>
          <Button variant="outline">Messages</Button>
        </Link>
        <Link href={`/admin/organizations/${organizationId}/message1`}>
          <Button variant="outline">Message1</Button>
        </Link>
        <Link href={`/admin/organizations/${organizationId}/message2`}>
          <Button variant="outline">Message2</Button>
        </Link>
        <Link href={`/admin/organizations/${organizationId}/settings`}>
          <Button variant="outline">Paramètres</Button>
        </Link>
      </div>
    </div>
  );
}
