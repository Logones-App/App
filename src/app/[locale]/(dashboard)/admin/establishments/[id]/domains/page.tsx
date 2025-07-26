"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Globe } from "lucide-react";
import { DomainService } from "@/lib/services/domain-service";

export default function EstablishmentDomainsPage() {
  const params = useParams();
  const [newDomain, setNewDomain] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAddDomain = async () => {
    if (!newDomain.trim()) return;

    setIsLoading(true);
    try {
      const domainService = new DomainService();
      const result = await domainService.addCustomDomain(
        newDomain,
        params.id as string,
        "la-plank-des-gones", // TODO: Récupérer le slug depuis l'établissement
        "org-id", // TODO: Récupérer l'organization_id depuis l'établissement
      );

      if (result.error) {
        console.error("Erreur lors de l'ajout du domaine:", result.error);
      } else {
        console.log("Domaine ajouté avec succès:", result.data);
        setNewDomain("");
      }
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
          <h1 className="text-3xl font-bold">Domaines de l'Établissement</h1>
          <p className="text-muted-foreground">Gérez les domaines personnalisés pour cet établissement</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Ajouter un domaine
          </CardTitle>
          <CardDescription>Ajoutez un nouveau domaine personnalisé pour cet établissement</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="domain">Domaine</Label>
              <Input
                id="domain"
                placeholder="exemple.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddDomain} disabled={isLoading || !newDomain.trim()}>
                Ajouter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Domaines configurés
          </CardTitle>
          <CardDescription>Liste des domaines personnalisés pour cet établissement</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <h3 className="font-semibold">la-plank-des-gones.com</h3>
                <p className="text-muted-foreground text-sm">Ajouté le 15 janvier 2025</p>
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
                <p className="text-muted-foreground text-sm">Ajouté le 14 janvier 2025</p>
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
