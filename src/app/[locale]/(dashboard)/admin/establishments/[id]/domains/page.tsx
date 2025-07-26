"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, ExternalLink } from "lucide-react";

export default function DomainManagementPage() {
  const params = useParams();
  const establishmentId = params.id as string;

  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [domains, setDomains] = useState([
    // Exemple de données
    { id: "1", domain: "restaurant1.com", is_active: true },
    { id: "2", domain: "restaurant1.fr", is_active: false },
  ]);

  const handleAddDomain = async () => {
    if (!domain.trim()) {
      toast.error("Veuillez saisir un domaine");
      return;
    }

    setLoading(true);
    try {
      // TODO: Appeler l'API pour ajouter le domaine
      const newDomain = { id: Date.now().toString(), domain: domain.trim(), is_active: true };
      setDomains([...domains, newDomain]);
      setDomain("");
      toast.success("Domaine ajouté avec succès");
    } catch (error) {
      toast.error("Erreur lors de l'ajout du domaine");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDomain = async (domainId: string) => {
    try {
      // TODO: Appeler l'API pour supprimer le domaine
      setDomains(domains.filter((d) => d.id !== domainId));
      toast.success("Domaine supprimé");
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Domaines personnalisés</h1>
        <p className="text-muted-foreground">Gérez les domaines personnalisés pour cet établissement</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ajouter un domaine</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="exemple.fr"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAddDomain()}
            />
            <Button onClick={handleAddDomain} disabled={loading}>
              <Plus className="mr-2 h-4 w-4" />
              {loading ? "Ajout..." : "Ajouter"}
            </Button>
          </div>

          <div className="bg-muted mt-4 rounded-lg p-4">
            <h4 className="mb-2 font-medium">Instructions DNS :</h4>
            <p className="text-muted-foreground mb-2 text-sm">
              Pour chaque domaine, configurez un enregistrement CNAME :
            </p>
            <code className="bg-background block rounded p-2 text-sm">
              {domain || "exemple.fr"} → CNAME → your-vps.com
            </code>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Domaines configurés</CardTitle>
        </CardHeader>
        <CardContent>
          {domains.length === 0 ? (
            <p className="text-muted-foreground">Aucun domaine configuré</p>
          ) : (
            <div className="space-y-2">
              {domains.map((domainItem) => (
                <div key={domainItem.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <ExternalLink className="text-muted-foreground h-4 w-4" />
                    <span className="font-medium">{domainItem.domain}</span>
                    <Badge variant={domainItem.is_active ? "default" : "secondary"}>
                      {domainItem.is_active ? "Actif" : "Inactif"}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteDomain(domainItem.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
