import { Smartphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const RECEPTIONS = [
  {
    id: 1,
    date: "22 juin",
    heure: "07:30",
    fournisseur: "Boucherie Martin",
    produit: "Viandes fraîches (bœuf, veau)",
    temperature: "2,8 °C",
    limite: "< 4 °C",
    emballage: "ok",
    statut: "accepté",
    agent: "Jean D.",
    commentaire: null,
  },
  {
    id: 2,
    date: "22 juin",
    heure: "08:15",
    fournisseur: "Marée Bleue",
    produit: "Poissons & crustacés",
    temperature: "1,2 °C",
    limite: "< 2 °C",
    emballage: "ok",
    statut: "accepté",
    agent: "Jean D.",
    commentaire: null,
  },
  {
    id: 3,
    date: "21 juin",
    heure: "07:45",
    fournisseur: "Rungis Express",
    produit: "Légumes frais (tomates, salades)",
    temperature: "8,5 °C",
    limite: "< 8 °C",
    emballage: "ok",
    statut: "refusé",
    agent: "Marie D.",
    commentaire: "Température trop élevée — retour fournisseur effectué",
  },
  {
    id: 4,
    date: "21 juin",
    heure: "09:00",
    fournisseur: "Rungis Express",
    produit: "Légumes frais (2e livraison)",
    temperature: "6,1 °C",
    limite: "< 8 °C",
    emballage: "ok",
    statut: "accepté",
    agent: "Marie D.",
    commentaire: "Remplacement de la livraison refusée",
  },
  {
    id: 5,
    date: "20 juin",
    heure: "07:30",
    fournisseur: "Laiterie Régionale",
    produit: "Produits laitiers (crème, beurre, fromages)",
    temperature: "3,4 °C",
    limite: "< 4 °C",
    emballage: "ok",
    statut: "accepté",
    agent: "Sophie L.",
    commentaire: null,
  },
  {
    id: 6,
    date: "20 juin",
    heure: "10:00",
    fournisseur: "Metro",
    produit: "Épicerie sèche (conserves, pâtes)",
    temperature: "—",
    limite: "Température ambiante",
    emballage: "ok",
    statut: "accepté",
    agent: "Sophie L.",
    commentaire: null,
  },
  {
    id: 7,
    date: "19 juin",
    heure: "08:00",
    fournisseur: "Boucherie Martin",
    produit: "Volailles",
    temperature: "3,9 °C",
    limite: "< 4 °C",
    emballage: "abîmé",
    statut: "accepté avec réserve",
    agent: "Jean D.",
    commentaire: "Carton légèrement humide — produit conforme, emballage signalé au fournisseur",
  },
];

const statutBadge: Record<string, "default" | "destructive" | "secondary"> = {
  accepté: "default",
  refusé: "destructive",
  "accepté avec réserve": "secondary",
};

export default function ReceptionsPage() {
  const total = RECEPTIONS.length;
  const refuses = RECEPTIONS.filter((r) => r.statut === "refusé").length;
  const reserves = RECEPTIONS.filter((r) => r.statut === "accepté avec réserve").length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Réceptions de marchandises</h1>
          <p className="text-muted-foreground text-sm">
            {total} livraisons · {refuses} refusée{refuses > 1 ? "s" : ""} · {reserves} avec réserve
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">
          <Smartphone className="h-3.5 w-3.5" />
          Saisie réceptions via l&apos;app mobile
        </div>
      </div>

      {/* Résumé */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{total}</p>
            <p className="text-muted-foreground text-sm">Livraisons cette semaine</p>
          </CardContent>
        </Card>
        <Card className={refuses > 0 ? "border-red-200 bg-red-50" : ""}>
          <CardContent className="pt-4">
            <p className={`text-2xl font-bold ${refuses > 0 ? "text-red-600" : ""}`}>{refuses}</p>
            <p className="text-muted-foreground text-sm">
              Livraison{refuses > 1 ? "s" : ""} refusée{refuses > 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
        <Card className={reserves > 0 ? "border-amber-200 bg-amber-50" : ""}>
          <CardContent className="pt-4">
            <p className={`text-2xl font-bold ${reserves > 0 ? "text-amber-600" : ""}`}>{reserves}</p>
            <p className="text-muted-foreground text-sm">Avec réserve</p>
          </CardContent>
        </Card>
      </div>

      {/* Journal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Journal des réceptions (7 derniers jours)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {RECEPTIONS.map((r) => (
              <div key={r.id} className="py-3 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="text-muted-foreground w-20 shrink-0 text-xs">
                      <p>{r.date}</p>
                      <p className="font-mono">{r.heure}</p>
                    </div>
                    <div>
                      <p className="font-semibold">{r.fournisseur}</p>
                      <p className="text-muted-foreground text-xs">{r.produit}</p>
                      {r.commentaire && <p className="mt-1 text-xs text-amber-700 italic">{r.commentaire}</p>}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge variant={statutBadge[r.statut]}>{r.statut}</Badge>
                    <span className="font-mono text-xs font-semibold">{r.temperature}</span>
                    <span className="text-muted-foreground text-xs">{r.agent}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
