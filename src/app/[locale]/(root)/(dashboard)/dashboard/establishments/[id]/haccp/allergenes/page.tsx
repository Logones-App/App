import { Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ALLERGENES_14 = [
  { code: "GL", nom: "Gluten", detail: "Blé, seigle, orge, avoine, épeautre…" },
  { code: "CR", nom: "Crustacés", detail: "Crevettes, homard, crabe…" },
  { code: "OE", nom: "Œufs", detail: "Et produits à base d'œufs" },
  { code: "PO", nom: "Poissons", detail: "Et produits à base de poissons" },
  { code: "AR", nom: "Arachides", detail: "Et produits à base d'arachides" },
  { code: "SO", nom: "Soja", detail: "Et produits à base de soja" },
  { code: "LA", nom: "Lait", detail: "Et produits laitiers (lactose inclus)" },
  { code: "FR", nom: "Fruits à coque", detail: "Amandes, noisettes, noix, noix de cajou, pistaches…" },
  { code: "CE", nom: "Céleri", detail: "Et produits à base de céleri" },
  { code: "MO", nom: "Moutarde", detail: "Et produits à base de moutarde" },
  { code: "SE", nom: "Graines de sésame", detail: "Et produits à base de sésame" },
  { code: "SU", nom: "Anhydride sulfureux & sulfites", detail: "> 10 mg/kg ou 10 mg/l" },
  { code: "LU", nom: "Lupin", detail: "Et produits à base de lupin" },
  { code: "MO2", nom: "Mollusques", detail: "Huîtres, moules, coquilles Saint-Jacques…" },
];

type Allergene = (typeof ALLERGENES_14)[number]["code"];

const PRODUITS: {
  nom: string;
  categorie: string;
  allergenes: string[];
  traces: string[];
}[] = [
  {
    nom: "Burger Classic",
    categorie: "Plats",
    allergenes: ["GL", "LA", "OE"],
    traces: ["SO", "SE"],
  },
  {
    nom: "Salade César",
    categorie: "Entrées",
    allergenes: ["GL", "LA", "PO", "OE"],
    traces: [],
  },
  {
    nom: "Steak Frites",
    categorie: "Plats",
    allergenes: [],
    traces: ["GL", "LA"],
  },
  {
    nom: "Saumon grillé",
    categorie: "Plats",
    allergenes: ["PO"],
    traces: ["LA"],
  },
  {
    nom: "Tarte Tatin",
    categorie: "Desserts",
    allergenes: ["GL", "LA", "OE"],
    traces: ["FR"],
  },
  {
    nom: "Mousse au chocolat",
    categorie: "Desserts",
    allergenes: ["LA", "OE"],
    traces: ["FR", "GL"],
  },
  {
    nom: "Soupe à l'oignon",
    categorie: "Entrées",
    allergenes: ["GL", "LA"],
    traces: [],
  },
  {
    nom: "Risotto champignons",
    categorie: "Plats",
    allergenes: ["LA"],
    traces: ["GL"],
  },
];

const allergeneNom = Object.fromEntries(ALLERGENES_14.map((a) => [a.code, a.nom]));

const CATEGORIES = [...new Set(PRODUITS.map((p) => p.categorie))];

export default function AllergenesPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Allergènes</h1>
          <p className="text-muted-foreground text-sm">
            14 allergènes majeurs réglementaires (CE 1169/2011) · {PRODUITS.length} produits déclarés
          </p>
        </div>
      </div>

      {/* Rappel réglementaire */}
      <div className="flex gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
        <Info className="h-4 w-4 shrink-0 text-blue-600" />
        <span>
          Le règlement européen CE 1169/2011 impose la déclaration des 14 allergènes majeurs sur les menus et à
          l&apos;oral en restauration. La déclaration doit être disponible pour chaque plat servi.
        </span>
      </div>

      {/* Les 14 allergènes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Les 14 allergènes majeurs réglementaires</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {ALLERGENES_14.map((a) => (
              <div key={a.code} className="flex items-start gap-2 rounded-lg border p-2.5 text-sm">
                <Badge variant="outline" className="shrink-0 font-mono text-xs">
                  {a.code}
                </Badge>
                <div>
                  <p className="font-semibold">{a.nom}</p>
                  <p className="text-muted-foreground text-xs">{a.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tableau produits par catégorie */}
      {CATEGORIES.map((cat) => (
        <Card key={cat}>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{cat}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {PRODUITS.filter((p) => p.categorie === cat).map((p, i) => (
                <div key={i} className="py-3 text-sm">
                  <p className="mb-1.5 font-semibold">{p.nom}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {p.allergenes.length === 0 && p.traces.length === 0 && (
                      <span className="text-muted-foreground text-xs">Aucun allergène déclaré</span>
                    )}
                    {p.allergenes.map((code) => (
                      <Badge key={code} variant="destructive" className="text-xs">
                        {allergeneNom[code] ?? code}
                      </Badge>
                    ))}
                    {p.traces.map((code) => (
                      <Badge key={code} variant="secondary" className="text-xs">
                        Traces : {allergeneNom[code] ?? code}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
