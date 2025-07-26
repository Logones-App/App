"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, ExternalLink, Trash2, Settings, Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function DomainsPage() {
  const [loading, setLoading] = useState(false);

  // Données d'exemple
  const [domains] = useState([
    {
      id: "1",
      domain: "restaurant1.com",
      establishment: "La Plank des Gones",
      organization: "Restaurant Group 1",
      is_active: true,
      created_at: "2024-01-15",
    },
    {
      id: "2",
      domain: "restaurant2.fr",
      establishment: "Le Petit Bistrot",
      organization: "Restaurant Group 2",
      is_active: false,
      created_at: "2024-01-10",
    },
  ]);

  const handleAddDomain = async () => {
    setLoading(true);
    try {
      // TODO: Implémenter l'ajout de domaine
      toast.success("Domaine ajouté avec succès");
    } catch (error) {
      toast.error("Erreur lors de l'ajout du domaine");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDomain = async (domainId: string) => {
    try {
      // TODO: Implémenter la suppression
      toast.success("Domaine supprimé");
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestion des domaines</h1>
          <p className="text-muted-foreground">Gérez les domaines personnalisés de tous les établissements</p>
        </div>
        <Button onClick={handleAddDomain} disabled={loading}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau domaine
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total domaines</CardTitle>
            <ExternalLink className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{domains.length}</div>
            <p className="text-muted-foreground text-xs">+2 ce mois</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Domaines actifs</CardTitle>
            <Settings className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{domains.filter((d) => d.is_active).length}</div>
            <p className="text-muted-foreground text-xs">
              {Math.round((domains.filter((d) => d.is_active).length / domains.length) * 100)}% du total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organisations</CardTitle>
            <Building2 className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Set(domains.map((d) => d.organization)).size}</div>
            <p className="text-muted-foreground text-xs">Organisations avec domaines</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des domaines</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domaine</TableHead>
                <TableHead>Établissement</TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date de création</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {domains.map((domain) => (
                <TableRow key={domain.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      {domain.domain}
                    </div>
                  </TableCell>
                  <TableCell>{domain.establishment}</TableCell>
                  <TableCell>{domain.organization}</TableCell>
                  <TableCell>
                    <Badge variant={domain.is_active ? "default" : "secondary"}>
                      {domain.is_active ? "Actif" : "Inactif"}
                    </Badge>
                  </TableCell>
                  <TableCell>{domain.created_at}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteDomain(domain.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
