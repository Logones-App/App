"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Globe, Settings } from "lucide-react";

export default function DomainsPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleAddDomain = async () => {
    setIsLoading(true);
    try {
      // TODO: Implémenter l'ajout de domaine
      console.log("Ajout de domaine...");
    } catch (err) {
      console.error("Erreur lors de l'ajout du domaine:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeactivateDomain = async () => {
    setIsLoading(true);
    try {
      // TODO: Implémenter la désactivation
      console.log("Désactivation de domaine...");
    } catch (err) {
      console.error("Erreur lors de la désactivation:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Domaines</h1>
          <p className="text-muted-foreground">Gérez les domaines personnalisés de vos établissements</p>
        </div>
        <Button onClick={handleAddDomain} disabled={isLoading}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau domaine
        </Button>
      </div>

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
            <div className="text-2xl font-bold">3</div>
            <p className="text-muted-foreground text-xs">+1 ce mois</p>
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
            <div className="text-2xl font-bold">1</div>
            <Badge variant="secondary" className="mt-2">
              En attente
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des Domaines</CardTitle>
          <CardDescription>Tous les domaines personnalisés configurés</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <h3 className="font-semibold">la-plank-des-gones.com</h3>
                <p className="text-muted-foreground text-sm">Établissement: La Plank des Gones</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">Actif</Badge>
                <Button variant="outline" size="sm" onClick={handleDeactivateDomain} disabled={isLoading}>
                  Désactiver
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <h3 className="font-semibold">test-restaurant.logones.fr</h3>
                <p className="text-muted-foreground text-sm">Établissement: La Plank des Gones</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">Actif</Badge>
                <Button variant="outline" size="sm" onClick={handleDeactivateDomain} disabled={isLoading}>
                  Désactiver
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
