import { Globe, Settings } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tables } from "@/lib/supabase/database.types";

type CustomDomain = Tables<"custom_domains">;

interface StatsCardsProps {
  domains: CustomDomain[] | undefined;
  isLoading: boolean;
}

export function StatsCards({ domains, isLoading }: StatsCardsProps) {
  const activeDomains = domains?.filter((d) => d.is_active).length ?? 0;
  const totalDomains = domains?.length ?? 0;

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Domaines actifs
          </CardTitle>
          <CardDescription>Nombre total de domaines personnalisés</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <>
              <div className="text-2xl font-bold">{activeDomains}</div>
              <p className="text-muted-foreground text-xs">sur {totalDomains} total</p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuration DNS
          </CardTitle>
          <CardDescription>Domaines en attente de configuration</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <>
              <div className="text-2xl font-bold">0</div>
              <Badge variant="secondary" className="mt-2">
                Tous configurés
              </Badge>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
