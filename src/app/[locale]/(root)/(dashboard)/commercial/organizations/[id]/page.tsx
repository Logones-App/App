"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft, Building2, ExternalLink, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/supabase/database.types";

type OrgWithEstablishments = Tables<"organizations"> & {
  establishments: Tables<"establishments">[];
};

export default function CommercialOrganizationDetailPage() {
  const params = useParams<{ locale: string; id: string }>();
  const { locale, id } = params;
  const [org, setOrg] = useState<OrgWithEstablishments | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("organizations")
        .select("*, establishments(*)")
        .eq("id", id)
        .eq("deleted", false)
        .maybeSingle();
      setOrg(data as OrgWithEstablishments | null);
      setIsLoading(false);
    }
    void load();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2">
        <p className="text-muted-foreground text-sm">Organisation introuvable</p>
        <Link href={`/${locale}/commercial`}>
          <Button variant="outline" size="sm">
            Retour
          </Button>
        </Link>
      </div>
    );
  }

  const activeEstablishments = org.establishments.filter((e) => !e.deleted);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href={`/${locale}/commercial`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">{org.name}</h1>
          <p className="text-muted-foreground text-sm">
            Client depuis {org.created_at ? format(new Date(org.created_at), "MMMM yyyy", { locale: fr }) : "—"}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Infos organisation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {org.description ? (
              <p className="text-muted-foreground">{org.description}</p>
            ) : (
              <p className="text-muted-foreground">Aucune description</p>
            )}
          </CardContent>
        </Card>

        {/* Stats rapides */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Résumé</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Établissements actifs</span>
              <span className="font-medium">{activeEstablishments.length}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Créée le</span>
              <span className="font-medium">
                {org.created_at ? format(new Date(org.created_at), "dd/MM/yyyy", { locale: fr }) : "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Lien admin */}
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Administration</CardTitle>
            <CardDescription className="text-xs">Accès complet à la gestion de l&apos;organisation</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/${locale}/admin/organizations/${org.id}/establishments`} target="_blank">
              <Button variant="outline" size="sm" className="w-full">
                <ExternalLink className="mr-2 h-4 w-4" />
                Ouvrir dans l&apos;admin
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Établissements */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Établissements ({activeEstablishments.length})</h2>
        {activeEstablishments.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aucun établissement</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeEstablishments.map((est) => (
              <Card key={est.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 shrink-0" />
                    {est.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground space-y-1 text-xs">
                  {est.address && <p>{est.address}</p>}
                  {est.phone && <p>{est.phone}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
