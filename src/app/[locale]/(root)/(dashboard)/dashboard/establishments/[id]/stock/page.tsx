import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const KpiCard = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-muted-foreground text-sm font-medium">{label}</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-muted-foreground mt-1 text-xs">{sub}</p>}
    </CardContent>
  </Card>
);

const ALERTES_STOCK = [
  { produit: "Entrecôte 300g", stock: 4, seuil: 10, unite: "pièces", niveau: "critique" },
  { produit: "Côtes du Rhône 75cl", stock: 6, seuil: 12, unite: "bouteilles", niveau: "bas" },
  { produit: "Beurre doux 500g", stock: 2, seuil: 5, unite: "paquets", niveau: "critique" },
  { produit: "Farine T55 5kg", stock: 3, seuil: 6, unite: "sacs", niveau: "bas" },
];

const COMMANDES = [
  { fournisseur: "Boucherie Centrale", montant: "380,00 €", statut: "livraison demain", date: "11 juin" },
  { fournisseur: "Cave du Sommelier", montant: "215,50 €", statut: "en cours", date: "12 juin" },
  { fournisseur: "Metro Pro", montant: "642,80 €", statut: "livré", date: "9 juin" },
];

const TOP_CONSOMMES = [
  { nom: "Entrecôte 300g", consommation: "28 pièces", valeur: "196,00 €" },
  { nom: "Pommes de terre", consommation: "15 kg", valeur: "22,50 €" },
  { nom: "Vins rouges", consommation: "22 bouteilles", valeur: "176,00 €" },
  { nom: "Crème fraîche", consommation: "8 L", valeur: "32,00 €" },
];

const niveauColor: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  critique: "destructive",
  bas: "secondary",
};

const statutColor: Record<string, "default" | "secondary" | "outline"> = {
  livré: "default",
  "en cours": "secondary",
  "livraison demain": "outline",
};

export default function StockPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Stock</h1>
        <p className="text-muted-foreground text-sm">État au mardi 10 juin 2025</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Références actives" value="148" sub="12 en rupture imminente" />
        <KpiCard label="Valeur du stock" value="8 420 €" sub="+3% vs mois dernier" />
        <KpiCard label="Alertes stock bas" value="4" sub="dont 2 critiques" />
        <KpiCard label="Commandes en cours" value="2" sub="livraison sous 48h" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Alertes stock bas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ALERTES_STOCK.map((a) => (
              <div key={a.produit} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{a.produit}</p>
                  <p className="text-muted-foreground text-xs">
                    {a.stock} {a.unite} restants · seuil {a.seuil}
                  </p>
                </div>
                <Badge variant={niveauColor[a.niveau]}>{a.niveau}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Commandes fournisseurs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {COMMANDES.map((c) => (
              <div key={c.fournisseur} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{c.fournisseur}</p>
                  <p className="text-muted-foreground text-xs">
                    {c.date} · {c.montant}
                  </p>
                </div>
                <Badge variant={statutColor[c.statut]}>{c.statut}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Produits les plus consommés (7 jours)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {TOP_CONSOMMES.map((p) => (
              <div key={p.nom} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="font-medium">{p.nom}</p>
                  <p className="text-muted-foreground text-xs">{p.consommation}</p>
                </div>
                <span className="font-semibold">{p.valeur}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
