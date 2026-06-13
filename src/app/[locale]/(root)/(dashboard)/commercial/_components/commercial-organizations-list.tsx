"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Building2, ChevronRight, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/supabase/database.types";

type Organization = Tables<"organizations"> & {
  establishments: { id: string; name: string; deleted: boolean | null }[];
};

export function CommercialOrganizationsList() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const params = useParams<{ locale: string }>();
  const locale = params.locale ?? "fr";

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("organizations")
        .select("*, establishments(id, name, deleted)")
        .eq("deleted", false)
        .order("name");
      setOrganizations((data ?? []) as Organization[]);
      setIsLoading(false);
    }
    void load();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 text-center">
        <Building2 className="text-muted-foreground h-10 w-10" />
        <p className="text-muted-foreground text-sm">Aucune organisation assignée</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {organizations.map((org) => {
        const activeEstablishments = org.establishments.filter((e) => !e.deleted);
        return (
          <Link key={org.id} href={`/${locale}/commercial/organizations/${org.id}`}>
            <Card className="hover:border-primary/50 h-full cursor-pointer transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{org.name}</CardTitle>
                  <Badge variant="outline" className="shrink-0 text-xs">
                    Client
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  {org.created_at
                    ? `Client depuis ${format(new Date(org.created_at), "MMM yyyy", { locale: fr })}`
                    : "—"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-muted-foreground flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    {activeEstablishments.length} établissement{activeEstablishments.length !== 1 ? "s" : ""}
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
